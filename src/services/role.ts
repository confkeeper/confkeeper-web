import {
    AddRoleParams,
    DeleteRoleParams,
    EditRoleParams,
    RoleListParams
} from '@/src/api/role/types';
import { RoleAPI } from '@/src/api/role';
import { Toast } from '@douyinfe/semi-ui-19';

/** 角色服务 */
export const RoleService = {
    /** 获取角色列表 */
    list: async (params: RoleListParams) => {
        try {
            const resp = await RoleAPI.List(params);
            if (resp.code === 200) {
                return {
                    data: resp.data,
                    total: resp.total,
                    page: params.page || 1
                };
            } else if (resp.code === 401) {
                Toast.error(resp.msg || '没有权限');
                return {data: [], total: 0};
            }
            Toast.error(resp.msg || '获取列表失败');
            return {data: [], total: 0};
        } catch (err) {
            Toast.error('网络请求异常');
            return {data: [], total: 0};
        }
    },

    /** 新增角色 */
    add: async (params: AddRoleParams) => {
        try {
            const resp = await RoleAPI.Add(params);
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

    /** 修改角色 */
    edit: async (params: EditRoleParams) => {
        try {
            const resp = await RoleAPI.Edit(params);
            if (resp.code === 200) {
                Toast.success('编辑成功');
                return true;
            }
            Toast.error(resp.msg || '编辑失败');
            return false;
        } catch (err) {
            Toast.error('网络请求异常');
            return false;
        }
    },

    /** 删除角色 */
    delete: async (params: DeleteRoleParams) => {
        try {
            const resp = await RoleAPI.Delete(params);
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
    }
};
