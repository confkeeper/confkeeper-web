import React, { useRef, useState, useEffect } from "react";
import { Table, Button, Modal, Form, Input, Switch, Select } from "@douyinfe/semi-ui-19";
import useService from "@/src/hooks/useService";
import { ColumnProps } from "@douyinfe/semi-ui-19/lib/es/table";
import { FormApi } from "@douyinfe/semi-ui-19/lib/es/form";
import { IconRefresh } from "@douyinfe/semi-icons";
import { PermissionService } from "@/src/services/permission";
import { RoleService } from "@/src/services/role";
import { TenantService } from "@/src/services/tenant";
import { AddPermissionParams } from "@/src/api/permission/types";
import { getUserid } from "@/src/utils/auth";

const PermissionPage = () => {
    const [pageSize, setPageSize] = useState<number>(12);
    const [pageNum, setPage] = useState<number>(1);
    const [queryParams, setQueryParams] = useState<{ role?: string }>({});
    const [roleInput, setRoleInput] = useState<string>('');
    const serviceResponse = useService(() => PermissionService.list({
        page: pageNum,
        page_size: pageSize, ...queryParams
    }), [pageNum, pageSize, queryParams]);
    const {data, loading} = serviceResponse[0];
    const refresh = serviceResponse[1];
    const [visible, setVisible] = useState(false);
    const [modalType, setModalType] = useState<'create' | 'edit'>('create');
    const [modalRecord, setModalRecord] = useState<any>();
    const [okLoading, setOkLoading] = useState(false)
    const formApi = useRef<FormApi>(null);
    
    // 角色列表和租户列表状态
    const [tenantOptions, setTenantOptions] = useState<any[]>([]);
    const [roleOptions, setRoleOptions] = useState<any[]>([]);

    const handleDelete = async (record: { role: string; resource: string; action: string }) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这条权限记录吗？',
            onOk: async () => {
                await PermissionService.delete({
                    role: record.role,
                    resource: record.resource,
                    action: record.action
                });
                refresh();
            }
        });
    };

    const handleSubmit = async () => {
        if (!formApi.current) return;
        const values = await formApi.current.validate();
        setOkLoading(true);
        try {
            if (modalType === 'create') {
                await PermissionService.add(values as AddPermissionParams);
            }
            refresh();
            setVisible(false);
        } finally {
            setOkLoading(false);
        }
    };

    const openCreateModal = async () => {
        // 点击新增时获取角色列表和租户列表
        try {
            const [roleRes, tenantRes] = await Promise.all([
                RoleService.list({ page: 1, page_size: 100 }),
                TenantService.list({ page: 1, page_size: 100 })
            ]);

            if (roleRes.data) {
                setRoleOptions(roleRes.data.map(role => ({
                    label: role.role,
                    value: role.role
                })));
            }

            if (tenantRes.data) {
                setTenantOptions(tenantRes.data.map(tenant => ({
                    label: tenant.tenant_name,
                    value: tenant.tenant_id
                })));
            }
        } catch (error) {
            console.error('获取数据失败:', error);
        }

        setModalType('create');
        setModalRecord(undefined);
        setVisible(true);
    };

    const editInfo = (record: any) => {
        setModalType('edit');
        setModalRecord(record);
        setVisible(true);
    };

    const columns: ColumnProps[] = [
        { title: "角色", width: '30%', dataIndex: "role" },
        { title: "资源", width: '30%', dataIndex: "resource" },
        {
            title: '权限',
            width: '30%',
            dataIndex: 'action',
            render: (value) => {
                const map = {
                    r: '只读',
                    w: '只写',
                    rw: '读写',
                };
                return map[value as keyof typeof map] || value || '-';
            },
        },
        {
            title: "操作",
            dataIndex: "actions",
            align: 'center',
            render: (_text: string, record: any) => {
                return (
                    <div className="flex items-center justify-center gap-2">
                        <Button
                            type="danger"
                            theme="solid"
                            onClick={() => handleDelete(record)}
                        >
                            删除
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <div>
            <div className="flex flex-col gap-4 p-4">
                <div className="flex justify-between items-center p-4 rounded-lg shadow-sm">
                    <div className="flex gap-2 h-full items-center">
                        <span className="font-bold w-20">查询</span>
                        <Input
                            value={roleInput}
                            onChange={value => setRoleInput(value)}
                            placeholder='角色名'
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setQueryParams({
                                        role: roleInput || undefined,
                                    });
                                    setPage(1);
                                }
                            }}
                        />
                        <Button type="primary" theme="solid" onClick={() => {
                            setQueryParams({
                                role: roleInput || undefined,
                            });
                            setPage(1);
                        }}>查询</Button>
                        <Button icon={<IconRefresh/>} type="primary" theme="solid" onClick={() => {
                            setQueryParams({});
                            setRoleInput('');
                            setPage(1);
                        }}>清空刷新</Button>
                    </div>
                    <div className="flex gap-2">
                        <Button type="primary" theme="solid" onClick={openCreateModal} disabled={getUserid().toString() !== '1'}>新增</Button>
                    </div>
                </div>
                <div className="rounded-lg shadow-sm p-4">
                    <Table
                        loading={loading}
                        columns={columns}
                        dataSource={data?.data || []}
                        size="small"
                        bordered
                        pagination={{
                            pageSize,
                            total: typeof data?.total === "number" ? data?.total : 0,
                            currentPage: pageNum,
                            className: 'px-4 mt-4',
                            showSizeChanger: true,
                            hoverShowPageSelect: true,
                            pageSizeOpts: [20, 50, 100],
                            onChange: (page: number, pageSize: number) => {
                                setPage(page);
                                setPageSize(pageSize);
                                refresh();
                            },
                        }}
                    />
                </div>
            </div>
            <Modal
                title={
                    modalType === 'create' ? '新增权限' : '编辑权限信息'
                }
                size="large"
                visible={visible}
                onCancel={() => setVisible(false)}
                onOk={handleSubmit}
                okButtonProps={{loading: okLoading}}
            >
                <Form
                    labelPosition='left'
                    labelAlign='left'
                    labelWidth={100}
                    initValues={modalRecord}
                    getFormApi={api => formApi.current = api}
                >
                    <Form.Select
                        field='role'
                        label='角色名'
                        rules={[{required: true, message: '请选择角色名'}]}
                        placeholder="请选择角色名"
                        style={{ width: 300 }}
                    >
                        {roleOptions.map(option => (
                            <Select.Option key={option.value} value={option.value}>
                                {option.label}
                            </Select.Option>
                        ))}
                    </Form.Select>
                    <Form.Select
                        field='resource'
                        label='资源'
                        rules={[{required: true, message: '请选择资源'}]}
                        placeholder="请选择资源"
                        style={{ width: 300 }}
                    >
                        {tenantOptions.map(option => (
                            <Select.Option key={option.value} value={option.value}>
                                {option.label}
                            </Select.Option>
                        ))}
                    </Form.Select>
                    <Form.Select
                        field='action'
                        label='操作'
                        rules={[{required: true, message: '请选择操作'}]}
                        placeholder="请选择操作"
                        style={{ width: 300 }}
                    >
                        <Select.Option value="r">r</Select.Option>
                        <Select.Option value="w">w</Select.Option>
                        <Select.Option value="rw">rw</Select.Option>
                    </Form.Select>
                </Form>
            </Modal>
        </div>
    );
};

export default PermissionPage;
