import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ConfigInfoService } from "@/src/services/config_info";
import type { BlameRun } from "@/src/api/config_info/types";
import MonacoEditor from "react-monaco-editor/lib/editor";
import { Button, Form, HotKeys, Radio, Space, Typography, Modal, Switch, Toast } from '@douyinfe/semi-ui';
import {
    IconArrowLeft,
    IconFullScreenStroked,
    IconShrinkScreenStroked,
    IconMinus,
    IconPlus
} from "@douyinfe/semi-icons";
import { FormApi } from "@douyinfe/semi-ui/lib/es/form";
import { languageListStore } from "@/src/stores/useLanguageListStore";
import { useEditorSettingsStore } from "@/src/stores/useEditorSettingsStore";
import DiffModal from "@/src/components/DiffModal";
import CompareConfigModal from "@/src/components/CompareConfigModal";
import VersionCompareModal from "@/src/components/VersionCompareModal";
import ConvertModal from "@/src/components/ConvertModal";
import { getUsername } from "@/src/utils/auth";
import { detectLineEnding, toggleLineEnding as toggleLineEndingUtil, LineEndingType } from "@/src/utils/lineEnding";
import {
    computeDiffDecorations,
    buildMonacoDiffDecorations,
    injectDiffGutterStyles
} from "@/src/utils/editorDiffDecorations";

const EditConfigContextPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tenant_id = searchParams.get('tenant_id');
    const data_id = searchParams.get('data_id');
    const group_id = searchParams.get('group_id');
    const isNewConfig = !data_id || !group_id;
    const [configContent, setConfigContent] = useState({
        config_id: "",
        content: "",
        data_id: "",
        group_id: "",
        tenant_id: tenant_id || "",
        type: "properties",
        version: ""
    } as any);
    const [editorContent, setEditorContent] = useState("");
    const [config_id, setConfigId] = useState('');
    const [loading, setLoading] = useState(!isNewConfig);
    const formApi = useRef<FormApi>(null);
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const diffDecorationsRef = useRef<string[]>([]);
    const blameDecorationsRef = useRef<string[]>([]);
    const blameWidgetRef = useRef<any>(null);
    const blameWidgetVisibleRef = useRef(false);
    const blameWidgetPositionRef = useRef<{ lineNumber: number; column: number } | null>(null);
    const blameWidgetAddedRef = useRef(false);
    const [editorMounted, setEditorMounted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [wordWrap, setWordWrap] = useState<'on' | 'off'>('off');
    const [lineEnding, setLineEnding] = useState<LineEndingType>('unix');
    const [blameRuns, setBlameRuns] = useState<BlameRun[]>([]);
    const blameRunsRef = useRef<BlameRun[]>([]);
    const currentLineRef = useRef<number>(1);
    const blameRequestSeqRef = useRef(0);
    const fontSize = useEditorSettingsStore((state) => state.fontSize);
    const setFontSize = useEditorSettingsStore((state) => state.setFontSize);

    const handleToggleLineEnding = () => {
        const result = toggleLineEndingUtil(editorContent, lineEnding);
        setEditorContent(result.content);
        setLineEnding(result.lineEnding);
    };

    // 获取配置每行最后修改人/时间（类似 GitLens blame）
    const fetchBlame = (cid: string) => {
        const requestSeq = ++blameRequestSeqRef.current;
        if (!cid) {
            setBlameRuns([]);
            return;
        }
        ConfigInfoService.get_blame(cid).then((data) => {
            if (requestSeq !== blameRequestSeqRef.current) return;
            const runs = data?.runs || [];
            if (data?.total_lines > 0 && runs.length === 0) {
                Toast.warning('当前配置行数较多，暂未显示行修改信息');
            }
            setBlameRuns(runs);
        });
    };

    // 将后端返回的 "2026-07-14 10:00:00" 格式化为行尾显示文本
    const formatBlameText = (author: string, createTime: string) => {
        const parts = (createTime || '').split(' ');
        const datePart = parts[0] || '';
        const timePart = (parts[1] || '').slice(0, 5);
        return `   ${author || '未知'} · ${datePart} ${timePart}`;
    };

    // 注入行修改记录样式（仅注入一次）
    const injectBlameStyles = () => {
        const styleId = 'monaco-editor-blame-style';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .monaco-editor .blame-inline-text {
                color: rgba(255, 255, 255, 0.55);
                font-size: 12px;
                font-style: italic;
                margin-left: 16px;
                white-space: pre;
            }
            .monaco-editor .blame-content-widget {
                color: rgba(255, 255, 255, 0.62);
                font-size: 12px;
                font-style: italic;
                line-height: 20px;
                padding-left: 16px;
                pointer-events: none;
                user-select: none;
                white-space: nowrap;
                z-index: 50;
            }
        `;
        document.head.appendChild(style);
    };

    const ensureBlameWidget = () => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco) return null;

        if (!blameWidgetRef.current) {
            const domNode = document.createElement('span');
            domNode.className = 'blame-content-widget';

            blameWidgetRef.current = {
                allowEditorOverflow: true,
                suppressMouseDown: true,
                getId: () => 'confkeeper-current-line-blame',
                getDomNode: () => domNode,
                getPosition: () => {
                    const position = blameWidgetPositionRef.current;
                    if (!blameWidgetVisibleRef.current || !position) return null;
                    return {
                        position,
                        preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
                        positionAffinity: monaco.editor?.PositionAffinity?.Right,
                    };
                },
            };
        }

        if (!blameWidgetAddedRef.current) {
            editor.addContentWidget(blameWidgetRef.current);
            blameWidgetAddedRef.current = true;
        }

        return blameWidgetRef.current;
    };

    const hideBlame = () => {
        const editor = editorRef.current;
        if (!editor) return;

        blameDecorationsRef.current = editor.deltaDecorations(blameDecorationsRef.current, []);
        blameWidgetVisibleRef.current = false;
        blameWidgetPositionRef.current = null;
        const widget = blameWidgetRef.current;
        if (widget) {
            widget.getDomNode().textContent = '';
            editor.layoutContentWidget(widget);
        }
    };

    // 只在光标所在行行尾显示该行最后修改人/时间（类似 GitLens 当前行 blame）
    const refreshBlameDecoration = () => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco) return;
        const runs = blameRunsRef.current;
        if (!runs.length || isNewConfig) {
            hideBlame();
            return;
        }
        const line = currentLineRef.current;
        const model = editor.getModel();
        const lineCount = model?.getLineCount?.() || 0;
        if (!model || line < 1 || line > lineCount) {
            hideBlame();
            return;
        }
        const run = runs.find(r => line >= r.start_line && line <= r.end_line);
        if (!run) {
            hideBlame();
            return;
        }
        const lineEndColumn = model.getLineMaxColumn(line);
        const blameText = formatBlameText(run.author, run.create_time);

        const widget = ensureBlameWidget();
        if (widget) {
            blameDecorationsRef.current = editor.deltaDecorations(blameDecorationsRef.current, []);
            blameWidgetVisibleRef.current = true;
            blameWidgetPositionRef.current = {lineNumber: line, column: lineEndColumn};
            widget.getDomNode().textContent = blameText.trimStart();
            editor.layoutContentWidget(widget);
            return;
        }

        blameDecorationsRef.current = editor.deltaDecorations(blameDecorationsRef.current, [{
            range: new monaco.Range(line, lineEndColumn, line, lineEndColumn),
            options: {
                after: {
                    content: blameText,
                    inlineClassName: 'blame-inline-text',
                    cursorStops: monaco.editor?.InjectedTextCursorStops?.None,
                },
                stickiness: monaco.editor?.TrackedRangeStickiness?.NeverGrowsWhenTypingAtEdges,
            },
        }]);
    };

    useEffect(() => {
        if (!isNewConfig && tenant_id && data_id && group_id) {
            setLoading(true);
            ConfigInfoService.getByParams({tenant_id, data_id, group_id}).then(async (res) => {
                const initialData = res.data || {
                    content: '',
                    data_id: '',
                    group_id: '',
                    tenant_id: '',
                    type: '',
                    version: ''
                };
                const cid = 'config_id' in initialData ? (initialData as any).config_id : '';
                const detail = cid ? await ConfigInfoService.get({config_id: cid}) : undefined;
                const data = {
                    ...initialData,
                    ...(detail?.data || {}),
                };
                setConfigContent({...data, content: data.content || '', version: data.version ?? ''});
                setEditorContent(data.content || "");
                setConfigId('config_id' in data ? data.config_id : '');
                setLineEnding(detectLineEnding(data.content || ''));
                if (formApi.current) {
                    formApi.current.setValues(data);
                }
                // 获取行修改记录（blame）
                fetchBlame(cid);
            }).finally(() => {
                setLoading(false);
            });
        } else if (isNewConfig && tenant_id) {
            setConfigId('');
            setBlameRuns([]);
            setConfigContent({
                config_id: "",
                content: "",
                data_id: "",
                group_id: "",
                tenant_id: tenant_id,
                type: "properties",
                version: ""
            });
            if (formApi.current) {
                formApi.current.setValues({
                    data_id: "",
                    group_id: "",
                    type: "properties"
                });
            }
            setLoading(false);
        }
    }, [tenant_id, data_id, group_id, isNewConfig]);

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

    const clearDiffDecorations = () => {
        const editor = editorRef.current;
        if (!editor) {
            diffDecorationsRef.current = [];
            return;
        }
        diffDecorationsRef.current = editor.deltaDecorations(diffDecorationsRef.current, []);
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

    const hasContentChanged = () => {
        const formValues = formApi.current?.getValues() || {};

        if (isNewConfig) {
            const hasDataId = formValues.data_id && formValues.data_id.trim() !== '';
            const hasGroupId = formValues.group_id && formValues.group_id.trim() !== '';
            const hasContent = editorContent && editorContent.trim() !== '';
            const hasTypeChanged = formValues.type && formValues.type !== 'properties';

            return hasDataId || hasGroupId || hasContent || hasTypeChanged;
        } else {
            const contentChanged = editorContent !== configContent.content;
            const typeChanged = formValues.type !== configContent.type;

            return contentChanged || typeChanged;
        }
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

    useEffect(() => {
        setLineEnding(detectLineEnding(editorContent));
    }, [editorContent]);

    // 根据已保存内容(configContent.content)与当前编辑内容(editorContent)的差异，
    // 在编辑器左侧装订线显示 Git 风格的修改(橙)/新增(绿)标记
    useEffect(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        if (!editor || !monaco || !editorMounted) return;

        const timer = setTimeout(() => {
            const decorations = computeDiffDecorations(configContent.content || '', editorContent || '');
            const monacoDecorations = buildMonacoDiffDecorations(monaco, decorations);
            diffDecorationsRef.current = editor.deltaDecorations(diffDecorationsRef.current, monacoDecorations);
        }, 300);

        return () => clearTimeout(timer);
    }, [editorContent, configContent.content, editorMounted]);

    // blame 数据变化后同步到 ref，并刷新光标所在行的行尾标注
    useEffect(() => {
        blameRunsRef.current = blameRuns || [];
        refreshBlameDecoration();
    }, [blameRuns]);

    // 当编辑内容与保存内容一致性发生变化时，刷新 blame 标注
    useEffect(() => {
        refreshBlameDecoration();
    }, [editorContent === configContent.content, editorMounted]);

    useEffect(() => {
        const handleFindShortcut = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                const action = editorRef.current?.getAction('actions.find');
                if (action) {
                    e.preventDefault();
                    e.stopPropagation();
                    editorRef.current.focus();
                    action.run();
                }
            }
        };
        window.addEventListener('keydown', handleFindShortcut, true);
        return () => window.removeEventListener('keydown', handleFindShortcut, true);
    }, []);

    const handleConfirmSave = async () => {
        try {
            const formValues = await formApi.current?.validate();
            if (!formValues) return;

            const payload = {
                ...formValues,
                content: editorContent,
            };

            if (isNewConfig) {
                const success = await ConfigInfoService.add({
                    ...payload,
                    tenant_id: tenant_id || undefined,
                });
                if (success) {
                    clearDiffDecorations();
                    setConfigContent((prev: typeof configContent) => ({
                        ...prev,
                        ...payload,
                        tenant_id: tenant_id || prev.tenant_id || '',
                        content: editorContent,
                    }));
                    setCompareContent("");
                    setDiffModalVisible(false);
                    navigate(`/edit_content?tenant_id=${tenant_id}&data_id=${formValues.data_id}&group_id=${formValues.group_id}`, {replace: true});
                }
            } else {
                if (!config_id) return;
                if (configContent.version === undefined || configContent.version === null || configContent.version === '') {
                    Toast.error('配置版本信息缺失，请刷新后重试');
                    return;
                }
                const success = await ConfigInfoService.update(config_id, {
                    ...payload,
                    oldversion: configContent.version,
                });
                if (success) {
                    const latest = await ConfigInfoService.get({config_id});
                    const latestData = latest.data || {};
                    clearDiffDecorations();
                    setConfigContent((prev: typeof configContent) => ({
                        ...prev,
                        ...latestData,
                        ...payload,
                        content: editorContent
                    }));
                    setCompareContent("");
                    setDiffModalVisible(false);
                    // 保存后重新获取行修改记录（新版本已生成）
                    fetchBlame(config_id);
                    Modal.success({
                        title: "提示",
                        content: "保存成功",
                        centered: true,
                        maskClosable: false,
                        hasCancel: false,
                    });
                }
            }
        } catch (error) {
            return;
        }
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

    if (!tenant_id) {
        return <div>缺少租户信息</div>;
    }

    return (
        <div style={{padding: "10px", maxWidth: "1200px", margin: "0 auto", position: "relative"}}>
            {/* 水印组件 */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-10000">
                <div className="w-full h-full grid grid-cols-3 grid-rows-5 gap-y-4">
                    {(() => {
                        const username = getUsername();
                        return Array.from({length: 15}).map((_, index) => (
                            <div
                                key={index}
                                className="transform -rotate-45 font-bold text-center whitespace-nowrap text-gray-400 dark:text-gray-500 opacity-20 flex items-center justify-center text-xs"
                            >
                                <div className="space-y-0.5">
                                    <div>{username}</div>
                                    <div>{data_id || ''}</div>
                                    <div>{group_id || ''}</div>
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            </div>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px"}}>
                <div style={{display: "flex", alignItems: "center"}}>
                    <Button
                        icon={<IconArrowLeft/>}
                        theme="borderless"
                        onClick={handleConfirmNavigateBack}
                        style={{marginRight: "10px"}}
                        disabled={loading}
                    />
                    <Typography.Title heading={4}>{isNewConfig ? '新建配置' : '编辑配置'}</Typography.Title>
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
                        disabled={loading || !isNewConfig}
                        showClear
                        rules={isNewConfig ? [{required: true, message: '请输入Data Id'}] : undefined}
                    />

                    <Form.Input
                        field="group_id"
                        label="Group"
                        placeholder="请输入配置描述"
                        style={{width: "1100px"}}
                        disabled={loading || !isNewConfig}
                        showClear
                        rules={isNewConfig ? [{required: true, message: '请输入Group'}] : undefined}
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
                            <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                            }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    color: '#fff',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }}>
                                    <span>字号</span>
                                    <Button
                                        size="small"
                                        theme="borderless"
                                        icon={<IconMinus/>}
                                        onClick={() => setFontSize(Math.max(8, fontSize - 1))}
                                        style={{color: '#fff', padding: '0 4px'}}
                                    />
                                    <span style={{minWidth: '24px', textAlign: 'center'}}>{fontSize}</span>
                                    <Button
                                        size="small"
                                        theme="borderless"
                                        icon={<IconPlus/>}
                                        onClick={() => setFontSize(Math.min(30, fontSize + 1))}
                                        style={{color: '#fff', padding: '0 4px'}}
                                    />
                                </label>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: '#fff',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }}>
                                    <span>换行符: {lineEnding === 'unix' ? 'Unix (LF)' : 'Windows (CRLF)'}</span>
                                    <Switch
                                        checked={lineEnding === 'windows'}
                                        onChange={handleToggleLineEnding}
                                        size="small"
                                    />
                                </label>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: '#fff',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }}>
                                    <span>自动换行</span>
                                    <Switch
                                        checked={wordWrap === 'on'}
                                        onChange={(checked) => setWordWrap(checked ? 'on' : 'off')}
                                        size="small"
                                    />
                                </label>
                                <Button
                                    icon={isFullscreen ? <IconShrinkScreenStroked/> : <IconFullScreenStroked/>}
                                    theme="borderless"
                                    onClick={toggleFullscreen}
                                    style={{color: '#fff'}}
                                    title={isFullscreen ? '退出全屏 (ESC)' : '全屏'}
                                />
                            </div>
                            <MonacoEditor
                                value={editorContent}
                                onChange={setEditorContent}
                                language={getConfigType()}
                                theme="vs-dark"
                                editorDidMount={(editor: any, monaco: any) => {
                                    editorRef.current = editor;
                                    monacoRef.current = monaco;
                                    diffDecorationsRef.current = [];
                                    blameDecorationsRef.current = [];
                                    blameWidgetRef.current = null;
                                    blameWidgetAddedRef.current = false;
                                    blameWidgetVisibleRef.current = false;
                                    blameWidgetPositionRef.current = null;
                                    currentLineRef.current = editor.getPosition()?.lineNumber || 1;
                                    setEditorMounted(true);
                                    injectDiffGutterStyles();
                                    injectBlameStyles();
                                    // 光标移动时更新当前行，并刷新行尾修改人标注
                                    editor.onDidChangeCursorPosition((e: any) => {
                                        currentLineRef.current = e.position.lineNumber;
                                        refreshBlameDecoration();
                                    });
                                    // 挂载后若已有 blame 数据，立即刷新一次
                                    refreshBlameDecoration();
                                }}
                                options={{
                                    automaticLayout: true,
                                    minimap: {enabled: false},
                                    readOnly: loading,
                                    wordWrap: wordWrap,
                                    fontSize: fontSize,
                                    glyphMargin: true,
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
