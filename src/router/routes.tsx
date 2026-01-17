import React, { ReactElement } from 'react';
import { RouteObject } from 'react-router-dom';
import Wrapper from './wrapper';
import { IconFile, IconPriceTag, IconSetting, IconUser } from '@douyinfe/semi-icons';

import Layout from '@/src/pages/layout';
import LayoutWithTopNav from '@/src/pages/layout/layoutWithTopNav';

import Login from '@/src/pages/login';
import UserList from '@/src/pages/user';
import UserRole from '@/src/pages/role';
import UserPermission from '@/src/pages/permission';

import Tenant from '@/src/pages/tenant';
import ConfigInfo from '@/src/pages/config_info/list';
import EditContent from '@/src/pages/config_info/editContent';

import Setting from '@/src/pages/setting';

import NotFond from '@/src/pages/exception/404';

export interface IRouters {
    text: string;
    icon?: ReactElement;
    items?: IRouters[];
    itemKey: string;
}

// 路由默认打开
export const defaultOpenKeys = ['/user'];

// 左侧导航路由
export const MenuRoutes: IRouters[] = [
    {
        itemKey: '/config_info',
        icon: <IconFile/>,
        text: '配置文件管理',
    },
    {
        itemKey: '/tenant',
        icon: <IconPriceTag/>,
        text: '命名空间管理',
    },
    {
        itemKey: '/user',
        icon: <IconUser/>,
        text: '权限控制',
        items: [
            {
                itemKey: '/user/list',
                text: '用户管理',
            },
            {
                itemKey: '/user/role',
                text: '角色管理',
            },
            {
                itemKey: '/user/permission',
                text: '权限管理',
            },
        ]
    },
    {
        itemKey: '/setting',
        icon: <IconSetting/>,
        text: '设置',
    },
];

export const routes: RouteObject[] = [
    {
        path: '/',
        element: <Wrapper component={<Layout/>} auth/>,
        // 导航内的路由写在这里，同时要添加到Menu中
        children: [
            {
                path: 'config_info',
                element: <Wrapper component={<ConfigInfo/>}/>
            },
            {
                path: 'edit_content',
                element: <Wrapper component={<EditContent/>}/>
            },
            {
                path: 'tenant',
                element: <Wrapper component={<Tenant/>}/>
            },
            {
                path: 'user/list',
                element: <Wrapper component={<UserList/>}/>
            },
            {
                path: 'user/role',
                element: <Wrapper component={<UserRole/>}/>
            },
            {
                path: 'user/permission',
                element: <Wrapper component={<UserPermission/>}/>
            },
            {
                path: 'setting',
                element: <Wrapper component={<Setting/>}/>
            },
        ]
    },
    // 有顶部导航，没有侧边导航写这里
    {
        path: '/user',
        element: <LayoutWithTopNav/>,
        children: [
            {
                path: 'login',
                element: <Wrapper component={<Login/>}/>
            },
        ]
    },
    // 兜底页面，需要放在最下方
    {
        path: '*',
        element: <NotFond/>
    }
]
