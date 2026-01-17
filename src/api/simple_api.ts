import { request } from "@/src/utils/request";
import { CommonResp } from "@/src/api/common.type";

interface GetServerInfoResp extends CommonResp  {
    data: {
        name: string;
        version: string;
    }
}

interface GetDemoResp extends CommonResp  {
    data: {
        is_demo: boolean;
    }
}

export async function ServerInfo() {
    return request.Get<GetServerInfoResp>(`/api/server_info`);
}

export async function GetDemo() {
    return request.Get<GetDemoResp>(`/api/is_demo`);
}
