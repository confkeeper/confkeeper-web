import React, { useState, useEffect } from 'react';
import { Modal, Input, Checkbox, List, Spin, Empty, Typography, Tag, Button, Pagination } from '@douyinfe/semi-ui-19';
import { IconSearch } from '@douyinfe/semi-icons';
import { ConfigInfoService } from '@/src/services/config_info';
import { SearchConfigResultData } from '@/src/api/config_info/types';
import { Link } from 'react-router-dom';

interface GlobalSearchModalProps {
    visible: boolean;
    onCancel: () => void;
    currentTenantId?: string;
}

const {Text} = Typography;

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({visible, onCancel, currentTenantId}) => {
    const [keyword, setKeyword] = useState('');
    const [isCurrentTenant, setIsCurrentTenant] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchConfigResultData[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 10;

    useEffect(() => {
        if (visible) {
            // Reset state when modal opens
            setKeyword('');
            setResults([]);
            setHasSearched(false);
            setPage(1);
            setTotal(0);
            if (currentTenantId) {
                setIsCurrentTenant(true);
            }
        }
    }, [visible, currentTenantId]);

    const handleSearch = async (pageNum = 1) => {
        if (!keyword.trim()) return;

        setLoading(true);
        setHasSearched(true);
        try {
            const res = await ConfigInfoService.search({
                keyword,
                tenant_id: isCurrentTenant ? currentTenantId : undefined,
                page: pageNum,
                page_size: pageSize
            });
            setResults(res.data || []);
            setTotal(res.total || 0);
            setPage(pageNum);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const renderMatchContent = (content: string) => {
        // Simple highlighting
        if (!keyword) return content;

        // Split by keyword to highlight
        const parts = content.split(new RegExp(`(${keyword})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === keyword.toLowerCase() ?
                        <Text key={i} style={{backgroundColor: 'yellow'}}>{part}</Text> :
                        part
                )}
            </span>
        );
    };

    return (
        <Modal
            title="全局搜索"
            visible={visible}
            onCancel={onCancel}
            footer={null}
            size="large"
            style={{height: '80vh', display: 'flex', flexDirection: 'column'}}
            bodyStyle={{flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '24px'}}
        >
            <div style={{marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center'}}>
                <Input
                    prefix={<IconSearch/>}
                    placeholder="输入关键字搜索配置内容..."
                    value={keyword}
                    onChange={(val) => setKeyword(val)}
                    onKeyDown={handleKeyDown}
                    style={{flex: 1}}
                    showClear
                />
                <Button theme="solid" type="primary" onClick={() => handleSearch(1)}>搜索</Button>
                {currentTenantId && (
                    <Checkbox
                        checked={isCurrentTenant}
                        onChange={(e) => setIsCurrentTenant(!!e.target.checked)}
                    >
                        仅当前命名空间
                    </Checkbox>
                )}
            </div>

            <div style={{flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column'}}>
                {loading ? (
                    <div style={{display: 'flex', justifyContent: 'center', padding: 40}}>
                        <Spin size="large"/>
                    </div>
                ) : results.length > 0 ? (
                    <>
                        <List
                            dataSource={results}
                            renderItem={(item) => (
                                <List.Item
                                    style={{padding: '16px', borderBottom: '1px solid var(--semi-color-border)'}}
                                >
                                    <div style={{width: '100%'}}>
                                        <div
                                            style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                                            <div>
                                                <Link
                                                    to={`/edit_content?tenant_id=${item.tenant_id}&data_id=${item.data_id}&group_id=${item.group_id}`}
                                                    target="_blank"
                                                    style={{
                                                        fontSize: 16,
                                                        fontWeight: 'bold',
                                                        marginRight: 8,
                                                        color: 'var(--semi-color-primary)'
                                                    }}
                                                >
                                                    Group Id: {item.group_id} Data Id: {item.data_id}
                                                </Link>
                                                <Tag>命名空间: {item.tenant_id}</Tag>
                                            </div>
                                        </div>

                                        <div style={{
                                            background: 'var(--semi-color-fill-0)',
                                            padding: '8px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {item.matches.map((match, idx) => (
                                                <div key={idx} style={{display: 'flex'}}>
                                                    <span style={{
                                                        color: 'var(--semi-color-text-2)',
                                                        marginRight: 8,
                                                        userSelect: 'none',
                                                        minWidth: 40,
                                                        textAlign: 'right'
                                                    }}>
                                                        {match.line_no}:
                                                    </span>
                                                    <span style={{flex: 1}}>{renderMatchContent(match.content)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </List.Item>
                            )}
                        />
                        <div style={{display: 'flex', justifyContent: 'center', padding: '16px 0'}}>
                            <Pagination
                                total={total}
                                currentPage={page}
                                pageSize={pageSize}
                                onChange={(cPage) => handleSearch(cPage)}
                            />
                        </div>
                    </>
                ) : hasSearched ? (
                    <Empty title="未找到相关配置" description="请尝试更换关键字"/>
                ) : (
                    <div style={{textAlign: 'center', color: 'var(--semi-color-text-2)', marginTop: 40}}>
                        请输入关键字进行搜索
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default GlobalSearchModal;
