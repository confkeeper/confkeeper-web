import { request } from '@/src/utils/request';
import {
    AddConfigInfoParams,
    AddConfigInfoResp,
    CleanupConfigResp,
    CloneConfigParams,
    CloneConfigResp,
    DeleteConfigInfoParams,
    DeleteConfigInfoResp,
    GetConfigByParamsReq,
    GetConfigByParamsResp,
    GetConfigContentParams,
    GetConfigContentResp,
    GetVersionParams,
    GetVersionResp,
    LanguageListResp,
    ListConfigInfosParams,
    ListConfigInfosResp,
    UpdateConfigInfoParams,
    UpdateConfigInfoResp,
} from './types';

/** 添加配置 */
export async function Add(params: AddConfigInfoParams) {
  return request.Put<AddConfigInfoResp>('/api/config/add', params);
}

/** 删除配置 */
export async function Delete(params: DeleteConfigInfoParams) {
  return request.Delete<DeleteConfigInfoResp>(`/api/config/delete/${params.config_id}`);
}

/** 获取配置列表 */
export async function List(params: ListConfigInfosParams) {
  return request.Get<ListConfigInfosResp>('/api/config/list', {
    params: params
  });
}

/** 更新配置文件 */
export async function Update(config_id: string, params: UpdateConfigInfoParams) {
  return request.Post<UpdateConfigInfoResp>(`/api/config/update/${config_id}`, params);
}

/** 获取配置文件详情 */
export async function Get(params: GetConfigContentParams) {
  return request.Get<GetConfigContentResp>(`/api/config/get/${params.config_id}`);
}

/** 用参数获取配置文件详情 */
export async function GetByParams(params: GetConfigByParamsReq) {
  return request.Get<GetConfigByParamsResp>(`/api/config/get`, {
    params: params
  });
}

/** 获取配置所有版本 */
export async function GetVersion(params: GetVersionParams) {
    return request.Get<GetVersionResp>(`/api/config/get_version/${params.config_id}`);
}

/** 克隆配置 */
export async function Clone(params: CloneConfigParams) {
    return request.Post<CloneConfigResp>(`/api/config/clone`, params);
}

/** 删除旧配置 */
export async function Cleanup() {
    return request.Post<CleanupConfigResp>('/api/config/cleanup');
}

/** 获取支持语言列表 */
export async function GetLanguage() {
    return request.Get<LanguageListResp>('/api/config/language_list');
}
