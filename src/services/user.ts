import { UserAPI } from '@/src/api/user';
import { Toast } from '@douyinfe/semi-ui-19';
import { setToken } from "@/src/utils/auth";
import {
    AddUserParams,
    ChangePasswdParams,
    DeleteUserParams,
    LoginParams,
    UpdateUserParams,
    UserListParams
} from "@/src/api/user/types";

/** 用户 */
export const UserService = {
    /** 生成验证码 */
    getCaptcha: async () => {
        try {
            const resp = await UserAPI.GenerateCaptcha();
            if (resp.code === 200) {
                return resp.data;
            }
            Toast.error(resp.msg || '生成验证码失败');
            return null;
        } catch (err) {
            Toast.error('网络请求异常');
            return null;
        }
    },
    /** 获取用户列表 */
    list: async (params: UserListParams) => {
        try {
            const resp = await UserAPI.List(params);
            if (resp.code === 200) {
                return {
                    data: resp.data,
                    total: resp.total,
                    page: params.page || 1
                };
            } else if (resp.code === 401) {
                return {data: [], total: 0};
            }
            Toast.error(resp.msg || '获取列表失败');
            return {data: [], total: 0};
        } catch (err) {
            Toast.error('网络请求异常');
            return {data: [], total: 0};
        }
    },
    /** 登录 */
    login: async (params: LoginParams) => {
        try {
            const resp = await UserAPI.Login(params);
            if (resp.code === 200) {
                if (resp.data?.token) {
                    setToken(resp.data.token);
                    Toast.success('登录成功');
                } else {
                    Toast.error('登录凭证缺失');
                }
            } else {
                Toast.error(resp.msg || '登录失败');
            }
        } catch (error) {
            Toast.error('登录失败，请重试');
            console.error('Login error:', error);
        }
    },

    /** 新增用户 */
    add: async (params: AddUserParams) => {
        try {
            const resp = await UserAPI.Add(params);
            if (resp.code === 200) {
                Toast.success('添加成功');
                return true;
            }
            Toast.error(resp.msg || '添加失败');
            return false;
        } catch (err) {
            Toast.error('网络请求异常');
            return false;
        }
    },

    /** 更新用户 */
    update: async (book_id: number, params: UpdateUserParams) => {
        try {
            const resp = await UserAPI.Update(book_id, params);
            if (resp.code === 200) {
                Toast.success('更新成功');
                return true;
            }
            Toast.error(resp.msg || '更新失败');
            return false;
        } catch (err) {
            Toast.error('网络请求异常');
            return false;
        }
    },

    /** 修改密码 */
    updatePassword: async (userId: string, params: ChangePasswdParams) => {
        try {
            const resp = await UserAPI.ChangePasswd(userId, params);
            if (resp.code === 200) {
                Toast.success('修改成功');
                return true;
            }
            Toast.error(resp.msg || '修改失败');
            return false;
        } catch (err) {
            Toast.error('网络请求异常');
            return false;
        }
    },

    /** 删除用户 */
    delete: async (params: DeleteUserParams) => {
        try {
            const resp = await UserAPI.Delete(params);
            if (resp.code === 200) {
                Toast.success('删除成功');
                return true;
            }
            Toast.error(resp.msg || '删除失败');
            return false;
        } catch (err) {
            Toast.error('网络请求异常');
            return false;
        }
    },

    /** 用户信息 */
    info: async (user_id: string) => {
        try {
            const resp = await UserAPI.Info(user_id);
            if (resp.code === 200) {
                return resp.data;
            }
            Toast.error(resp.msg || '获取用户信息失败');
            return "";
        } catch (err) {
            Toast.error('网络请求异常');
            return "";
        }
    }
};
