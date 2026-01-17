import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Button, Space, Select } from '@douyinfe/semi-ui-19';
import { ConfigInfoService } from '@/src/services/config_info';
import { FormApi } from '@douyinfe/semi-ui-19/lib/es/form';
import MonacoDiffEditor from 'react-monaco-editor/lib/diff';

interface VersionCompareModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (compareContent: string) => void;
    currentDataId: string;
    currentGroupId: string;
    currentTenantId: string;
    currentContent: string;
}

interface VersionOption {
    label: string;
    value: string;
    content: string;
    create_time: string;
}

const VersionCompareModal: React.FC<VersionCompareModalProps> = ({
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
    const [diffReady, setDiffReady] = useState(false);
    const [showDiff, setShowDiff] = useState(false);
    const [compareContent, setCompareContent] = useState('');
    const [versionOptions, setVersionOptions] = useState<VersionOption[]>([]);
    const [versionLoading, setVersionLoading] = useState(false);
    const [currentVersion, setCurrentVersion] = useState<string>('');
    const [selectedVersion, setSelectedVersion] = useState<string>('');

    useEffect(() => {
        if (visible) {
            loadVersions();
            // 清空之前的对比状态
            setShowDiff(false);
            setDiffReady(false);
            setCompareContent('');
            setSelectedVersion('');
        }
    }, [visible, currentDataId, currentGroupId, currentTenantId]);

    const loadVersions = async () => {
        setVersionLoading(true);
        try {
            // 先获取当前配置的详细信息以获取config_id
            const configResult = await ConfigInfoService.getByParams({
                tenant_id: currentTenantId,
                data_id: currentDataId,
                group_id: currentGroupId
            });
            
            if (configResult?.data?.config_id) {
                const result = await ConfigInfoService.get_version({
                    config_id: configResult.data.config_id
                });
                if (result && result.data) {
                    const options = result.data.map((version: any) => ({
                        label: `${version.version} (${new Date(version.create_time).toLocaleString()}) ${version.author?`(修改人:${version.author})`:""}`,
                        value: version.version,
                        content: version.content,
                        create_time: version.create_time
                    }));
                    setVersionOptions(options);
                    if (options.length > 0) {
                        setCurrentVersion(options[0].value);
                    } else {
                        setCurrentVersion('');
                    }
                }
            }
        } catch (error) {
            console.error('获取版本列表失败:', error);
        } finally {
            setVersionLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formApi.current) return;

        try {
            const values = await formApi.current.validate(['version']);
            setLoading(true);

            const selectedVersion = versionOptions.find(v => v.value === values.version);
            if (!selectedVersion) {
                Modal.error({
                    title: '错误',
                    content: '请选择要对比的版本。',
                });
                return;
            }

            let targetContent = "";
            if (selectedVersion.content !== undefined) {
                targetContent = selectedVersion.content;
            }
            setCompareContent(targetContent);
            setSelectedVersion(selectedVersion.value);

            // 显示对比
            setDiffReady(true);
            setShowDiff(true);
        } catch (error) {
            console.error('获取对比配置失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToForm = () => {
        setShowDiff(false);
        setDiffReady(false);
    };

    return (
        <Modal
            title={showDiff ? "配置版本对比" : "选择历史版本"}
            visible={visible}
            onCancel={onClose}
            footer={
                showDiff ? (
                    <Space>
                        <Button onClick={handleBackToForm}>返回</Button>
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
                            <span>当前版本：{currentVersion || '-'}</span>
                            <span>历史版本：{selectedVersion || '-'}</span>
                        </div>
                        <div style={{ flex: 1, minHeight: 0 }}>
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
                                        minimap: { enabled: false },
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )
            ) : (
                <Form layout="vertical" getFormApi={(api: any) => formApi.current = api} style={{width: '100%'}}>
                    <Form.Select
                        field="version"
                        label="选择版本"
                        placeholder="请选择要对比的历史版本"
                        loading={versionLoading}
                        rules={[{required: true, message: '请选择版本'}]}
                        style={{width: '100%'}}
                    >
                        {versionOptions.map(option => (
                            <Select.Option key={option.value} value={option.value}>
                                {option.label}
                            </Select.Option>
                        ))}
                    </Form.Select>
                </Form>
            )}
        </Modal>
    );
};

export default VersionCompareModal;