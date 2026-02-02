import { CommonResp } from "@/src/api/common.type";

export interface LoginParams {
  username: string;
  password: string;
  remember_me?: boolean;
}

export interface AddUserParams {
  username: string;
  password: string;
  enable?: boolean;
}

export interface UpdateUserParams {
  username?: string;
  enable?: boolean;
}

export interface LoginResp extends CommonResp {
  data?: {
    token: string;
  };
}

export interface LogoutResp extends CommonResp {}

export interface UserListParams {
  page?: number;
  page_size?: number;
  username?: string;
}

export interface UserInfo {
  user_id: number;
  username: string;
  enable?: boolean;
}

export interface UserListResp extends CommonResp {
  total?: number;
  data?: UserInfo[];
}

export interface DeleteUserParams {
  user_id: string;
}

export interface ChangePasswdParams {
  password: string;
}

export interface DeleteUserResp extends CommonResp {}

export interface ChangePasswdResp extends CommonResp {}

export interface AddUserResp extends CommonResp {}

export interface UpdateUserResp extends CommonResp {}

export interface CaptchaResp extends CommonResp {
  data?: {
    id: string;
    base64_image: string;
  };
}

export interface LoginParams {
  username: string;
  password: string;
  remember_me?: boolean;
  captcha?: string;
  captcha_id?: string;
}

export interface UserInfoResp extends CommonResp {
  data?: {
    user_id: string;
    username: string;
    enable?: boolean;
  }
}
