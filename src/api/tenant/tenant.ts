import { request } from '@/src/utils/request';
import { 
  AddTenantParams,
  AddTenantResp,
  DeleteTenantParams,
  DeleteTenantResp,
  ListTenantsParams,
  ListTenantsResp
} from './types';

/** 添加命名空间 */
export async function Add(params: AddTenantParams) {
  return request.Put<AddTenantResp>('/api/tenant/add', params);
}

/** 删除命名空间 */
export async function Delete(params: DeleteTenantParams) {
  return request.Delete<DeleteTenantResp>(`/api/tenant/delete/${params.tenant_id}`);
}

/** 获取命名空间列表 */
export async function List(params: ListTenantsParams) {
  return request.Get<ListTenantsResp>('/api/tenant/list', {
    params: params
  });
}
