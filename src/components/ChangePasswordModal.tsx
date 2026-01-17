import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Modal, Form } from "@douyinfe/semi-ui-19";
import { FormApi } from "@douyinfe/semi-ui-19/lib/es/form";
import { UserService } from "@/src/services/user";
import { IconKey } from "@douyinfe/semi-icons";
import { ChangePasswdParams } from "@/src/api/user/types";

export interface ChangePasswordModalRef {
    open: (userId: string) => void;
}

interface ChangePasswordModalProps {
    onSuccess?: () => void;
}

const ChangePasswordModal = forwardRef<ChangePasswordModalRef, ChangePasswordModalProps>(
    ({onSuccess}, ref) => {
        const [visible, setVisible] = useState(false);
        const [okLoading, setOkLoading] = useState(false);
        const userIdRef = useRef<string>('');
        const formApi = useRef<FormApi>(null);

        useImperativeHandle(ref, () => ({
            open: (userId: string) => {
                userIdRef.current = userId;
                setVisible(true);
            },
        }));

        const handleSubmit = async () => {
            if (!formApi.current) return;
            const values = await formApi.current.validate();
            setOkLoading(true);
            try {
                await UserService.updatePassword(userIdRef.current, values as ChangePasswdParams);
                setVisible(false);
                onSuccess?.(); // 回调成功逻辑
            } finally {
                setOkLoading(false);
            }
        };

        return (
            <Modal
                title="修改密码"
                size="large"
                visible={visible}
                onCancel={() => setVisible(false)}
                onOk={handleSubmit}
                okButtonProps={{loading: okLoading}}
            >
                <Form
                    labelPosition="left"
                    labelAlign="left"
                    labelWidth={100}
                    getFormApi={api => formApi.current = api}
                >
                    <Form.Input
                        field="password"
                        label="新密码"
                        mode="password"
                        prefix={<IconKey/>}
                        showClear
                        rules={[
                            {required: true, message: '密码不能为空'},
                            {min: 6, message: '密码至少6位字符'}
                        ]}
                    />
                </Form>
            </Modal>
        );
    }
);

export default ChangePasswordModal;
