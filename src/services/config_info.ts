import {
    AddConfigInfoParams,
    BatchDeleteConfigInfoParams,
    CloneConfigParams,
    DeleteConfigInfoParams,
    GetConfigByParamsReq,
    GetConfigByParamsResp,
    GetConfigContentParams,
    GetConfigContentResp,
    GetVersionParams,
    ListConfigInfosParams,
    UpdateConfigInfoParams
} from '@/src/api/config_info/types';
import { ConfigInfoAPI } from '@/src/api/config_info';
import { Toast } from '@douyinfe/semi-ui-19';

/** 配置服务 */
export const ConfigInfoService = {
    /** 获取配置列表 */
    list: async (params: ListConfigInfosParams) => {
        try {
            const resp = await ConfigInfoAPI.List(params);
            if (resp.code === 200) {
                return {
                    data: resp.data,
                    total: resp.total,
                    page: params.page || 1
                };
            } else if (resp.code === 401) {
                Toast.error(resp.msg || '没有查看配置列表的权限');
                return {data: [], total: 0, page: params.page || 1};
            }
            Toast.error(resp.msg || '获取列表失败');
            return {data: [], total: 0, page: params.page || 1};
        } catch (err) {
            Toast.error('网络请求异常');
            return {data: [], total: 0, page: params.page || 1};
        }
    },

    /** 新增配置 */
    add: async (params: AddConfigInfoParams) => {
        try {
            const resp = await ConfigInfoAPI.Add(params);
            if (resp.code === 200) {
                Toast.success('添加成功');
                return true;
            } else if (resp.code === 401) {
                Toast.error(resp.msg || '没有添加配置的权限');
                return false;
            }
            Toast.error(resp.msg || '添加失败');
            return false;
        } catch (err) {
            Toast.error('网络请求异常');
            return false;
        }
    },

    /** 更新配置文件 */
    update: async (config_id: string, params: UpdateConfigInfoParams) => {
        try {
            const resp = await ConfigInfoAPI.Update(config_id, params);
            if (resp.code === 200) {
                return true;
            } else if (resp.code === 401) {
                Toast.error(resp.msg || '没有更新配置的权限');
                return false;
            }
            Toast.error(resp.msg || '更新配置文件失败');
            return false;
        } catch (err) {
            Toast.error('网络请求异常');
            return false;
        }
    },

    /** 删除配置 */
    delete: async (params: DeleteConfigInfoParams) => {
        try {
            const resp = await ConfigInfoAPI.Delete(params);
            if (resp.code === 200) {
                Toast.success('删除配置文件成功');
                return true;
            } else if (resp.code === 401) {
                Toast.error(resp.msg || '没有删除配置的权限');
                return false;
            }
            Toast.error(resp.msg || '删除配置文件失败');
            return false;
        } catch (err) {
            Toast.error('网络请求异常');
            return false;
        }
    },

    /** 删除配置 */
    batchDelete: async (params: BatchDeleteConfigInfoParams) => {
        try {
            const resp = await ConfigInfoAPI.BatchDelete(params);
            if (resp.code === 200) {
                Toast.success('删除配置文件成功');
                return true;
            } else if (resp.code === 401) {
                Toast.error(resp.msg || '没有删除配置的权限');
                return false;
            }
            Toast.error(resp.msg || '删除配置文件失败');
            return false;
        } catch (err) {
            Toast.error('网络请求异常');
            return false;
        }
    },

    /** 获取配置文件详情 */
    get: async (params: GetConfigContentParams): Promise<Partial<GetConfigContentResp>> => {
        try {
            const resp = await ConfigInfoAPI.Get(params);
            if (resp.code === 200) {
                if (!resp.data.content) {
                    resp.data.content = '';
                }
                return resp;
            } else if (resp.code === 401) {
                Toast.error(resp.msg || '没有查看配置的权限');
                return {} as GetConfigContentResp;
            }
            Toast.error(resp.msg || '获取配置文件失败');
            return {} as GetConfigContentResp;
        } catch (err) {
            Toast.error('网络请求异常');
            return {} as GetConfigContentResp;
        }
    },

    /** 从参数获取配置文件详情 */
    getByParams: async (params: GetConfigByParamsReq): Promise<Partial<GetConfigByParamsResp>> => {
        try {
            const resp = await ConfigInfoAPI.GetByParams(params);
            if (resp.code === 200) {
                if (!resp.data.content) {
                    resp.data.content = '';
                }
                return resp;
            }
            Toast.error(resp.msg || '获取配置文件失败');
            return {} as GetConfigContentResp;
        } catch (err) {
            Toast.error('网络请求异常');
            return {} as GetConfigContentResp;
        }
    },

    /** 获取配置所有版本 */
    get_version: async (params: GetVersionParams) => {
        try {
            const resp = await ConfigInfoAPI.GetVersion(params);
            if (resp.code === 200) {
                return {
                    data: resp.data,
                };
            }
            Toast.error(resp.msg || '获取列表失败');
            return {data: []};
        } catch (err) {
            Toast.error('网络请求异常');
            return {data: []};
        }
    },

    /** 克隆配置 */
    clone: async (params: CloneConfigParams) => {
        try {
            const resp = await ConfigInfoAPI.Clone(params);
            if (resp.code === 200) {
                return true;
            }
            Toast.error(resp.msg || '克隆配置失败');
            return false;
        } catch (err) {
            Toast.error('网络请求异常');
            return false;
        }
    },

    /** 删除旧配置 */
    cleanup: async () => {
        try {
            const resp = await ConfigInfoAPI.Cleanup();
            if (resp.code === 200) {
                Toast.success('删除旧配置成功');
                return true;
            }
            Toast.error(resp.msg || '删除旧配置失败');
            return false;
        } catch (err) {
            Toast.error('网络请求异常');
            return false;
        }
    },

    /** 获取支持语言列表 */
    get_language: async () => {
        try {
            const resp = await ConfigInfoAPI.GetLanguage();
            if (resp.code === 200) {
                return resp.data;
            }
            Toast.error(resp.msg || '获取支持语言列表失败');
            return [];
        } catch (err) {
            Toast.error('获取支持语言列表失败');
            return [];
        }
    },
};
