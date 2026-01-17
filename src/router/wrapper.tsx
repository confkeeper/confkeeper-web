/**
 * @description 路由组件包裹页，用于重定向和鉴权等
 */
import React, { JSX } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '@/src/utils/auth';
import { APP_LOGIN_REDIRECT_URI, APP_LOGIN_URI, NO_CHECK_PATH_LIST } from "@/src/config";

interface IProps {
    component: JSX.Element;
    auth?: boolean;
}

const Wrapper = ( props: IProps ): JSX.Element => {
    const {component, auth = false} = props;
    const {pathname} = useLocation();
    const token = getToken();

    // 登录校验
    if (auth && token == null) {
        return <Navigate to={APP_LOGIN_URI}/>
    }

    // 重定向
    if (NO_CHECK_PATH_LIST.includes(pathname)) {
        return <Navigate to={APP_LOGIN_REDIRECT_URI}/>
    } else {
        return component;
    }
};

export default Wrapper;