import { AddTenantParams, DeleteTenantParams, ListTenantsParams } from '@/src/api/tenant/types';
import { TenantAPI } from '@/src/api/tenant';
import { Toast } from '@douyinfe/semi-ui-19';

/** 命名空间服务 */
export const TenantService = {
    /** 获取命名空间列表 */
    list: async (params: ListTenantsParams) => {
        try {
            const resp = await TenantAPI.List(params);
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

    /** 新增命名空间 */
    add: async (params: AddTenantParams) => {
        try {
            const resp = await TenantAPI.Add(params);
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

    /** 删除命名空间 */
    delete: async (params: DeleteTenantParams) => {
        try {
            const resp = await TenantAPI.Delete(params);
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
