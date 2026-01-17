import { CommonResp } from "@/src/api/common.type";

export interface AddPermissionParams {
    role: string;
    resource: string;
    action: string;
}

export interface PermissionListParams {
    page: number;
    page_size: number;
    role?: string;
}

export interface PermissionInfo {
    role: string;
    resource: string;
    action: string;
}

export interface PermissionListResp extends CommonResp {
    total?: number;
    data?: PermissionInfo[];
}

export interface DeletePermissionParams {
    role: string;
    resource: string;
    action: string;
}

export interface DeletePermissionResp extends CommonResp {}

export interface AddPermissionResp extends CommonResp {}
