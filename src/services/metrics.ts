import { MetricsAPI } from "@/src/api/metrics";

/** 监控指标服务 */
export const MetricsService = {
    /** 获取 metrics 原始文本 */
    get_metrics: async (): Promise<string> => {
        return await MetricsAPI.GetMetrics();
    },
};
