import React, { Suspense, useEffect, useRef, useState } from "react";
import { Dropdown, Form, Layout as MainLayout, Modal, Nav, Spin } from "@douyinfe/semi-ui-19";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { defaultOpenKeys, MenuRoutes } from "@/src/router/routes";
import { OnSelectedData } from "@douyinfe/semi-ui-19/lib/es/navigation";
import { getUserid, getUsername, removeToken } from "@/src/utils/auth";
import { APP_LOGIN_REDIRECT_URI, APP_LOGIN_URI, APP_NAME } from "@/src/config";
import Footer from "@/src/pages/layout/Footer";
import ChangePasswordModal from "@/src/components/ChangePasswordModal";
import SwitchThemeButton from "@/src/components/SwitchThemeButton";
import { UserService } from "@/src/services/user";
import { FormApi } from "@douyinfe/semi-ui-19/lib/es/form";
// @ts-ignore
import logo from "@/src/images/confkeeper.png"

const {Header, Sider, Content} = MainLayout;

export default function Layout() {
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const [pathKey, setPathKey] = useState<string[]>([]);
    const changePasswordRef = useRef<{ open: (userId: string) => void }>(null);
    const [visible, setVisible] = useState(false);
    const formApi = useRef<FormApi>(null);
    const [okLoading, setOkLoading] = useState(false);
    const [modalRecord, setModalRecord] = useState<any>();

    // 显示弹窗
    const changePasswd = () => {
        const userId = getUserid()
        changePasswordRef.current?.open(userId);
    };

    const logout = () => {
        removeToken();
        navigate(APP_LOGIN_URI);
    };

    const onSelect = (data: OnSelectedData) => {
        // 设置浏览器title
        document.title = `${data.selectedItems[0].text}-${APP_NAME}`;
        setPathKey(data.selectedKeys.map(String));
        navigate(data.itemKey as string);
    };

    useEffect(() => {
        setPathKey([pathname]);
    }, [pathname]);

    const changeInfo = async () => {
        setOkLoading(true);
        try {
            const userData = await UserService.info(getUserid());
            setModalRecord(userData);
            setVisible(false);
        } finally {
            setOkLoading(false);
        }
        setVisible(true);
    }

    const handleSubmit = async () => {
        if (!formApi.current) return;
        const values = await formApi.current.validate();
        setOkLoading(true);
        try {
            await UserService.update(values.user_id, values);
            setVisible(false);
        } finally {
            setOkLoading(false);
        }
    };

    return (
        <>
            <MainLayout
                className="bg-(--semi-color-tertiary-light-default)"
                style={{height: '100vh', display: 'flex', flexDirection: 'column'}}
            >
                <Header>
                    <Nav
                        className="min-w-screen"
                        mode="horizontal"
                        header={{
                            logo: (
                                <div
                                    onClick={() => navigate(APP_LOGIN_REDIRECT_URI)}
                                    style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}}
                                >
                                    <img src={logo} alt="logo" style={{width: '32px', height: '32px'}}/>
                                </div>
                            ),
                            text: (
                                <div
                                    onClick={() => navigate(APP_LOGIN_REDIRECT_URI)}
                                    style={{cursor: 'pointer', fontWeight: 500}}
                                >
                                    {APP_NAME} 管理后台
                                </div>
                            ),
                        }}
                        footer={<>
                            <SwitchThemeButton/>
                            <Dropdown
                                position="bottomRight"
                                render={<Dropdown.Menu>
                                    <Dropdown.Item onClick={changePasswd}>修改密码</Dropdown.Item>
                                    <Dropdown.Item onClick={changeInfo}>修改信息</Dropdown.Item>
                                    <Dropdown.Item onClick={logout}>退出</Dropdown.Item>
                                </Dropdown.Menu>}
                            >
                                <p className="cursor-pointer">{getUsername()}</p>
                            </Dropdown>
                        </>}/>
                </Header>
                <MainLayout style={{flex: 1, overflow: 'hidden'}}>
                    <div className="flex flex-1" style={{minHeight: '0'}}>
                        <Sider
                            style={{
                                height: '100%',
                                overflow: 'auto',
                                position: 'sticky',
                                top: 60,
                                zIndex: 10,
                                width: '250px',
                                minWidth: '250px',
                                maxWidth: '250px'
                            }}
                        >
                            <Nav
                                defaultIsCollapsed={false}
                                mode="vertical"
                                style={{height: '100%', minHeight: 'calc(100vh - 120px)'}}
                                selectedKeys={pathKey}
                                items={MenuRoutes}
                                onSelect={(data) => onSelect(data)}
                                defaultOpenKeys={defaultOpenKeys}
                                footer={{
                                    collapseButton: true,
                                }}/>
                        </Sider>
                        <Content className="overflow-auto" style={{flex: 1, minWidth: 0}}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={location.pathname}
                                    initial={{opacity: 0, x: -50}}
                                    animate={{opacity: 1, x: 0}}
                                    transition={{duration: 0.5}}
                                >
                                    <Suspense
                                        fallback={<div className="flex items-center justify-center w-screen h-screen">
                                            <Spin/>
                                        </div>}
                                    >
                                        <Outlet/>
                                    </Suspense>
                                </motion.div>
                            </AnimatePresence>
                        </Content>
                    </div>
                </MainLayout>
                <Footer/>
            </MainLayout>
            <Modal
                title='编辑用户信息'
                size="large"
                visible={visible}
                onCancel={() => setVisible(false)}
                onOk={handleSubmit}
                okButtonProps={{loading: okLoading}}
            >
                <Form
                    labelPosition='left'
                    labelAlign='left'
                    labelWidth={100}
                    initValues={modalRecord}
                    getFormApi={api => formApi.current = api}
                >
                    <Form.Input
                        field='username'
                        label='用户名'
                        rules={[{required: true, message: '请输入用户名'}]}
                    />
                </Form>
            </Modal>
            <ChangePasswordModal ref={changePasswordRef}/>
        </>
    );
}
