import { Toast } from '@douyinfe/semi-ui-19';
import { GetDemo, ServerInfo } from "@/src/api/simple_api";

/** 服务信息 */
export const SimpleApiService = {
    /** 获取服务信息 */
    get_server_info: async () => {
        try {
            const resp = await ServerInfo();
            if (resp.code === 200) {
                return {
                    data: resp.data,
                };
            }
            Toast.error(resp.msg || '获取失败');
            return {data: {}};
        } catch (err) {
            Toast.error('网络请求异常');
            return {data: {}};
        }
    },

    /** 获取demo信息 */
    get_demo: async () => {
        try {
            const resp = await GetDemo();
            if (resp.code === 200) {
                return resp.data.is_demo;
            }
            return false;
        } catch (err) {
            return false;
        }
    },
}
