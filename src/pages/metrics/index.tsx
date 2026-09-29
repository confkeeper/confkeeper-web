import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip, Typography } from '@douyinfe/semi-ui';
import { IconHistogram } from '@douyinfe/semi-icons';
import ReactECharts from 'echarts-for-react';
import useService from '@/src/hooks/useService';
import { MetricsService } from '@/src/services/metrics';
import { serverInfoStore as useServerInfoStore } from '@/src/stores/useServerInfoStore';

const {Text, Title} = Typography;

const REFRESH_INTERVAL = 1500;
const DISPLAY_WINDOW = 5 * 60 * 1000;
const MIN_CHART_WINDOW = 30 * 1000;
const MAX_HISTORY_POINTS = Math.ceil(DISPLAY_WINDOW / REFRESH_INTERVAL) + 2;
const CHART_HEIGHT = 36;
const GAP_THRESHOLD = REFRESH_INTERVAL * 2.5;
const SUPPORTED_METRICS = new Set([
    'process_cpu_seconds_total',
    'process_resident_memory_bytes',
    'process_network_receive_bytes_total',
    'process_network_transmit_bytes_total',
    'go_goroutines',
]);
const REQUEST_TIMEOUT = REFRESH_INTERVAL * 3;

interface PrometheusSample {
    name: string;
    labels: Record<string, string>;
    value: number;
}

interface CounterSnapshot {
    timestamp: number;
    processStartedAt: number | null;
    cpuSeconds: number | null;
    receivedBytes: number | null;
    transmittedBytes: number | null;
}

interface RuntimeSnapshot {
    timestamp: number;
    cpuPercent: number | null;
    rssBytes: number | null;
    heapInUseBytes: number | null;
    stackInUseBytes: number | null;
    receivedBytesPerSecond: number | null;
    transmittedBytesPerSecond: number | null;
    goroutines: number | null;
    threads: number | null;
    maxProcs: number | null;
    processStartedAt: number | null;
    configReads: number | null;
    configChanges: number | null;
    goVersion: string | null;
}

interface HistoryPoint {
    timestamp: number;
    cpuPercent: number | null;
    rssBytes: number | null;
    goroutines: number | null;
    receivedBytesPerSecond: number | null;
    transmittedBytesPerSecond: number | null;
}

interface TileProps {
    title: string;
    label: string;
    value: React.ReactNode;
    meta?: React.ReactNode;
    children?: React.ReactNode;
    foot?: React.ReactNode;
}

interface SparklineTooltipParam {
    marker: string;
    seriesName: string;
    value: [number, number | null];
}

interface SparklineOptions {
    name: string;
    points: [number, number | null][];
    colorVariable: string;
    fallbackColor: string;
    earliestTimestamp: number;
    latestTimestamp: number;
    valueFormatter: (value: number) => string;
    max?: number;
}

type MonitorStatus = 'online' | 'connecting' | 'stale' | 'offline';

const STATUS_PILL_CLASSES: Record<MonitorStatus, string> = {
    online: 'bg-[rgba(var(--semi-green-4),0.15)] text-[rgb(var(--semi-green-5))]',
    connecting: 'bg-[rgba(var(--semi-primary-5),0.1)] text-[var(--semi-color-primary)]',
    stale: 'bg-[rgba(var(--semi-orange-4),0.14)] text-[rgb(var(--semi-orange-5))]',
    offline: 'bg-[rgba(var(--semi-red-4),0.15)] text-[rgb(var(--semi-red-5))]',
};

const STATUS_DOT_CLASSES: Record<MonitorStatus, string> = {
    online: 'bg-[rgb(var(--semi-green-5))] shadow-[0_0_0_4px_rgba(var(--semi-green-4),0.18)]',
    connecting: 'bg-[var(--semi-color-primary)]',
    stale: 'bg-[rgb(var(--semi-orange-5))]',
    offline: 'bg-[rgb(var(--semi-red-5))] shadow-[0_0_0_4px_rgba(var(--semi-red-4),0.18)]',
};

const OVERVIEW_ITEM_CLASS = 'inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-[--semi-color-text-2]';
const OVERVIEW_VALUE_CLASS = 'text-[15px] font-[650] text-[var(--semi-color-text-0)] [font-variant-numeric:tabular-nums]';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('请求超时')), ms);
        promise.then(resolve, reject).finally(() => window.clearTimeout(timer));
    });
}

function parsePrometheusText(text: string): PrometheusSample[] {
    const samples: PrometheusSample[] = [];

    for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+(\S+)(?:\s+\d+)?$/);
        if (!match) continue;

        const value = Number(match[3]);
        if (!Number.isFinite(value)) continue;

        const labels: Record<string, string> = {};
        if (match[2]) {
            const labelMatches = match[2].matchAll(/([\w_]+)\s*=\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g);
            for (const labelMatch of labelMatches) {
                labels[labelMatch[1]] = labelMatch[2]
                    .replaceAll('\\n', '\n')
                    .replaceAll('\\"', '"')
                    .replaceAll('\\\\', '\\');
            }
        }

        samples.push({name: match[1], labels, value});
    }

    return samples;
}

function metricValue(samples: PrometheusSample[], name: string): number | null {
    return samples.find((sample) => sample.name === name)?.value ?? null;
}

function metricLabel(samples: PrometheusSample[], name: string, label: string): string | null {
    return samples.find((sample) => sample.name === name)?.labels[label] ?? null;
}

function rate(current: number | null, previous: number | null, elapsedSeconds: number): number | null {
    if (current === null || previous === null || elapsedSeconds <= 0 || current < previous) return null;
    return (current - previous) / elapsedSeconds;
}

function formatBytes(bytes: number): string {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    let value = Math.max(0, bytes);
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    const digits = unitIndex === 0 || value >= 100 ? 0 : 1;
    return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function formatRate(bytesPerSecond: number): string {
    return `${formatBytes(bytesPerSecond)}/s`;
}

function formatCount(value: number | null): string {
    return value === null ? '-' : Math.round(value).toLocaleString('zh-CN');
}

function formatDuration(startTimeSeconds: number | null, now: number): string {
    if (startTimeSeconds === null) return '-';
    const seconds = Math.max(0, Math.floor(now / 1000 - startTimeSeconds));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);

    if (days > 0) return `${days} 天 ${hours} 小时`;
    if (hours > 0) return `${hours} 小时 ${minutes} 分钟`;
    if (minutes > 0) return `${minutes} 分钟`;
    return `${seconds} 秒`;
}

function formatClock(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {hour12: false});
}

function formatGoVersion(version: string | null): string {
    return version ? `Go ${version.replace(/^go/, '')}` : 'Go 运行时';
}

function errorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    return '无法获取监控指标';
}

function themeRgba(variable: string, fallback: string, alpha: number): string {
    if (typeof document === 'undefined') return `rgba(${fallback}, ${alpha})`;
    const value = getComputedStyle(document.body).getPropertyValue(variable).trim();
    return `rgba(${value.includes(',') ? value : fallback}, ${alpha})`;
}

function buildSparklineOption({
                                  name,
                                  points,
                                  colorVariable,
                                  fallbackColor,
                                  earliestTimestamp,
                                  latestTimestamp,
                                  valueFormatter,
                                  max,
                              }: SparklineOptions) {
    const lineColor = themeRgba(colorVariable, fallbackColor, 1);
    return {
        animation: false,
        grid: {left: 0, right: 0, top: 2, bottom: 0},
        tooltip: {
            trigger: 'axis' as const,
            confine: true,
            formatter: (params: SparklineTooltipParam[]) => {
                if (!params.length) return '';
                const value = params[0].value[1];
                return `${formatClock(params[0].value[0])}<br/>${name}: <b>${value === null ? '-' : valueFormatter(value)}</b>`;
            },
        },
        xAxis: {
            type: 'time' as const,
            show: false,
            min: earliestTimestamp,
            max: latestTimestamp,
        },
        yAxis: {
            type: 'value' as const,
            show: false,
            min: 0,
            ...(max === undefined ? {} : {max}),
        },
        series: [{
            name,
            type: 'line' as const,
            data: points,
            showSymbol: false,
            connectNulls: false,
            smooth: 0.25,
            lineStyle: {color: lineColor, width: 1.5},
            areaStyle: {color: themeRgba(colorVariable, fallbackColor, 0.14)},
        }],
    };
}

function Tile({title, label, value, meta, children, foot}: TileProps) {
    return (
        <div
            className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-[--semi-color-fill-2] bg-[--semi-color-bg-1] px-4 pb-3 pt-3.5 shadow-[0_1px_2px_rgba(var(--semi-grey-9),0.04),0_2px_6px_rgba(var(--semi-grey-9),0.03)]"
            role="group"
            aria-label={label}
        >
            <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="shrink-0 text-[13px] font-[650] text-[--semi-color-text-1]">{title}</span>
                {meta ? (
                    <span
                        className="inline-flex min-w-0 justify-end truncate text-xs text-[--semi-color-text-2] [font-variant-numeric:tabular-nums]">
                        {meta}
                    </span>
                ) : null}
            </div>
            <div
                className="truncate text-[22px] font-[650] leading-7 text-[--semi-color-text-0] [font-variant-numeric:tabular-nums]">
                {value}
            </div>
            <div className="relative flex min-w-0 items-center" style={{height: CHART_HEIGHT}}>
                {children}
            </div>
            {foot ? (
                <div className="truncate text-xs text-[--semi-color-text-2] [font-variant-numeric:tabular-nums]">
                    {foot}
                </div>
            ) : null}
        </div>
    );
}

function Placeholder() {
    return <span className="select-none text-[--semi-color-text-3]">-</span>;
}

const MetricsPage: React.FC = () => {
    const version = useServerInfoStore((state) => state.version);
    const [{data, loading, err}, refresh] = useService(
        () => withTimeout(MetricsService.get_metrics(), REQUEST_TIMEOUT),
        [],
    );
    const [latest, setLatest] = useState<RuntimeSnapshot | null>(null);
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const countersRef = useRef<CounterSnapshot | null>(null);
    const loadingRef = useRef(loading);

    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (document.visibilityState !== 'hidden' && !loadingRef.current) refresh();
        }, REFRESH_INTERVAL);
        return () => window.clearInterval(timer);
    }, [refresh]);

    useEffect(() => {
        if (data === undefined || loading || err) return;

        const samples = parsePrometheusText(data);
        if (!samples.some((sample) => SUPPORTED_METRICS.has(sample.name))) {
            setParseError('响应中未找到支持的 Prometheus 指标');
            return;
        }

        setParseError(null);
        const timestamp = Date.now();
        const previous = countersRef.current;
        const elapsedSeconds = previous ? (timestamp - previous.timestamp) / 1000 : 0;
        const hasGap = previous !== null && timestamp - previous.timestamp > GAP_THRESHOLD;
        const processStartedAt = metricValue(samples, 'process_start_time_seconds');
        const sameProcess = previous?.processStartedAt === null
            || processStartedAt === null
            || previous?.processStartedAt === processStartedAt;
        const cpuSeconds = metricValue(samples, 'process_cpu_seconds_total');
        const receivedBytes = metricValue(samples, 'process_network_receive_bytes_total');
        const transmittedBytes = metricValue(samples, 'process_network_transmit_bytes_total');
        const continuousProcess = sameProcess && !hasGap;
        const cpuRate = continuousProcess ? rate(cpuSeconds, previous?.cpuSeconds ?? null, elapsedSeconds) : null;

        const next: RuntimeSnapshot = {
            timestamp,
            cpuPercent: cpuRate === null ? null : cpuRate * 100,
            rssBytes: metricValue(samples, 'process_resident_memory_bytes'),
            heapInUseBytes: metricValue(samples, 'go_memstats_heap_inuse_bytes'),
            stackInUseBytes: metricValue(samples, 'go_memstats_stack_inuse_bytes'),
            receivedBytesPerSecond: continuousProcess
                ? rate(receivedBytes, previous?.receivedBytes ?? null, elapsedSeconds)
                : null,
            transmittedBytesPerSecond: continuousProcess
                ? rate(transmittedBytes, previous?.transmittedBytes ?? null, elapsedSeconds)
                : null,
            goroutines: metricValue(samples, 'go_goroutines'),
            threads: metricValue(samples, 'go_threads'),
            maxProcs: metricValue(samples, 'go_sched_gomaxprocs_threads'),
            processStartedAt,
            configReads: metricValue(samples, 'confkeeper_config_read_total'),
            configChanges: metricValue(samples, 'confkeeper_config_change_total'),
            goVersion: metricLabel(samples, 'go_info', 'version'),
        };
        const point: HistoryPoint = {
            timestamp,
            cpuPercent: next.cpuPercent,
            rssBytes: next.rssBytes,
            goroutines: next.goroutines,
            receivedBytesPerSecond: next.receivedBytesPerSecond,
            transmittedBytesPerSecond: next.transmittedBytesPerSecond,
        };

        countersRef.current = {timestamp, processStartedAt, cpuSeconds, receivedBytes, transmittedBytes};
        setLatest(next);
        setHistory((current) => {
            if (previous && !sameProcess) return [point];
            const cutoff = timestamp - DISPLAY_WINDOW;
            const gapPoint: HistoryPoint[] = hasGap ? [{
                timestamp: Math.min(timestamp - 1, previous.timestamp + REFRESH_INTERVAL),
                cpuPercent: null,
                rssBytes: null,
                goroutines: null,
                receivedBytesPerSecond: null,
                transmittedBytesPerSecond: null,
            }] : [];
            return [...current, ...gapPoint, point]
                .filter((historyPoint) => historyPoint.timestamp >= cutoff)
                .slice(-MAX_HISTORY_POINTS);
        });
    }, [data, loading, err]);

    const summary = useMemo(() => {
        let cpuTotal = 0;
        let cpuCount = 0;
        let cpuPeak = 0;
        let receivedPeak = 0;
        let transmittedPeak = 0;

        for (const point of history) {
            if (point.cpuPercent !== null) {
                cpuTotal += point.cpuPercent;
                cpuCount += 1;
                cpuPeak = Math.max(cpuPeak, point.cpuPercent);
            }
            if (point.receivedBytesPerSecond !== null) {
                receivedPeak = Math.max(receivedPeak, point.receivedBytesPerSecond);
            }
            if (point.transmittedBytesPerSecond !== null) {
                transmittedPeak = Math.max(transmittedPeak, point.transmittedBytesPerSecond);
            }
        }

        return {
            cpuAverage: cpuCount > 0 ? cpuTotal / cpuCount : 0,
            cpuPeak,
            receivedPeak,
            transmittedPeak,
        };
    }, [history]);

    const latestTimestamp = latest?.timestamp ?? Date.now();
    const earliestTimestamp = Math.max(
        latestTimestamp - DISPLAY_WINDOW,
        Math.min(history[0]?.timestamp ?? latestTimestamp, latestTimestamp - MIN_CHART_WINDOW),
    );
    const cpuPoints = useMemo(
        () => history.map((point) => [point.timestamp, point.cpuPercent] as [number, number | null]),
        [history],
    );
    const memoryPoints = useMemo(
        () => history.map((point) => [point.timestamp, point.rssBytes] as [number, number | null]),
        [history],
    );
    const goroutinePoints = useMemo(
        () => history.map((point) => [point.timestamp, point.goroutines] as [number, number | null]),
        [history],
    );
    const receivedPoints = useMemo(
        () => history.map((point) => [point.timestamp, point.receivedBytesPerSecond] as [number, number | null]),
        [history],
    );
    const transmittedPoints = useMemo(
        () => history.map((point) => [point.timestamp, point.transmittedBytesPerSecond] as [number, number | null]),
        [history],
    );

    const cpuChartOption = useMemo(() => buildSparklineOption({
        name: 'CPU',
        points: cpuPoints,
        colorVariable: '--semi-blue-5',
        fallbackColor: '0, 100, 250',
        earliestTimestamp,
        latestTimestamp,
        valueFormatter: (value) => `${value.toFixed(1)}%`,
        max: Math.max(25, summary.cpuPeak * 1.15),
    }), [cpuPoints, earliestTimestamp, latestTimestamp, summary.cpuPeak]);

    const memoryChartOption = useMemo(() => buildSparklineOption({
        name: 'RSS',
        points: memoryPoints,
        colorVariable: '--semi-green-5',
        fallbackColor: '0, 168, 112',
        earliestTimestamp,
        latestTimestamp,
        valueFormatter: formatBytes,
    }), [earliestTimestamp, latestTimestamp, memoryPoints]);

    const runtimeChartOption = useMemo(() => buildSparklineOption({
        name: '协程',
        points: goroutinePoints,
        colorVariable: '--semi-orange-5',
        fallbackColor: '245, 135, 0',
        earliestTimestamp,
        latestTimestamp,
        valueFormatter: (value) => `${Math.round(value)} 个`,
    }), [earliestTimestamp, goroutinePoints, latestTimestamp]);

    const networkChartOption = useMemo(() => ({
        animation: false,
        grid: {left: 0, right: 0, top: 2, bottom: 0},
        tooltip: {
            trigger: 'axis' as const,
            confine: true,
            formatter: (params: SparklineTooltipParam[]) => {
                if (!params.length) return '';
                const values = params
                    .map((item) => `${item.marker}${item.seriesName}: <b>${item.value[1] === null ? '-' : formatRate(item.value[1])}</b>`)
                    .join('<br/>');
                return `${formatClock(params[0].value[0])}<br/>${values}`;
            },
        },
        xAxis: {
            type: 'time' as const,
            show: false,
            min: earliestTimestamp,
            max: latestTimestamp,
        },
        yAxis: {type: 'value' as const, show: false, min: 0},
        series: [
            {
                name: '接收',
                type: 'line' as const,
                data: receivedPoints,
                showSymbol: false,
                connectNulls: false,
                smooth: 0.25,
                lineStyle: {color: themeRgba('--semi-cyan-5', '5, 164, 182', 1), width: 1.5},
                areaStyle: {color: themeRgba('--semi-cyan-5', '5, 164, 182', 0.12)},
            },
            {
                name: '发送',
                type: 'line' as const,
                data: transmittedPoints,
                showSymbol: false,
                connectNulls: false,
                smooth: 0.25,
                lineStyle: {color: themeRgba('--semi-violet-5', '114, 46, 209', 1), width: 1.5},
            },
        ],
    }), [earliestTimestamp, latestTimestamp, receivedPoints, transmittedPoints]);

    const currentError = err ? errorMessage(err) : parseError;
    const initialLoading = latest === null && currentError === null;
    const status: MonitorStatus = currentError
        ? latest ? 'stale' : 'offline'
        : initialLoading ? 'connecting' : 'online';
    const statusText = currentError
        ? latest ? '数据连接中断' : '服务未连接'
        : initialLoading ? '连接中...' : `运行中 · ${formatGoVersion(latest?.goVersion ?? null)}`;
    const hasCpuCurve = cpuPoints.filter(([, value]) => value !== null).length >= 2;
    const hasMemoryCurve = memoryPoints.filter(([, value]) => value !== null).length >= 2;
    const hasRuntimeCurve = goroutinePoints.filter(([, value]) => value !== null).length >= 2;
    const hasNetworkCurve = receivedPoints.filter(([, value]) => value !== null).length >= 2
        || transmittedPoints.filter(([, value]) => value !== null).length >= 2;

    const chartOrPlaceholder = (hasCurve: boolean, option: object) => hasCurve ? (
        <ReactECharts
            option={option}
            style={{width: '100%', height: CHART_HEIGHT}}
            notMerge
            lazyUpdate
        />
    ) : (
        <Text type="tertiary" size="small">{initialLoading ? '加载中...' : '正在积累采样...'}</Text>
    );

    return (
        <div
            className="@container w-full box-border px-9 pb-12 pt-6 max-[700px]:px-6 max-[700px]:pb-9 max-[700px]:pt-5 max-[520px]:px-4 max-[520px]:pb-7 max-[520px]:pt-4">
            <div
                className="mb-[22px] flex items-center justify-between gap-4 max-[700px]:flex-col max-[700px]:items-start">
                <div className="min-w-0">
                    <Title heading={3} className="!mb-0 !mt-0 flex items-center gap-[9px] !text-[22px] !leading-[30px]">
                        <IconHistogram className="text-[--semi-color-primary]"/>
                        服务监控
                    </Title>
                    <Text type="tertiary" size="small">ConfKeeper 进程资源与运行状态</Text>
                </div>
                <div className="inline-flex shrink-0 items-center gap-3 max-[700px]:w-full max-[700px]:justify-between">
                    <span
                        className="text-xs text-[--semi-color-text-2] [font-variant-numeric:tabular-nums]">{version}</span>
                    <span
                        className={`inline-flex max-w-full items-center gap-[7px] rounded-full px-3.5 py-[7px] text-[13px] font-semibold ${STATUS_PILL_CLASSES[status]}`}
                        role="status"
                    >
                        <span className={`size-2 shrink-0 rounded-full ${STATUS_DOT_CLASSES[status]}`}/>
                        <span className="truncate">{statusText}</span>
                    </span>
                </div>
            </div>

            <div
                className="mb-[26px] flex flex-wrap items-center gap-[22px] rounded-xl border border-[--semi-color-fill-2] bg-[--semi-color-bg-1] px-5 py-3.5 shadow-[0_1px_2px_rgba(var(--semi-grey-9),0.04),0_2px_6px_rgba(var(--semi-grey-9),0.03)] max-[520px]:gap-3.5 max-[520px]:px-4 max-[520px]:py-3"
                aria-label="服务概览"
            >
                <span className={OVERVIEW_ITEM_CLASS}>
                    <span className={`size-2 shrink-0 rounded-full ${status === 'online'
                        ? 'bg-[rgb(var(--semi-green-5))] shadow-[0_0_0_4px_rgba(var(--semi-green-4),0.18)]'
                        : 'bg-[--semi-color-text-3]'}`}
                    />
                    已运行 <b
                    className={OVERVIEW_VALUE_CLASS}>{formatDuration(latest?.processStartedAt ?? null, latest?.timestamp ?? Date.now())}</b>
                </span>
                <span className={OVERVIEW_ITEM_CLASS}><b
                    className={OVERVIEW_VALUE_CLASS}>{formatCount(latest?.goroutines ?? null)}</b> 个协程</span>
                <span className={OVERVIEW_ITEM_CLASS}><b
                    className={OVERVIEW_VALUE_CLASS}>{formatCount(latest?.threads ?? null)}</b> 个系统线程</span>
                <span className={OVERVIEW_ITEM_CLASS}>
                    RSS <b
                    className={OVERVIEW_VALUE_CLASS}>{latest?.rssBytes === null || latest?.rssBytes === undefined ? '-' : formatBytes(latest.rssBytes)}</b>
                </span>
                <span className={OVERVIEW_ITEM_CLASS}>配置读取 <b
                    className={OVERVIEW_VALUE_CLASS}>{formatCount(latest?.configReads ?? null)}</b></span>
                <span className={OVERVIEW_ITEM_CLASS}>配置变更 <b
                    className={OVERVIEW_VALUE_CLASS}>{formatCount(latest?.configChanges ?? null)}</b></span>
            </div>

            <section className="mb-7" aria-label="系统状态">
                <div
                    className="mb-3 flex items-baseline justify-between gap-3 max-[520px]:flex-col max-[520px]:items-start max-[520px]:gap-0.5">
                    <span
                        className="text-[13px] font-bold uppercase tracking-normal text-[--semi-color-text-2]">系统状态</span>
                    <span className="text-xs text-[--semi-color-text-2] [font-variant-numeric:tabular-nums]">
                        最近 5 分钟 · 每 {REFRESH_INTERVAL / 1000} 秒采样
                        {latest ? ` · ${formatClock(latest.timestamp)} 更新` : ''}
                    </span>
                </div>

                {currentError ? (
                    <div
                        className="mb-3 rounded-[10px] border border-[rgba(var(--semi-orange-4),0.32)] bg-[rgba(var(--semi-orange-4),0.12)] px-3.5 py-2.5 text-[13px] text-[rgb(var(--semi-orange-5))] [overflow-wrap:anywhere]"
                        role="alert"
                    >
                        {latest ? '连接中断，下面显示最后一次获取的数据' : '监控数据加载失败'}：{currentError}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 @min-[520px]:grid-cols-2 @min-[900px]:grid-cols-4">
                    <Tile
                        title="进程 CPU"
                        label="进程 CPU 占用"
                        meta={<Tooltip content="单个 CPU 核心满载为 100%，多核进程可能超过 100%"><span>单核 = 100%</span></Tooltip>}
                        value={latest?.cpuPercent !== null && latest?.cpuPercent !== undefined
                            ? `${latest.cpuPercent.toFixed(1)}%`
                            : <Placeholder/>}
                        foot={latest?.cpuPercent !== null && latest?.cpuPercent !== undefined
                            ? `峰值 ${summary.cpuPeak.toFixed(1)}% · 平均 ${summary.cpuAverage.toFixed(1)}%`
                            : null}
                    >
                        {chartOrPlaceholder(hasCpuCurve, cpuChartOption)}
                    </Tile>

                    <Tile
                        title="内存"
                        label="进程常驻内存"
                        meta="RSS"
                        value={latest?.rssBytes !== null && latest?.rssBytes !== undefined
                            ? formatBytes(latest.rssBytes)
                            : <Placeholder/>}
                        foot={latest?.heapInUseBytes !== null && latest?.heapInUseBytes !== undefined
                        && latest.stackInUseBytes !== null
                            ? `Go 堆 ${formatBytes(latest.heapInUseBytes)} · 栈 ${formatBytes(latest.stackInUseBytes)}`
                            : null}
                    >
                        {chartOrPlaceholder(hasMemoryCurve, memoryChartOption)}
                    </Tile>

                    <Tile
                        title="Go 运行时"
                        label="Go 运行时状态"
                        meta={formatGoVersion(latest?.goVersion ?? null)}
                        value={latest?.goroutines !== null && latest?.goroutines !== undefined
                            ? `${formatCount(latest.goroutines)} 个协程`
                            : <Placeholder/>}
                        foot={latest?.threads !== null && latest?.threads !== undefined
                            ? `${formatCount(latest.threads)} 个 OS 线程 · GOMAXPROCS ${formatCount(latest.maxProcs)}`
                            : null}
                    >
                        {chartOrPlaceholder(hasRuntimeCurve, runtimeChartOption)}
                    </Tile>

                    <Tile
                        title="进程网络"
                        label="进程网络速率"
                        meta="收发速率"
                        value={latest?.receivedBytesPerSecond !== null && latest?.receivedBytesPerSecond !== undefined
                        && latest.transmittedBytesPerSecond !== null
                            ? (
                                <span className="inline-flex max-w-full gap-2 overflow-hidden text-base">
                                    <span
                                        className="truncate text-[rgb(var(--semi-cyan-5))]">↓ {formatRate(latest.receivedBytesPerSecond)}</span>
                                    <span
                                        className="truncate text-[rgb(var(--semi-violet-5))]">↑ {formatRate(latest.transmittedBytesPerSecond)}</span>
                                </span>
                            )
                            : <Placeholder/>}
                        foot={latest?.receivedBytesPerSecond !== null && latest?.receivedBytesPerSecond !== undefined
                            ? `峰值 ↓ ${formatRate(summary.receivedPeak)} · ↑ ${formatRate(summary.transmittedPeak)}`
                            : null}
                    >
                        {chartOrPlaceholder(hasNetworkCurve, networkChartOption)}
                    </Tile>
                </div>
            </section>
        </div>
    );
};

export default MetricsPage;
