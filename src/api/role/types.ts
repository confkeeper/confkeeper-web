import { CommonResp } from "@/src/api/common.type";

export interface AddRoleParams {
  role: string;
  username: string;
}

export interface RoleListParams {
  page: number;
  page_size: number;
}

export interface RoleInfo {
  username: string;
  role: string;
}

export interface RoleListResp extends CommonResp {
  total?: number;
  data?: RoleInfo[];
}

export interface DeleteRoleParams {
  role: string;
}

export interface DeleteRoleResp extends CommonResp {}

export interface AddRoleResp extends CommonResp {}
