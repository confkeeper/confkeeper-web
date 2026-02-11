import React, { useRef, useState } from "react";
import { Table, Button, Modal, Form, Input, Select, Toast } from "@douyinfe/semi-ui-19";
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form/interface';
import useService from "@/src/hooks/useService";

import { ConfigInfoService } from "@/src/services/config_info";
import { TenantService } from "@/src/services/tenant";
import { IconRefresh, IconSearch } from "@douyinfe/semi-icons";
import { Link, useSearchParams } from "react-router-dom";
import type { ConfigInfo } from "@/src/types/config_info";
import GlobalSearchModal from "@/src/components/GlobalSearchModal";

const ConfigInfoPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [pageSize, setPageSize] = useState<number>(() => {
        const size = searchParams.get('pageSize');
        return size ? parseInt(size, 10) : 10;
    });
    const [pageNum, setPage] = useState<number>(() => {
        const page = searchParams.get('pageNum');
        return page ? parseInt(page, 10) : 1;
    });

    // 读取 URL 中的初始参数
    const initialTenantId = searchParams.get("tenant_id") || undefined;
    const initialDataId = searchParams.get("data_id") || "";
    const initialGroupId = searchParams.get("group_id") || "";
    const initialType = searchParams.get("type") || "";

    const [tenantId, setTenantId] = useState<string | undefined>(initialTenantId);
    const [dataIdInput, setDataIdInput] = useState<string>(initialDataId);
    const [groupIdInput, setGroupIdInput] = useState<string>(initialGroupId);
    const [typeInput, setTypeInput] = useState<string>(initialType);
    const [queryParams, setQueryParams] = useState<{ data_id?: string; group_id?: string; type?: string }>({
        data_id: initialDataId || undefined,
        group_id: initialGroupId || undefined,
        type: initialType || undefined,
    });

    const tenantResponse = useService(() => TenantService.list({ page: 1, page_size: 100 }), []);
    const tenantList = tenantResponse[0]?.data?.data || [];

    React.useEffect(() => {
        const tenantIdParam = searchParams.get('tenant_id');
        if (tenantIdParam) {
            setTenantId(tenantIdParam);
        }

        const page = searchParams.get('pageNum');
        if (page) {
            const pageNum = parseInt(page, 10);
            if (!isNaN(pageNum)) {
                setPage(pageNum);
            }
        }

        const size = searchParams.get('pageSize');
        if (size) {
            const pageSize = parseInt(size, 10);
            if (!isNaN(pageSize)) {
                setPageSize(pageSize);
            }
        }

        if (tenantList.length > 0 && !tenantIdParam) {
            const defaultTenantId = tenantList[0].tenant_id;
            setTenantId(defaultTenantId);
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.set('tenant_id', defaultTenantId);
            newParams.set('pageNum', '1');
            newParams.set('pageSize', pageSize.toString());
            setSearchParams(newParams);
        }
    }, [tenantList, searchParams, pageSize]);

    const serviceResponse = useService(() => {
        if (!tenantId) return Promise.resolve({data: [], total: 0, page: 1});
        return ConfigInfoService.list({
            tenant_id: tenantId,
            page: pageNum,
            page_size: pageSize,
            ...queryParams
        });
    }, [tenantId, pageNum, pageSize, queryParams]);
    const {data, loading} = serviceResponse[0];
    const refresh = serviceResponse[1];
    const [visible, setVisible] = useState(false);
    const [modalType, setModalType] = useState<'create' | 'edit'>('create');
    const [modalRecord, setModalRecord] = useState<any>();
    const [okLoading, setOkLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [cloneModalVisible, setCloneModalVisible] = useState(false);
    const [cloneTargetTenantId, setCloneTargetTenantId] = useState<string>('');
    const [cloneLoading, setCloneLoading] = useState(false);
    const formApi = useRef<FormApi>(null);
    const [modifiedCloneData, setModifiedCloneData] = useState<{
        [key: string]: { data_id: string; group_id: string }
    }>({});
    const cloneFormApi = useRef<FormApi>(null);
    const [globalSearchVisible, setGlobalSearchVisible] = useState(false);

    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这条记录吗？',
            onOk: async () => {
                await ConfigInfoService.delete({config_id: id});
                refresh();
            }
        });
    };

    const handleBatchDelete = () => {
        Modal.confirm({
            title: '确认批量删除',
            content: `确定要删除选中的 ${selectedRows.length} 条记录吗？`,
            onOk: async () => {
                const success = await ConfigInfoService.batchDelete({
                    config_ids: selectedRows.map(row => row.config_id)
                });
                if (success) {
                    refresh();
                    setSelectedRows([]);
                }
            }
        });
    };

    const handleClone = () => {
        if (selectedRows.length === 0 || !cloneTargetTenantId) {
            Toast.warning("请选择要克隆的配置和目标命名空间");
            return;
        }

        setCloneLoading(true);
        // 获取表单中修改后的值
        const items = selectedRows.map(row => {
            const configId = row.config_id;
            // 优先使用修改后的值，如果没有修改则使用原始值
            const modifiedData = modifiedCloneData[configId];

            return {
                config_id: configId,
                data_id: modifiedData?.data_id || row.data_id,
                group_id: modifiedData?.group_id || row.group_id
            };
        });

        ConfigInfoService.clone({
            tenant_id: cloneTargetTenantId,
            items
        }).then((ok) => {
            if (!ok) return;
            // 成功时关闭表单
            Toast.success(`成功克隆 ${selectedRows.length} 个配置`);
            setCloneModalVisible(false);
            setSelectedRows([]);
            setCloneTargetTenantId('');
            setModifiedCloneData({});
            refresh();
        }).finally(() => {
            setCloneLoading(false);
        });
    };
    // 处理输入框变化
    const handleCloneInputChange = (configId: string, field: string, value: string) => {
        setModifiedCloneData(prev => ({
            ...prev,
            [configId]: {
                ...prev[configId],
                [field]: value
            }
        }));
    };

    // 打开克隆模态框时重置修改数据
    const handleOpenCloneModal = () => {
        setModifiedCloneData({});
        setCloneModalVisible(true);
    };

    const handleSubmit = async () => {
        if (!formApi.current) return;
        const values = await formApi.current.validate();
        values.tenant_id = tenantId;
        setOkLoading(true);
        try {
            await ConfigInfoService.add(values);
            refresh();
            setVisible(false);
        } finally {
            setOkLoading(false);
        }
    };

    const openCreateModal = () => {
        setModalType('create');
        setModalRecord(undefined);
        setVisible(true);
    };

    const columns: any[] = [
        {
            title: "Data Id",
            dataIndex: "data_id",
            sorter: (a: any, b: any) => a.data_id.localeCompare(b.data_id),
        },
        {
            title: "Group",
            dataIndex: "group_id",
            sorter: (a: any, b: any) => a.group_id.localeCompare(b.group_id),
        },
        {
            title: "格式",
            dataIndex: "type",
            sorter: (a: any, b: any) => a.type.localeCompare(b.type),
        },
        {
            title: "最后更新时间",
            dataIndex: "create_time",
            sorter: (a: any, b: any) => a.create_time.localeCompare(b.create_time),
        },
        {
            title: "操作",
            dataIndex: "actions",
            align: 'center',
            width: '20%',
            render: (_text: string, record: any) => {
                return (
                    <div className="flex items-center justify-center gap-2">
                        <Link
                            to={`/edit_content?tenant_id=${initialTenantId}&data_id=${record.data_id}&group_id=${record.group_id}`}>
                            <Button type="primary" theme='solid'>编辑</Button>
                        </Link>
                        <Button type="danger" theme='solid' onClick={() => handleDelete(record.config_id)}>删除</Button>
                    </div>
                );
            },
        },
    ];

    return (
        <div>
            <div className="flex flex-col gap-4 p-4">
                {/* 命名空间选择 */}
                <div className="flex flex-col gap-2 p-2">
                    <div
                        className="flex justify-between items-center p-1 rounded-lg shadow-sm bg-[#efefef] dark:bg-gray-800 transition-colors duration-200">
                        {tenantResponse[0].loading ? (
                            <div className="text-sm">加载中...</div>
                        ) : tenantList.length === 0 ? (
                            <div className="text-sm">暂无命名空间</div>
                        ) : (
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: '0px',
                                rowGap: '2px'
                            }}>
                                {tenantList.map((item: any, index: number) => (
                                    <React.Fragment key={item.tenant_id}>
                                        <span
                                            style={{
                                                cursor: 'pointer',
                                                color: tenantId === item.tenant_id ? 'var(--semi-color-primary)' : 'var(--semi-color-text-0)',
                                                padding: '0 4px',
                                                fontSize: '13px',
                                                lineHeight: '16px',
                                                whiteSpace: 'nowrap',
                                            }}
                                            onClick={() => {
                                                setTenantId(item.tenant_id);
                                                const params = new URLSearchParams();
                                                params.set('tenant_id', item.tenant_id);
                                                params.set('pageNum', '1');
                                                params.set('pageSize', pageSize.toString());
                                                setSearchParams(params);
                                                setDataIdInput('');
                                                setGroupIdInput('');
                                                setTypeInput('');
                                                setQueryParams({});
                                                setPage(1);
                                            }}
                                        >
                                            {item.tenant_name}
                                        </span>
                                        {index < tenantList.length - 1 && (
                                            <span style={{
                                                color: 'var(--semi-color-text-3)',
                                                fontSize: '12px',
                                            }}>
                                                |
                                            </span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>)}
                    </div>
                </div>

                {/* 查询区域 */}
                <div className="flex justify-between items-center p-4 rounded-lg shadow-sm">
                    <div className="flex gap-2 h-full items-center">
                        {/* 搜索配置函数 */}
                        {(() => {
                            // 将searchConfig函数定义在组件级别
                            const searchConfig = () => {
                                const newParams = new URLSearchParams(searchParams.toString());
                                newParams.set('pageNum', '1');
                                if (tenantId) newParams.set('tenant_id', tenantId);
                                if (dataIdInput) newParams.set('data_id', dataIdInput);
                                else newParams.delete('data_id');
                                if (groupIdInput) newParams.set('group_id', groupIdInput);
                                else newParams.delete('group_id');
                                if (typeInput) newParams.set('type', typeInput);
                                else newParams.delete('type');
                                setSearchParams(newParams);
                                setQueryParams({
                                    data_id: dataIdInput || undefined,
                                    group_id: groupIdInput || undefined,
                                    type: typeInput || undefined,
                                });
                                setPage(1);
                            };

                            // 暴露searchConfig函数到外部作用域
                            (window as any)._searchConfig = searchConfig;

                            return (
                                <>
                                    <Input value={dataIdInput}
                                           onChange={(value: string | undefined) => setDataIdInput(value || '')}
                                           placeholder='Data Id'
                                           onKeyDown={(e) => {
                                               if (e.key === 'Enter') {
                                                   searchConfig();
                                               }
                                           }}
                                           showClear
                                    />
                                    <Input value={groupIdInput}
                                           onChange={(value: string | undefined) => setGroupIdInput(value || '')}
                                           placeholder='Group'
                                           onKeyDown={(e) => {
                                               if (e.key === 'Enter') {
                                                   searchConfig();
                                               }
                                           }}
                                           showClear
                                    />
                                </>
                            );
                        })()}

                        <Select
                            value={typeInput}
                            onChange={(value) => {
                                setTypeInput(typeof value === 'string' ? value : '');
                            }}
                            style={{width: 400}}
                            placeholder="类型"
                            showClear
                        >
                            <Select.Option value="text">text</Select.Option>
                            <Select.Option value="json">json</Select.Option>
                            <Select.Option value="xml">xml</Select.Option>
                            <Select.Option value="yaml">yaml</Select.Option>
                            <Select.Option value="html">html</Select.Option>
                            <Select.Option value="properties">properties</Select.Option>
                            <Select.Option value="toml">toml</Select.Option>
                        </Select>
                        <Button
                            type="primary"
                            theme="solid"
                            onClick={() => (window as any)._searchConfig?.()}
                        >查询</Button>
                        <Button
                            icon={<IconRefresh/>}
                            type="primary"
                            theme="solid"
                            onClick={() => {
                                const params = new URLSearchParams();
                                if (tenantId) params.set("tenant_id", tenantId);
                                params.set('pageNum', '1');
                                params.set('pageSize', pageSize.toString());
                                setSearchParams(params);

                                setDataIdInput('');
                                setGroupIdInput('');
                                setTypeInput('');
                                setQueryParams({});
                                setPage(1);
                            }}
                        >清空刷新</Button>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="primary"
                            theme="solid"
                            onClick={openCreateModal}
                            disabled={!tenantId}
                        >
                            新增
                        </Button>
                        <Button
                            icon={<IconSearch />}
                            theme="solid"
                            type="secondary"
                            onClick={() => setGlobalSearchVisible(true)}
                        >
                            全局搜索
                        </Button>
                        <Button
                            type="secondary"
                            theme="solid"
                            onClick={() => {
                                setCloneModalVisible(true);
                                handleOpenCloneModal()
                            }}
                            disabled={selectedRows.length === 0}
                        >
                            克隆配置
                        </Button>
                        <Button
                            type="danger"
                            theme="solid"
                            onClick={() => handleBatchDelete()}
                            disabled={selectedRows.length === 0}
                        >
                            批量删除
                        </Button>
                    </div>
                </div>

                {/* 表格 */}
                <div className="rounded-lg shadow-sm p-4">
                    <Table
                        loading={loading}
                        columns={columns}
                        dataSource={(data?.data || []) as ConfigInfo[]}
                        size="small"
                        bordered
                        rowKey="config_id"
                        rowSelection={{
                            selectedRowKeys: selectedRows.map(row => row.config_id),
                            onSelect: (record?: ConfigInfo, selected?: boolean) => {
                                if (!record || selected === undefined) return;
                                if (selected) {
                                    setSelectedRows(prev => [...prev, record]);
                                } else {
                                    setSelectedRows(prev => prev.filter(row => row.config_id !== record.config_id));
                                }
                            },
                            onSelectAll: (selected?: boolean, selectedRows?: ConfigInfo[]) => {
                                if (selected === undefined) return;
                                if (selected && selectedRows) {
                                    setSelectedRows(selectedRows);
                                } else {
                                    setSelectedRows([]);
                                }
                            },
                            getCheckboxProps: (record: ConfigInfo) => ({
                                disabled: false,
                                name: record.config_id,
                            })
                        }}
                        pagination={{
                            pageSize,
                            total: data?.total,
                            currentPage: pageNum,
                            className: 'px-4 mt-4',
                            showSizeChanger: true,
                            hoverShowPageSelect: true,
                            pageSizeOpts: [20, 50, 100],
                            onChange: (page: number, pageSize: number) => {
                                setPage(page);
                                setPageSize(pageSize);
                                const newParams = new URLSearchParams(searchParams.toString());
                                newParams.set('pageNum', page.toString());
                                newParams.set('pageSize', pageSize.toString());
                                setSearchParams(newParams);
                                refresh();
                            },
                        }}
                    />
                </div>
            </div>

            {/* 弹窗 */}
            <Modal
                title={modalType === 'create' ? '新增命名空间' : '编辑命名空间信息'}
                size="large"
                visible={visible}
                onCancel={() => setVisible(false)}
                onOk={handleSubmit}
                okButtonProps={{loading: okLoading}}
            >
                <Form
                    labelPosition='left'
                    labelAlign='left'
                    labelWidth={120}
                    initValues={modalRecord}
                    getFormApi={(api: any) => (formApi.current = api)}
                >
                    <Form.Input
                        field='data_id'
                        label='Data Id'
                        rules={[{required: true, message: '请输入Data Id'}]}
                        showClear
                    />
                    <Form.Input
                        field='group_id'
                        label='Group'
                        rules={[{required: true, message: '请输入Group'}]}
                        showClear
                    />
                </Form>
            </Modal>

            {/* 克隆配置模态框 */}
            <Modal
                title="克隆配置"
                size="large"
                visible={cloneModalVisible}
                onCancel={() => {
                    setCloneModalVisible(false);
                    setModifiedCloneData({});
                }}
                onOk={handleClone}
                okButtonProps={{loading: cloneLoading, disabled: !cloneTargetTenantId}}
            >
                <Form
                    layout="vertical"
                    getFormApi={(api: any) => (cloneFormApi.current = api)}
                >
                    <Form.Select
                        field="target_tenant_id"
                        label="目标命名空间"
                        placeholder="请选择目标命名空间"
                        optionList={tenantList.map((tenant: any) => ({
                            label: tenant.tenant_name || tenant.tenant_id,
                            value: tenant.tenant_id,
                            // 可选：标记当前命名空间
                            style: tenant.tenant_id === tenantId ? {
                                color: 'var(--semi-color-primary)',
                                fontWeight: 'bold'
                            } : {}
                        }))}
                        initValue={cloneTargetTenantId}
                        onChange={(value) => setCloneTargetTenantId(typeof value === 'string' ? value : '')}
                        style={{width: '100%'}}
                        rules={[{required: true, message: '请选择目标命名空间'}]}
                        showClear
                    />

                    <div style={{marginTop: '16px'}}>
                        <h4 style={{marginBottom: '8px'}}>要克隆的配置 ({selectedRows.length} 个):</h4>
                        <div style={{
                            maxHeight: '400px',
                            overflow: 'auto',
                            border: '1px solid var(--semi-color-border)',
                            borderRadius: '4px',
                            padding: '8px'
                        }}>
                            {selectedRows.map((row: ConfigInfo, index: number) => {
                                return (
                                    <div key={row.config_id} style={{
                                        padding: '8px 0',
                                        borderBottom: index < selectedRows.length - 1 ? '1px solid var(--semi-color-border)' : 'none'
                                    }}>
                                        <div style={{display: 'flex', gap: '16px', alignItems: 'flex-end'}}>
                                            <Form.Input
                                                field={`data_id_${row.config_id}`}
                                                label="Data Id"
                                                initValue={row.data_id}
                                                onChange={(value: string | number | any[] | Record<string, any>) => handleCloneInputChange(row.config_id, 'data_id', String(value))}
                                                style={{flex: 1}}
                                                rules={[{required: true, message: '请输入Data Id'}]}
                                            />
                                            <Form.Input
                                                field={`group_id_${row.config_id}`}
                                                label="Group"
                                                initValue={row.group_id}
                                                onChange={(value: string | number | any[] | Record<string, any>) => handleCloneInputChange(row.config_id, 'group_id', String(value))}
                                                style={{flex: 1}}
                                                rules={[{required: true, message: '请输入Group'}]}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Form>
            </Modal>
            <GlobalSearchModal
                visible={globalSearchVisible}
                onCancel={() => setGlobalSearchVisible(false)}
                currentTenantId={tenantId}
            />
        </div>
    );
};

export default ConfigInfoPage;
