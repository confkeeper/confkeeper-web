import { CommonResp } from "@/src/api/common.type";

export interface AddTenantParams {
  tenant_id?: string;
  tenant_name?: string;
  tenant_desc?: string;
}

export interface AddTenantResp extends CommonResp {}

export interface DeleteTenantParams {
  tenant_id: string;
}

export interface DeleteTenantResp extends CommonResp {}

export interface ListTenantsParams {
  page?: number;
  page_size?: number;
  tenant_id?: string;
  tenant_name?: string;
  tenant_desc?: string;
}

export interface TenantItem {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_desc: string;
}

export interface ListTenantsResp extends CommonResp {
  total?: number;
  data?: TenantItem[];
}
