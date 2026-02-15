import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@douyinfe/semi-ui-19';
import MonacoDiffEditor from 'react-monaco-editor/lib/diff';

interface ConvertModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (convertedContent: string) => void;
    originalContent: string;
    configType: string;
}

// 转换properties格式为驼峰格式
const convertPropertiesFormat = (content: string): string => {
    const lines = content.split('\n');
    const convertedLines = lines.map(line => {
        // 跳过空行和注释行
        if (!line.trim() || line.trim().startsWith('#')) {
            return line;
        }

        // 解析key和value
        const [key, value] = line.split('=');
        if (!key || value === undefined) {
            return line;
        }

        const originalKey = key.trim();

        // 转换key: 转换为驼峰，-转换为_，[x]转换为__
        let convertedKey = originalKey
            .split('.').map((part, index) => {
                if (index === 0) return part;
                return part.charAt(0).toUpperCase() + part.slice(1);
            }).join('') // 处理点分隔的部分为驼峰
            .replace(/-/g, '_') // 转换-为_
            .replace(/\[(.*?)\]/g, '__$1'); // 转换[任意内容]为__任意内容

        // 生成转换后的行
        const convertedValue = value.trim();
        return originalKey + '=${' + convertedKey + ':' + convertedValue + '}';
    });

    return convertedLines.join('\n');
};

const ConvertModal: React.FC<ConvertModalProps> = ({
                                                       visible,
                                                       onClose,
                                                       onConfirm,
                                                       originalContent,
                                                       configType
                                                   }) => {
    const [editedContent, setEditedContent] = useState('');

    // 当原始内容变化时重新转换
    useEffect(() => {
        if (visible && configType === 'properties') {
            const converted = convertPropertiesFormat(originalContent);
            setEditedContent(converted);
        }
    }, [visible, originalContent, configType]);

    // 处理确认保存
    const handleConfirmClick = () => {
        onConfirm(editedContent);
    };

    return (
        <Modal
            title="配置格式转换"
            visible={visible}
            onCancel={onClose}
            width={1200}
            centered
            footer={
                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                    <Button onClick={onClose}>取消</Button>
                    <Button theme='solid' onClick={handleConfirmClick}>
                        保存到编辑器
                    </Button>
                </div>
            }
        >
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
                    <span>原始配置</span>
                    <span>转换后配置（可编辑）</span>
                </div>
                <div style={{flex: 1, minHeight: 0}}>
                    <MonacoDiffEditor
                        original={originalContent || ''}
                        value={editedContent || ''}
                        language={'ini'}
                        theme={'vs-dark'}
                        options={{
                            automaticLayout: true,
                            renderSideBySide: true,
                            readOnly: false,
                            minimap: {enabled: false},
                        }}
                        onChange={(value) => {
                            setEditedContent(value);
                        }}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default ConvertModal;
