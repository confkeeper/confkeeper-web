import { request } from '@/src/utils/request';
import {
    AddPermissionParams,
    AddPermissionResp,
    DeletePermissionParams,
    DeletePermissionResp,
    PermissionListParams,
    PermissionListResp
} from './types';

/** 添加权限 */
export async function Add(params: AddPermissionParams) {
    return request.Put<AddPermissionResp>('/api/permission/add', params);
}

/** 权限列表 */
export async function List(params: PermissionListParams) {
    return request.Get<PermissionListResp>('/api/permission/list', {
        params: params
    });
}

/** 删除权限 */
export async function Delete(params: DeletePermissionParams) {
    return request.Delete<DeletePermissionResp>(`/api/permission/delete?role=${params.role}&resource=${params.resource}&action=${params.action}`);
}
