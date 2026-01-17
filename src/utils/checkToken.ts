import { jwtDecode } from 'jwt-decode';
import { getToken, removeToken } from '@/src/utils/auth';
import { APP_LOGIN_URI, CHECK_TOKEN_TIME_INTERVAL } from '@/src/config';
import { Toast } from "@douyinfe/semi-ui-19";

/**
 * 判断 token 是否过期
 */
function isTokenExpired(token: string): boolean {
    try {
        const decoded: any = jwtDecode(token);
        const now = Date.now() / 1000;
        return (decoded.exp && decoded.exp < now);
    } catch {
        return true; // 无法解析的 token 视为无效
    }
}

/**
 * 检查 token 是否有效
 * @returns {boolean} true = token 有效，false = 无效
 */
export function checkToken(): boolean {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
        return false;
    }
    return true;
}

/**
 * 启动全局 token 监控，每5秒检测一次
 */
let tokenTimer: NodeJS.Timeout | null = null;

export function startTokenWatcher() {
    if (tokenTimer) return; // 避免重复启动

    tokenTimer = setInterval(() => {
        const token = getToken();
        if (window.location.pathname !== APP_LOGIN_URI) {
            if (!token || isTokenExpired(token)) {
                removeToken();
                Toast.error('登录已过期，请重新登录');
                window.location.href = APP_LOGIN_URI;
            }
        }

    }, CHECK_TOKEN_TIME_INTERVAL);
}
