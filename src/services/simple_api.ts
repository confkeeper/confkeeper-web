import { Toast } from '@douyinfe/semi-ui';
import { GetDemo, GetServerInfoResp, ServerInfo } from "@/src/api/simple_api";
import { APP_NAME } from "@/src/config";

/** 服务信息 */
export const SimpleApiService = {
    /** 获取服务信息 */
    get_server_info: async (): Promise<Partial<GetServerInfoResp>> => {
        try {
            const resp = await ServerInfo();
            if (resp.code === 200) {
                return {
                    data: resp.data,
                };
            }
            Toast.error(resp.msg || '获取失败');
            return {
                data: {
                    name: APP_NAME,
                    version: "1.0.0",
                    ldap: false
                }
            };
        } catch (err) {
            Toast.error('网络请求异常');
            return {
                data: {
                    name: APP_NAME,
                    version: "1.0.0",
                    ldap: false
                }
            };
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
