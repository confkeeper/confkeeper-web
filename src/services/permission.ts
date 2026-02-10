import { AddPermissionParams, DeletePermissionParams, PermissionListParams } from '@/src/api/permission/types';
import { PermissionAPI } from '@/src/api/permission';
import { Toast } from '@douyinfe/semi-ui-19';

/** 权限服务 */
export const PermissionService = {
    /** 获取权限列表 */
    list: async (params: PermissionListParams) => {
        try {
            const resp = await PermissionAPI.List(params);
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

    /** 新增权限 */
    add: async (params: AddPermissionParams) => {
        try {
            const resp = await PermissionAPI.Add(params);
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

    /** 删除权限 */
    delete: async (params: DeletePermissionParams) => {
        try {
            const resp = await PermissionAPI.Delete(params);
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
