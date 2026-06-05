import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Typography, Spin, Empty } from '@douyinfe/semi-ui';
import ReactECharts from 'echarts-for-react';
import { MetricsService } from '@/src/services/metrics';
import { IconHistogram } from "@douyinfe/semi-icons";

const {Title} = Typography;

interface MetricHistory {
    timestamps: number[];
    values: number[];
}

const REFRESH_INTERVAL = 1500;
const MAX_HISTORY_POINTS = 300; // 5分钟 * 60秒 = 300个点
const DISPLAY_WINDOW = 5 * 60 * 1000; // 只显示最近5分钟

function formatBytes(bytes: number): string {
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatTime(ts: number): string {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function parsePrometheusText(text: string): Array<{ name: string; labels: Record<string, string>; value: number }> {
    const lines = text.split('\n');
    const samples: Array<{ name: string; labels: Record<string, string>; value: number }> = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^(\w+)(?:\{([^}]*)\})?\s+([\d.eE+-]+|NaN|\+Inf|-Inf)$/);
        if (match) {
            const name = match[1];
            const labelsStr = match[2];
            const valueStr = match[3];

            const labels: Record<string, string> = {__name__: name};
            if (labelsStr) {
                const matches = labelsStr.matchAll(/([\w_]+)\s*=\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g);
                for (const m of matches) {
                    labels[m[1]] = m[2];
                }
            }

            let value = 0;
            if (valueStr !== 'NaN' && valueStr !== '+Inf' && valueStr !== '-Inf') {
                value = parseFloat(valueStr);
            }

            samples.push({name, labels, value});
        }
    }

    return samples;
}

function getMetricKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
        .filter(([k]) => k !== '__name__')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
}

const CPU_METRICS = ['process_cpu_seconds_total'];
const MEM_METRICS = ['process_resident_memory_bytes', 'go_memstats_alloc_bytes', 'go_memstats_heap_inuse_bytes', 'go_memstats_stack_inuse_bytes'];

const MEM_DISPLAY_NAMES: Record<string, string> = {
    'process_resident_memory_bytes': 'RSS内存',
    'go_memstats_alloc_bytes': '已分配',
    'go_memstats_heap_inuse_bytes': '堆内存',
    'go_memstats_stack_inuse_bytes': '栈内存',
};

const MetricsPage: React.FC = () => {
    const [rawHistory, setRawHistory] = useState<Map<string, MetricHistory>>(new Map());
    const [rateHistory, setRateHistory] = useState<Map<string, MetricHistory>>(new Map());
    const [loading, setLoading] = useState(true);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const rawHistoryRef = useRef<Map<string, MetricHistory>>(new Map());
    const rateHistoryRef = useRef<Map<string, MetricHistory>>(new Map());
    const isFetchingRef = useRef(false);

    const fetchMetrics = useCallback(async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            const text = await MetricsService.get_metrics();
            if (!text) return;

            const samples = parsePrometheusText(text);
            const now = Date.now();

            const newRaw = new Map(rawHistoryRef.current);
            const newRate = new Map(rateHistoryRef.current);

            for (const sample of samples) {
                const isCpu = CPU_METRICS.includes(sample.name);
                const isMem = MEM_METRICS.includes(sample.name);
                if (!isCpu && !isMem) continue;

                const key = getMetricKey(sample.name, sample.labels);

                if (newRaw.has(key)) {
                    const prev = newRaw.get(key)!;
                    const lastTs = prev.timestamps[prev.timestamps.length - 1];
                    const lastVal = prev.values[prev.values.length - 1];
                    const newTimestamps = [...prev.timestamps, now];
                    const newValues = [...prev.values, sample.value];
                    if (newTimestamps.length > MAX_HISTORY_POINTS) {
                        newTimestamps.shift();
                        newValues.shift();
                    }
                    newRaw.set(key, {timestamps: newTimestamps, values: newValues});

                    if (isCpu && now > lastTs) {
                        const rate = (sample.value - lastVal) / ((now - lastTs) / 1000);
                        const prevRate = newRate.get(key);
                        if (prevRate) {
                            const rTs = [...prevRate.timestamps, now];
                            const rVals = [...prevRate.values, Math.max(0, rate)];
                            if (rTs.length > MAX_HISTORY_POINTS) {
                                rTs.shift();
                                rVals.shift();
                            }
                            newRate.set(key, {timestamps: rTs, values: rVals});
                        } else {
                            newRate.set(key, {timestamps: [now], values: [Math.max(0, rate)]});
                        }
                    }
                } else {
                    newRaw.set(key, {timestamps: [now], values: [sample.value]});
                }
            }

            rawHistoryRef.current = newRaw;
            rateHistoryRef.current = newRate;
            setRawHistory(new Map(newRaw));
            setRateHistory(new Map(newRate));
        } catch (err) {
            console.error("Failed to fetch metrics:", err);
        } finally {
            isFetchingRef.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
        timerRef.current = setInterval(fetchMetrics, REFRESH_INTERVAL);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [fetchMetrics]);

    const cpuChartOption = useMemo(() => {
        const series: Array<{ name: string; data: [number, number][] }> = [];
        for (const [key, hist] of rateHistory.entries()) {
            const name = key.split('{')[0];
            if (!CPU_METRICS.includes(name)) continue;
            series.push({
                name: 'CPU',
                data: hist.timestamps.map((t, i) => [t, hist.values[i] * 100]),
            });
        }

        return {
            title: {text: 'CPU 使用率', left: 'center', textStyle: {fontSize: 14}},
            tooltip: {
                trigger: 'axis' as const,
                formatter: (params: Array<{ value: [number, number] }>) => {
                    if (!params?.length) return '';
                    return `${formatTime(params[0].value[0])}<br/>CPU: <b>${params[0].value[1].toFixed(2)}%</b>`;
                },
            },
            grid: {left: 50, right: 10, top: 35, bottom: 30},
            xAxis: {
                type: 'time' as const,
                min: Date.now() - DISPLAY_WINDOW,
                max: Date.now(),
                axisLabel: {formatter: (val: number) => formatTime(val), fontSize: 10},
                splitNumber: 4
            },
            yAxis: {
                type: 'value' as const,
                axisLabel: {fontSize: 10, formatter: (v: number) => `${v.toFixed(1)}%`},
                name: '%',
                splitNumber: 4
            },
            series: series.map(s => ({
                ...s,
                type: 'line' as const,
                smooth: true,
                symbol: 'none',
                areaStyle: {opacity: 0.15}
            })),
        };
    }, [rawHistory, rateHistory]);

    const memChartOption = useMemo(() => {
        const series: Array<{ name: string; data: [number, number][] }> = [];
        for (const [key, hist] of rawHistory.entries()) {
            const name = key.split('{')[0];
            if (!MEM_METRICS.includes(name)) continue;
            series.push({
                name: MEM_DISPLAY_NAMES[name] || name,
                data: hist.timestamps.map((t, i) => [t, hist.values[i]]),
            });
        }

        return {
            title: {text: '内存使用', left: 'center', textStyle: {fontSize: 14}},
            tooltip: {
                trigger: 'axis' as const,
                formatter: (params: Array<{ seriesName: string; value: [number, number] }>) => {
                    if (!params?.length) return '';
                    let html = `<div>${formatTime(params[0].value[0])}</div>`;
                    for (const p of params) {
                        html += `<div>${p.seriesName}: <b>${formatBytes(p.value[1])}</b></div>`;
                    }
                    return html;
                },
            },
            legend: {bottom: 0, textStyle: {fontSize: 11}, itemWidth: 14, itemHeight: 8},
            grid: {left: 60, right: 10, top: 35, bottom: 50},
            xAxis: {
                type: 'time' as const,
                min: Date.now() - DISPLAY_WINDOW,
                max: Date.now(),
                axisLabel: {formatter: (val: number) => formatTime(val), fontSize: 10},
                splitNumber: 4
            },
            yAxis: {
                type: 'value' as const,
                axisLabel: {fontSize: 10, formatter: (v: number) => formatBytes(v)},
                splitNumber: 4
            },
            series: series.map(s => ({
                ...s,
                type: 'line' as const,
                smooth: true,
                symbol: 'none',
                areaStyle: {opacity: 0.1}
            })),
        };
    }, [rawHistory]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Spin size="large" tip="加载监控数据..."/>
            </div>
        );
    }

    const hasCpuData = cpuChartOption.series.length > 0 && cpuChartOption.series.some(s => s.data.length >= 2);
    const hasMemData = memChartOption.series.length > 0 && memChartOption.series.some(s => s.data.length >= 2);

    if (!hasCpuData && !hasMemData) {
        return (
            <div className="p-6 bg-(--semi-color-bg-1) min-h-screen">
                <div className="w-[95%] mx-auto">
                    <Title heading={3} className="mb-4">服务监控</Title>
                    <Empty description="暂无监控数据"/>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-(--semi-color-bg-1) min-h-screen">
            <div className="w-[95%] mx-auto">
                <Title heading={3} className="mb-6">
                    <IconHistogram className="mr-2"/>
                    服务监控
                </Title>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                    {hasCpuData && (
                        <Card className="shadow-sm">
                            <ReactECharts option={cpuChartOption} style={{height: 280}} notMerge lazyUpdate/>
                        </Card>
                    )}
                    {hasMemData && (
                        <Card className="shadow-sm">
                            <ReactECharts option={memChartOption} style={{height: 280}} notMerge lazyUpdate/>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MetricsPage;
