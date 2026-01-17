import React from 'react';
import { Modal, Button } from '@douyinfe/semi-ui-19';
import MonacoDiffEditor from 'react-monaco-editor/lib/diff';

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
                    <Button theme='solid' onClick={onConfirm}>
                        确认保存
                    </Button>
                </div>
            }
        >
            {isSame ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666', border: '1px solid #e8e8e8', borderRadius: '4px' }}>
                    配置内容没有变化
                </div>
            ) : (
                <div style={{ height: '60vh', border: '1px solid #e8e8e8', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: 12, color: '#666', background: '#f5f5f5', borderBottom: '1px solid #e8e8e8' }}>
                        <span>旧配置</span>
                        <span>新配置</span>
                    </div>
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <MonacoDiffEditor
                            original={oldContent || ''}
                            value={newContent || ''}
                            language={'ini'}
                            theme={'vs-dark'}
                            options={{
                                automaticLayout: true,
                                renderSideBySide: true,
                                readOnly: true,
                                minimap: { enabled: false },
                            }}
                        />
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default DiffModal;