/** 获取 Prometheus metrics 文本数据 */
export async function GetMetrics(): Promise<string> {
    const response = await fetch('/api/metrics');
    if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
    }
    return response.text();
}
