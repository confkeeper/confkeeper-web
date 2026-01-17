import { request } from '@/src/utils/request';
import {
    CaptchaResp,
    LoginParams,
    LoginResp,
    UserListParams,
    UserListResp,
    DeleteUserParams,
    DeleteUserResp,
    ChangePasswdResp,
    ChangePasswdParams,
    AddUserParams,
    AddUserResp,
    UpdateUserResp,
    UpdateUserParams,
    UserInfoResp
} from './types';


/** 用户登录 */
export async function Login(params: LoginParams) {
    return request.Post<LoginResp>('/api/user/login', params);
}

/** 生成验证码 */
export async function GenerateCaptcha() {
    return request.Get<CaptchaResp>('/api/user/captcha');
}

/** 添加用户 */
export async function Add(params: AddUserParams) {
    return request.Put<AddUserResp>('/api/user/add', params);
}

/** 用户列表 */
export async function List(params: UserListParams) {
    return request.Get<UserListResp>('/api/user/list', {
        params: params
    });
}

/** 删除用户 */
export async function Delete(params: DeleteUserParams) {
    return request.Delete<DeleteUserResp>(`/api/user/delete/${params.user_id}`);
}

/** 改密码 */
export async function ChangePasswd(user_id: string, params: ChangePasswdParams) {
    return request.Post<ChangePasswdResp>(`/api/user/change_passwd/${user_id}`, params);
}

/** 更新用户 */
export async function Update(user_id: number, params: UpdateUserParams) {
    return request.Post<UpdateUserResp>(`/api/user/update/${user_id}`, params);
}

/** 用户信息 */
export async function Info(user_id: string) {
    return request.Get<UserInfoResp>(`/api/user/info/${user_id}`);
}
