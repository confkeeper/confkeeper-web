import React, { useRef, useState } from "react";
import { Table, Button, Modal, Form } from "@douyinfe/semi-ui-19";
import useService from "@/src/hooks/useService";
import { ColumnProps } from "@douyinfe/semi-ui-19/lib/es/table";
import { FormApi } from "@douyinfe/semi-ui-19/lib/es/form";
import { IconRefresh } from "@douyinfe/semi-icons";
import { RoleService } from "@/src/services/role";
import { AddRoleParams } from "@/src/api/role/types";
import { getUserid } from "@/src/utils/auth";

const RolePage = () => {
    const [pageSize, setPageSize] = useState<number>(12);
    const [pageNum, setPage] = useState<number>(1);
    const [queryParams, setQueryParams] = useState<{}>({});
    const serviceResponse = useService(() => RoleService.list({
        page: pageNum,
        page_size: pageSize, ...queryParams
    }), [pageNum, pageSize, queryParams]);
    const {data, loading} = serviceResponse[0];
    const refresh = serviceResponse[1];
    const [visible, setVisible] = useState(false);
    const [modalType, setModalType] = useState<'create'>('create');
    const [modalRecord, setModalRecord] = useState<any>();
    const [okLoading, setOkLoading] = useState(false)
    const formApi = useRef<FormApi>(null);

    const handleDelete = async (role: string) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这个角色吗？',
            onOk: async () => {
                await RoleService.delete({role});
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
                await RoleService.add(values as AddRoleParams);
            }
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

    const columns: ColumnProps[] = [
        {title: "角色名", width: '40%', dataIndex: "role"},
        {title: "用户名", width: '40%', dataIndex: "username"},
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
                            onClick={() => handleDelete(record.role)}
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
                        <Button icon={<IconRefresh/>} type="primary" theme="solid" onClick={() => {
                            setQueryParams({});
                            setPage(1);
                        }}>刷新</Button>
                    </div>
                    <div className="flex gap-2">
                        <Button type="primary" theme="solid" onClick={openCreateModal}
                                disabled={getUserid().toString() !== '1'}>新增</Button>
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
                    modalType === 'create' ? '新增角色' : '编辑角色信息'
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
                    <Form.Input
                        field='role'
                        label='角色名'
                        rules={[{required: true, message: '请输入角色名'}]}
                        showClear
                    />
                    <Form.Input
                        field='username'
                        label='用户名'
                        rules={[{required: true, message: '请输入用户名'}]}
                        showClear
                    />
                </Form>
            </Modal>
        </div>
    );
};

export default RolePage;
