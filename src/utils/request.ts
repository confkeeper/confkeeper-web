import { createAlova } from 'alova';
import adapterFetch from 'alova/fetch';
import ReactHook from 'alova/react';
import { getToken, removeToken } from "@/src/utils/auth";
import { Toast } from "@douyinfe/semi-ui-19";
import { APP_LOGIN_URI, NO_TOKEN_API_LIST } from "@/src/config";

const isDev = process.env.NODE_ENV === 'development';

const alovaInstance = createAlova({
    requestAdapter: adapterFetch(),
    statesHook: ReactHook,
    // 设置为null即可全局关闭全部请求缓存
    cacheFor: null,
    timeout: 30000,
    beforeRequest(method) {
        if (!NO_TOKEN_API_LIST.includes(method.url)) {
            method.config.headers.Authorization = getToken();
        }
    },
    responded: {
        onSuccess: async (response, method) => {
            if (response.status === 401) {
                // 401 未授权，跳转登录页
                Toast.error('登录已过期，请重新登录');
                removeToken();
                window.location.href = APP_LOGIN_URI;
            }
            const json = await response.json();
            if (isDev && response.status === 200) console.log(json);
            return json;
        },
        onError: (err, method) => {
            return err.json();
        },
    }
});

export const request = alovaInstance;