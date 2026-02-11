import { CommonResp } from "@/src/api/common.type";

export interface AddConfigInfoParams {
  data_id?: string;
  group_id?: string;
  tenant_id?: string;
}

export interface AddConfigInfoResp extends CommonResp {}

export interface UpdateConfigInfoParams {
  data_id?: string;
  group_id?: string;
  content?: string;
  type?: string;
}

export interface UpdateConfigInfoResp extends CommonResp {}

export interface DeleteConfigInfoParams {
  config_id: string;
}

export interface BatchDeleteConfigInfoParams {
    config_ids: string[];
}

export interface DeleteConfigInfoResp extends CommonResp {}

export interface BatchDeleteConfigInfoResp extends CommonResp {}

export interface ListConfigInfosParams {
  page: number;
  page_size: number;
  tenant_id: string;
  data_id?: string;
  group_id?: string;
  type?: string;
  create_time?: string;
}

interface ConfigInfoItem {
  id: string;
  config_id: string;
  config_name: string;
  config_desc: string;
}

export interface ListConfigInfosResp extends CommonResp {
  total?: number;
  data?: ConfigInfoItem[];
}

export interface GetConfigContentParams {
  config_id: string;
}

export interface GetConfigContentResp extends CommonResp {
  data: {
    config_id: string;
    tenant_id: string;
    data_id: string;
    group_id: string;
    type: string;
    content?: string;
    create_time?: string;
  }
}

export interface GetConfigByParamsReq {
  tenant_id: string;
  data_id: string;
  group_id: string;
}

export interface GetConfigByParamsResp extends GetConfigContentResp {
    data: {
        config_id: string;
        tenant_id: string;
        data_id: string;
        group_id: string;
        type: string;
        content?: string;
    }
}

export interface GetVersionParams {
    config_id: string;
}

interface ConfigVersionItem {
    config_id: string;
    tenant_id: string;
    data_id: string;
    group_id: string;
    type: string;
    content?: string;
    version: string;
    author: string;
    create_time: string;
}

export interface GetVersionResp extends CommonResp {
    data: ConfigVersionItem[];
}

interface CloneConfigItem {
    config_id: string;
    data_id: string;
    group_id: string;
}

export interface CloneConfigParams {
    tenant_id: string;
    items: CloneConfigItem[];
}

export interface CloneConfigResp extends CommonResp {}

export interface CleanupConfigResp extends CommonResp {}

export interface LanguageListResp extends CommonResp {
    data: {
        languages: string[];
    }
}

export interface SearchConfigParams {
  keyword: string;
  tenant_id?: string;
  page?: number;
  page_size?: number;
}

export interface SearchConfigMatch {
  line_no: number;
  content: string;
}

export interface SearchConfigResultData {
  config_id: number;
  data_id: string;
  group_id: string;
  tenant_id: string;
  matches: SearchConfigMatch[];
}

export interface SearchConfigResp extends CommonResp {
  total: number;
  data: SearchConfigResultData[];
}
