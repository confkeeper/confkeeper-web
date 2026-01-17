import { authStore } from "@/src/stores/useAuthStore";

// 设置 token
export function setToken(token: string): void {
    authStore.setState({token});
}

// 获取 token 
export function getToken(): string | null {
    return authStore.getState().token;
}

// 获取 username
export function getUsername(): string {
    return parseJwt()?.username ?? '';
}

// 获取 getUserid
export function getUserid(): string {
    return parseJwt()?.userid ?? '';
}

// 删除 token
export function removeToken(): void {
    authStore.setState({token: null});
}

interface JwtPayload {
    userid: string;
    username: string;
    exp: number;
}

// 解jwt
function parseJwt(): JwtPayload {
    try {
        const token = <string>getToken()
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decodedPayload = JSON.parse(atob(base64));
        const userid = decodedPayload.userid;
        const username = decodedPayload.username;
        const exp = decodedPayload.exp;

        return {
            userid,
            username,
            exp,
        };
    } catch (error) {
        console.error('Failed to parse JWT:', error);
        return {
            userid: '',
            username: '',
            exp: 0,
        };
    }
}
