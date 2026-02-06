import React, { useState } from 'react';
import { Modal, Button } from '@douyinfe/semi-ui-19';
import MonacoDiffEditor from 'react-monaco-editor/lib/diff';
import {
    createChinesePunctuationDecorations,
    injectChinesePunctuationStyles
} from '@/src/utils/chinesePunctuation';

interface DiffModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    oldContent: string;
    newContent: string;
    fileName?: string;
}

const DiffModal: React.FC<DiffModalProps> = ({
    visible,
    onClose,
    onConfirm,
    oldContent,
    newContent,
    fileName = 'config'
}) => {
    const isSame = (oldContent || '') === (newContent || '');
    const [errorCount, setErrorCount] = useState(0);

    // 处理保存按钮点击
    const handleConfirmClick = () => {
        if (errorCount > 0) {
            Modal.confirm({
                title: '警告',
                content: `检测到中文标点符号，这可能会导致配置解析错误。确定要继续保存吗？`,
                centered: true,
                okText: '继续保存',
                cancelText: '取消',
                onOk: () => {
                    onConfirm();
                }
            });
        } else {
            onConfirm();
        }
    };

    return (
        <Modal
            title="配置内容对比"
            visible={visible}
            onCancel={onClose}
            width={1200}
            centered
            footer={
                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                    <Button onClick={onClose}>取消</Button>
                    <Button theme='solid' onClick={handleConfirmClick}>
                        确认保存
                    </Button>
                </div>
            }
        >
            {isSame ? (
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#666',
                    border: '1px solid #e8e8e8',
                    borderRadius: '4px'
                }}>
                    配置内容没有变化
                </div>
            ) : (
                <div style={{
                    height: '60vh',
                    border: '1px solid #e8e8e8',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        fontSize: 12,
                        color: '#666',
                        background: '#f5f5f5',
                        borderBottom: '1px solid #e8e8e8'
                    }}>
                        <span>旧配置</span>
                        <span>新配置</span>
                    </div>
                    <div style={{flex: 1, minHeight: 0}}>
                        <MonacoDiffEditor
                            original={oldContent || ''}
                            value={newContent || ''}
                            language={'ini'}
                            theme={'vs-dark'}
                            options={{
                                automaticLayout: true,
                                renderSideBySide: true,
                                readOnly: true,
                                minimap: {enabled: false},
                            }}
                            editorDidMount={(diffEditor, monaco) => {
                                // 注入红色高亮样式
                                injectChinesePunctuationStyles();

                                // 获取修改后的编辑器（只检查新配置）
                                const modifiedEditor = diffEditor.getModifiedEditor();

                                // 为编辑器添加装饰
                                let modifiedDecorations: string[] = [];

                                const updateHighlights = () => {
                                    const decorations = createChinesePunctuationDecorations(modifiedEditor, monaco);
                                    modifiedDecorations = modifiedEditor.deltaDecorations(modifiedDecorations, decorations);

                                    // 更新错误计数（只计算新配置中的错误）
                                    setErrorCount(decorations.length);
                                };

                                // 延迟执行确保编辑器已初始化
                                setTimeout(updateHighlights, 100);
                            }}
                        />
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default DiffModal;