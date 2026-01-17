export interface ConfigInfo {
  id: string;
  config_id: string;
  config_name: string;
  config_desc: string;
  tenant_id: string;
  data_id: string;
  group_id: string;
  type: string;
  content?: string;
  create_time?: string;
  update_time?: string;
}