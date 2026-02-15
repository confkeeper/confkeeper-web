import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ConfigInfoService } from "@/src/services/config_info";
import MonacoEditor from "react-monaco-editor/lib/editor";
import { Button, Form, HotKeys, Radio, Space, Typography, Modal } from "@douyinfe/semi-ui-19";
import { IconArrowLeft, IconFullScreenStroked, IconShrinkScreenStroked } from "@douyinfe/semi-icons";
import { FormApi } from "@douyinfe/semi-ui-19/lib/es/form";
import { languageListStore } from "@/src/stores/useLanguageListStore";
import DiffModal from "@/src/components/DiffModal";
import CompareConfigModal from "@/src/components/CompareConfigModal";
import VersionCompareModal from "@/src/components/VersionCompareModal";
import ConvertModal from "@/src/components/ConvertModal";

const EditConfigContextPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tenant_id = searchParams.get('tenant_id');
    const data_id = searchParams.get('data_id');
    const group_id = searchParams.get('group_id');
    const [configContent, setConfigContent] = useState({
        config_id: "",
        content: "",
        data_id: "",
        group_id: "",
        tenant_id: "",
        type: ""
    } as any);
    const [editorContent, setEditorContent] = useState("");
    const [config_id, setConfigId] = useState('');
    const [loading, setLoading] = useState(true);
    const formApi = useRef<FormApi>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (tenant_id && data_id && group_id) {
            setLoading(true);
            ConfigInfoService.getByParams({tenant_id, data_id, group_id}).then((res) => {
                const data = res.data || {content: '', data_id: '', group_id: '', tenant_id: '', type: ''};
                setConfigContent({...data, content: data.content || ''});
                setEditorContent(data.content || "");
                setConfigId('config_id' in data ? data.config_id : '');
                if (formApi.current) {
                    formApi.current.setValues(data);
                }
            }).finally(() => {
                setLoading(false);
            });
        }
    }, [config_id, tenant_id, data_id, group_id]);

    const [diffModalVisible, setDiffModalVisible] = useState(false);
    const [compareModalVisible, setCompareModalVisible] = useState(false);
    const [versionCompareModalVisible, setVersionCompareModalVisible] = useState(false);
    const [convertModalVisible, setConvertModalVisible] = useState(false);
    const [compareContent, setCompareContent] = useState("");

    const handleSave = () => {
        setDiffModalVisible(true);
    };

    const handleCloseDiffModal = () => {
        setDiffModalVisible(false);
    };

    const handleCompare = () => {
        setCompareModalVisible(true);
    };

    const handleCloseCompareModal = () => {
        setCompareModalVisible(false);
    };

    const handleVersionCompare = () => {
        setVersionCompareModalVisible(true);
    };

    const handleCloseVersionCompareModal = () => {
        setVersionCompareModalVisible(false);
    };

    const handleVersionCompareConfirm = (content: string) => {
        setCompareContent(content);
        setDiffModalVisible(true);
    };

    const handleCompareConfirm = (content: string) => {
        setCompareContent(content);
        setDiffModalVisible(true);
    };

    // 检测内容是否发生变更
    const hasContentChanged = () => {
        return editorContent !== configContent.content;
    };

    // 处理返回或取消操作的确认逻辑
    const handleConfirmNavigateBack = () => {
        if (hasContentChanged()) {
            Modal.confirm({
                title: "确认提示",
                content: "当前配置内容已修改，确定要离开吗？未保存的更改将丢失。",
                centered: true,
                onOk: () => {
                    navigate(-1);
                },
                onCancel: () => {
                    // 取消操作，留在当前页面
                }
            });
        } else {
            navigate(-1);
        }
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isFullscreen]);

    const handleConfirmSave = async () => {
        if (!config_id) return;
        const formValues = formApi.current?.getValues() || {};
        const payload = {
            ...formValues,
            content: editorContent,
        };
        await ConfigInfoService.update(config_id, payload);
        // 更新configContent，将当前编辑器内容作为下次保存的比对基准
        setConfigContent((prev: typeof configContent) => ({
            ...prev,
            content: editorContent
        }));
        setDiffModalVisible(false);
        Modal.success({
            title: "提示",
            content: "保存成功",
            centered: true,
            maskClosable: false,
            hasCancel: false,
        });
    };

    // 处理转换按钮点击
    const handleConvert = () => {
        setConvertModalVisible(true);
    };

    // 处理转换确认
    const handleConvertConfirm = (convertedContent: string) => {
        setEditorContent(convertedContent);
        setConvertModalVisible(false);
    };

    // 处理关闭转换模态框
    const handleCloseConvertModal = () => {
        setConvertModalVisible(false);
    };

    // 插件不支持properties格式，暂时使用ini格式代替
    const getConfigType = () => {
        if (configContent.type === 'properties') {
            return 'ini';
        }
        return configContent.type;
    }

    const Shortcut = ({keyCombo}: { keyCombo: string }) => {
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        const display = keyCombo.replace(/Mod/i, isMac ? '⌘' : 'Ctrl');
        return <kbd>{display}</kbd>;
    };

    if (!tenant_id || !data_id || !group_id) {
        return <div>不存在这个配置</div>;
    }

    return (
        <div style={{padding: "10px", maxWidth: "1200px", margin: "0 auto"}}>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px"}}>
                <div style={{display: "flex", alignItems: "center"}}>
                    <Button
                        icon={<IconArrowLeft/>}
                        theme="borderless"
                        onClick={handleConfirmNavigateBack}
                        style={{marginRight: "10px"}}
                        disabled={loading}
                    />
                    <Typography.Title heading={4}>编辑配置</Typography.Title>
                </div>
                <div style={{color: 'var(--semi-color-text-2)'}}>
                    最后更新时间: {configContent.create_time}
                </div>
            </div>

            <Form
                layout="vertical"
                style={{width: "100%"}}
                getFormApi={(api: any) => (formApi.current = api)}
            >
                <Space vertical spacing={0} style={{width: "100%"}}>
                    <Form.Section text="命名空间" style={{width: "1100px"}}>
                        <div>{configContent.tenant_id}</div>
                    </Form.Section>

                    <Form.Input
                    field="data_id"
                    label="Data Id"
                    placeholder="请输入配置名称"
                    style={{width: "1100px"}}
                    disabled={loading}
                    showClear
                />

                    <Form.Input
                    field="group_id"
                    label="Group"
                    placeholder="请输入配置描述"
                    style={{width: "1100px"}}
                    disabled={loading}
                    showClear
                />

                    <Form.RadioGroup field="type" label="配置类型" style={{width: "1100px"}} disabled={loading}>
                    {languageListStore.getState().languages.map((type) => (
                        <Radio key={type} value={type} onChange={() => setConfigContent({...configContent, type})}>
                            {type}
                        </Radio>
                    ))}
                </Form.RadioGroup>

                    <div style={{display: "flex", justifyContent: "center"}}>
                        <div style={{
                            position: isFullscreen ? 'fixed' : 'relative',
                            top: isFullscreen ? 0 : 'auto',
                            left: isFullscreen ? 0 : 'auto',
                            width: isFullscreen ? '100vw' : '1150px',
                            height: isFullscreen ? '100vh' : '400px',
                            zIndex: isFullscreen ? 9999 : 'auto',
                            backgroundColor: isFullscreen ? '#1e1e1e' : 'transparent',
                        }}>
                            <Button
                                icon={isFullscreen ? <IconShrinkScreenStroked/> : <IconFullScreenStroked/>}
                                theme="borderless"
                                onClick={toggleFullscreen}
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    zIndex: 10,
                                    color: '#fff',
                                }}
                                title={isFullscreen ? '退出全屏 (ESC)' : '全屏'}
                            />
                            <MonacoEditor
                                value={editorContent}
                                onChange={setEditorContent}
                                language={getConfigType()}
                                theme="vs-dark"
                                options={{
                                    automaticLayout: true,
                                    minimap: {enabled: false},
                                    readOnly: loading,
                                }}
                            />
                        </div>
                    </div>

                    <div style={{width: "100%"}}>
                        <div style={{display: "flex", justifyContent: "flex-end", gap: "10px"}}>
                            {configContent.type === 'properties' && (
                                <Button onClick={handleConvert} style={{marginTop: "20px"}} disabled={loading}>
                                    转换格式
                                </Button>
                            )}
                            <Button onClick={handleCompare} style={{marginTop: "20px"}} disabled={loading}>
                                配置对比
                            </Button>
                            <Button onClick={handleVersionCompare} style={{marginTop: "20px"}} disabled={loading}>
                                版本比对
                            </Button>
                            <Button theme='solid' onClick={handleSave} style={{marginTop: "20px"}} disabled={loading}>
                                保存&nbsp;<Shortcut keyCombo="Mod+S"/>
                            </Button>
                            <Button onClick={handleConfirmNavigateBack} style={{marginTop: "20px"}} disabled={loading}>
                                返回
                            </Button>
                        </div>
                    </div>

                </Space>
            </Form>
            <HotKeys
                hotKeys={[HotKeys.Keys.Meta, HotKeys.Keys.S]}
                onHotKey={handleSave}
                render={() => null}
                preventDefault
            />
            <HotKeys
                hotKeys={[HotKeys.Keys.Control, HotKeys.Keys.S]}
                onHotKey={handleSave}
                render={() => null}
                preventDefault
            />
            <CompareConfigModal
                visible={compareModalVisible}
                onClose={handleCloseCompareModal}
                onConfirm={handleCompareConfirm}
                currentDataId={configContent.data_id}
                currentGroupId={configContent.group_id}
                currentTenantId={configContent.tenant_id}
                currentContent={editorContent || ''}
            />
            <VersionCompareModal
                visible={versionCompareModalVisible}
                onClose={handleCloseVersionCompareModal}
                onConfirm={handleVersionCompareConfirm}
                currentDataId={configContent.data_id}
                currentGroupId={configContent.group_id}
                currentTenantId={configContent.tenant_id}
                currentContent={editorContent || ''}
            />
            <DiffModal
                visible={diffModalVisible}
                onClose={handleCloseDiffModal}
                onConfirm={handleConfirmSave}
                oldContent={compareContent || (configContent as any).content || ''}
                newContent={editorContent || ''}
                fileName={(configContent as any).group_id || 'config'}
            />
            <ConvertModal
                visible={convertModalVisible}
                onClose={handleCloseConvertModal}
                onConfirm={handleConvertConfirm}
                originalContent={editorContent}
                configType={configContent.type}
            />
        </div>
    );
};

export default EditConfigContextPage;
