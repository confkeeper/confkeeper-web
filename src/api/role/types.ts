import { CommonResp } from "@/src/api/common.type";

export interface AddRoleParams {
  role: string;
  usernames: string[];
}

export interface RoleListParams {
  page: number;
  page_size: number;
}

export interface EditRoleParams {
  role: string;
  usernames: string[];
}

export interface EditRoleResp extends CommonResp {}

export interface RoleInfo {
  usernames: string[];
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
