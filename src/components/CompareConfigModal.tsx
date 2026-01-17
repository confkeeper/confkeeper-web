import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Button, Space } from '@douyinfe/semi-ui-19';
import { TenantService } from '@/src/services/tenant';
import { ConfigInfoService } from '@/src/services/config_info';
import { FormApi } from '@douyinfe/semi-ui-19/lib/es/form';
import MonacoDiffEditor from 'react-monaco-editor/lib/diff';

interface CompareConfigModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (compareContent: string) => void;
    currentDataId: string;
    currentGroupId: string;
    currentTenantId: string;
    currentContent: string;
}

interface TenantOption {
    label: string;
    value: string;
}

const CompareConfigModal: React.FC<CompareConfigModalProps> = ({
                                                                   visible,
                                                                   onClose,
                                                                   onConfirm,
                                                                   currentDataId,
                                                                   currentGroupId,
                                                                   currentTenantId,
                                                                   currentContent
                                                               }) => {
    const formApi = useRef<FormApi>(null);
    const [loading, setLoading] = useState(false);
    const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
    const [tenantLoading, setTenantLoading] = useState(false);
    const [diffReady, setDiffReady] = useState(false);
    const [showDiff, setShowDiff] = useState(false);
    const [compareContent, setCompareContent] = useState('');

    useEffect(() => {
        if (visible) {
            loadTenants();
            // 清空之前的对比状态
            setShowDiff(false);
            setDiffReady(false);
            setCompareContent('');
            // 设置当前数据的默认值，但不自动填充tenant_id
            setTimeout(() => {
                if (formApi.current) {
                    formApi.current.setValues({
                        data_id: currentDataId,
                        group_id: currentGroupId
                        // tenant_id 不设置，让用户手动选择
                    });
                }
            }, 0);
        }
    }, [visible, currentDataId, currentGroupId, currentTenantId]);

    const loadTenants = async () => {
        const result = await TenantService.list({page: 1, page_size: 100});
        if (result && result.data) {
            const options = result.data.map((tenant: any) => ({
                label: tenant.tenant_name,
                value: tenant.tenant_id
            }));
            setTenantOptions(options);
        }
    };

    const handleSubmit = async () => {
        if (!formApi.current) return;

        const values = await formApi.current.validate();
        setLoading(true);

        try {
            // 调用接口获取要对比的配置内容
            const result = await ConfigInfoService.getByParams({
                tenant_id: values.tenant_id,
                data_id: values.data_id,
                group_id: values.group_id
            });
            let targetContent = "";
            if (result?.data?.content !== undefined) {
                targetContent = result?.data?.content;
            }
            setCompareContent(targetContent);

            // 显示对比
            setDiffReady(true);
            setShowDiff(true);
        } catch (error) {
            console.error('获取对比配置失败:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={showDiff ? "配置内容对比" : "选择对比配置"}
            visible={visible}
            onCancel={onClose}
            footer={
                showDiff ? (
                    <Space>
                        <Button theme="solid" onClick={onClose}>返回</Button>
                    </Space>
                ) : (
                    <Space>
                        <Button onClick={onClose}>取消</Button>
                        <Button theme="solid" loading={loading} onClick={handleSubmit}>
                            确认对比
                        </Button>
                    </Space>
                )
            }
            width={showDiff ? 1200 : 500}
        >
            {showDiff ? (
                (currentContent || '') === (compareContent || '') ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666', border: '1px solid #e8e8e8', borderRadius: '4px' }}>
                        配置内容没有变化
                    </div>
                ) : (
                    <div style={{ height: '60vh', border: '1px solid #e8e8e8', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: 12, color: '#666', background: '#f5f5f5', borderBottom: '1px solid #e8e8e8' }}>
                            <span>当前配置</span>
                            <span>被比较配置</span>
                        </div>
                        <div style={{flex: 1, minHeight: 0}}>
                            {diffReady && (
                                <MonacoDiffEditor
                                    original={currentContent || ''}
                                    value={compareContent || ''}
                                    language={'ini'}
                                    theme={'vs-dark'}
                                    options={{
                                        automaticLayout: true,
                                        renderSideBySide: true,
                                        readOnly: true,
                                        minimap: {enabled: false},
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )
            ) : (
                <Form layout="vertical" getFormApi={(api: any) => formApi.current = api} style={{width: '100%'}}>
                    <Form.Select
                        field="tenant_id"
                        label="命名空间"
                        placeholder="请选择命名空间"
                        optionList={tenantOptions.map(option => ({
                            ...option,
                            label: option.label,
                            value: option.value,
                            style: option.value === currentTenantId ? {
                                color: 'var(--semi-color-primary)',
                                fontWeight: 'bold'
                            } : {}
                        }))}
                        loading={tenantLoading}
                        rules={[{required: true, message: '请选择命名空间'}]}
                        style={{width: '100%'}}
                    />
                    <Form.Input
                        field="data_id"
                        label="Data Id"
                        placeholder="请输入Data Id"
                        rules={[{required: true, message: '请输入Data Id'}]}
                        style={{width: '100%'}}
                    />
                    <Form.Input
                        field="group_id"
                        label="Group Id"
                        placeholder="请输入Group Id"
                        rules={[{required: true, message: '请输入Group Id'}]}
                        style={{width: '100%'}}
                    />
                </Form>
            )}
        </Modal>
    );
};

export default CompareConfigModal;