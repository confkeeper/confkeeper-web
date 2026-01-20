import React, { useEffect, useState } from 'react';
import { Button, Form, Typography } from '@douyinfe/semi-ui-19';
import { IconKey, IconUser } from '@douyinfe/semi-icons';
import { APP_LOGIN_REDIRECT_URI, APP_NAME } from "@/src/config";
import { UserService } from "@/src/services/user";
import { useNavigate } from "react-router-dom";
import { demoStatusStore } from "@/src/stores/useDemoStatusStore";
import { checkToken } from "@/src/utils/checkToken";

const {Text} = Typography;

const Login = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = React.useState(false);
    const [captchaId, setCaptchaId] = useState<string>('');
    const [captchaImage, setCaptchaImage] = useState<string>('');
    const isDemo: boolean = demoStatusStore.getState().is_demo
    let username = '';
    let password = '';
    let remember_me = false;

    if (isDemo || process.env.NODE_ENV !== 'production') {
        username = 'admin';
        password = 'admin123456';
        remember_me = true;
    }

    // 生成验证码
    const generateCaptcha = async () => {
        const captchaData = await UserService.getCaptcha();
        if (captchaData) {
            setCaptchaId(captchaData.id);
            setCaptchaImage(captchaData.base64_image);
        }
    };

    useEffect(() => {
        // 登录页加载时检查 token
        if (checkToken()) {
            // token 有效，直接跳转主界面
            navigate(APP_LOGIN_REDIRECT_URI);
        } else {
            // 生成验证码
            generateCaptcha();
        }
    }, [navigate]);

    // 使用Form组件管理表单状态
    const handleSubmit = async (values: any) => {
        setLoading(true);
        // 添加验证码信息到登录参数
        const loginParams = {
            ...values,
            captcha_id: captchaId,
            captcha: values.captcha
        };
        await UserService.login(loginParams);
        navigate(APP_LOGIN_REDIRECT_URI);
    };

    return (
        <div
            className='flex flex-col gap-6 p-8 rounded-lg w-[600px] min-h-[500px]'
            style={{
                border: '1px solid var(--semi-color-border)',
                backgroundColor: 'var(--semi-color-bg-1)', // 自动适配深色模式
            }}
        >
            <div className="flex flex-col items-center mb-6">
                <Text className="text-3xl font-bold text-[--semi-color-primary]">欢迎登录 {APP_NAME}</Text>
                <Text className="text-sm text-[--semi-color-text-2] mt-2">请输入您的账号和密码</Text>
            </div>

            <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Form.Input
                    field="username"
                    label="账号"
                    prefix={<IconUser/>}
                    showClear
                    placeholder="请输入用户名"
                    initValue={username}
                    rules={[
                        {required: true, message: '账号不能为空'},
                        {
                            pattern: /^(?:[\w-]+@[\w-]+\.[\w-]{2,4}|[a-zA-Z0-9_-]{4,50})$/,
                            message: '请输入有效用户名'
                        }
                    ]}
                />

                <Form.Input
                    field="password"
                    label="密码"
                    mode="password"
                    prefix={<IconKey/>}
                    showClear
                    placeholder="请输入密码"
                    initValue={password}
                    rules={[
                        {required: true, message: '密码不能为空'},
                        {min: 6, message: '密码至少6位字符'}
                    ]}
                />

                <div className="flex gap-4">
                    <div className="flex-1">
                        <Form.Input
                            field="captcha"
                            label="验证码"
                            placeholder="请输入验证码"
                            rules={[
                                {required: true, message: '验证码不能为空'}
                            ]}
                            showClear
                        />
                    </div>
                    <div className="flex items-end pb-3">
                        <div 
                            style={{
                                backgroundColor: '#ffffff',
                                padding: '2px',
                                borderRadius: '4px',
                                display: 'inline-block',
                                border: '1px solid var(--semi-color-border)',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                            }}
                        >
                            <img 
                                src={captchaImage} 
                                alt="验证码" 
                                className="w-36 h-10 cursor-pointer"
                                onClick={generateCaptcha}
                                style={{ borderRadius: '2px', cursor: 'pointer' }}
                                title="点击刷新验证码"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <Form.Checkbox initValue={remember_me} field="remember_me" noLabel>记住我</Form.Checkbox>
                </div>

                {isDemo && <Text type="warning" size="small">默认账号密码为 admin/admin123456</Text>}

                <Button
                    htmlType="submit"
                    type="primary"
                    theme="solid"
                    loading={loading}
                    className="w-full h-10 rounded-lg"
                    style={{fontWeight: 600}}
                >
                    登录
                </Button>
            </Form>

        </div>
    );
};

export default Login;