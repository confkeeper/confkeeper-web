import { request } from '@/src/utils/request';
import {
    AddRoleParams,
    AddRoleResp,
    DeleteRoleParams,
    DeleteRoleResp,
    EditRoleParams,
    EditRoleResp,
    RoleListParams,
    RoleListResp
} from './types';

/** 添加角色 */
export async function Add(params: AddRoleParams) {
    return request.Put<AddRoleResp>('/api/role/add', params);
}

/** 修改角色 */
export async function Edit(params: EditRoleParams) {
    return request.Put<EditRoleResp>('/api/role/edit', params);
}

/** 角色列表 */
export async function List(params: RoleListParams) {
    return request.Get<RoleListResp>('/api/role/list', {
        params: params
    });
}

/** 删除角色 */
export async function Delete(params: DeleteRoleParams) {
    return request.Delete<DeleteRoleResp>(`/api/role/delete/${params.role}`);
}
