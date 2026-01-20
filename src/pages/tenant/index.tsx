import React, { useRef, useState } from "react";
import { Table, Button, Modal, Form } from "@douyinfe/semi-ui-19";
import useService from "@/src/hooks/useService";
import { ColumnProps } from "@douyinfe/semi-ui-19/lib/es/table";
import { FormApi } from "@douyinfe/semi-ui-19/lib/es/form";
import { TenantService } from "@/src/services/tenant";
import { getUserid } from "@/src/utils/auth";

const TenantPage = () => {
    const [pageSize, setPageSize] = useState<number>(12);
    const [pageNum, setPage] = useState<number>(1);
    const serviceResponse = useService(() => TenantService.list({
        page: pageNum,
        page_size: pageSize
    }), [pageNum, pageSize]);
    const {data, loading} = serviceResponse[0];
    const refresh = serviceResponse[1];
    const [visible, setVisible] = useState(false);
    const [modalType, setModalType] = useState<'create' | 'edit'>('create');
    const [modalRecord, setModalRecord] = useState<any>();
    const [okLoading, setOkLoading] = useState(false)
    const formApi = useRef<FormApi>(null);

    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这条记录吗？',
            onOk: async () => {
                await TenantService.delete({tenant_id: id});
                refresh();
            }
        });
    };

    const handleSubmit = async () => {
        if (!formApi.current) return;
        const values = await formApi.current.validate();
        setOkLoading(true);
        try {
            await TenantService.add(values);
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

    const editInfo = (record: any) => {
        setModalType('edit');
        setModalRecord(record);
        setVisible(true);
    };

    const columns: ColumnProps[] = [
        {
            title: "命名空间ID",
            dataIndex: "tenant_id",
            render: (text: string) => (
                <div className="flex items-center">
                    <span className="font-medium">{text}</span>
                </div>
            ),
        },
        {
            title: "命名空间名称",
            dataIndex: "tenant_name",
            render: (text: string) => (
                <div className="flex items-center">
                    <span className="font-medium">{text}</span>
                </div>
            ),
        },
        {
            title: "描述",
            dataIndex: "tenant_desc",
            render: (text: string) => (
                <div className="flex items-center">
                    <span className="font-medium">{text}</span>
                </div>
            ),
        },
        {
            title: "操作",
            dataIndex: "actions",
            align: 'center',
            render: (_text: string, record: any) => {
                return (
                    <div className="flex items-center justify-center gap-2">
                        <Button type="danger" theme='solid' onClick={() => handleDelete(record.id)}>删除</Button>
                    </div>
                );
            },
        },
    ];

    return (
        <div>
            <div className="flex flex-col gap-4 p-4">
                <div className="flex justify-between items-center p-4 rounded-lg shadow-sm">
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
                            total: data?.total,
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
                    modalType === 'create' ? '新增命名空间' : '编辑命名空间信息'
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
                    labelWidth={120}
                    initValues={modalRecord}
                    getFormApi={api => formApi.current = api}
                >
                    <Form.Input
                        field='tenant_id'
                        label='命名空间ID'
                        rules={[{required: true, message: '请输入命名空间ID'}]}
                        showClear
                    />
                    <Form.Input
                        field='tenant_name'
                        label='命名空间名称'
                        rules={[{required: true, message: '请输入命名空间名称'}]}
                        showClear
                    />
                    <Form.Input
                        field='tenant_desc'
                        label='描述'
                        rules={[{required: true, message: '请输入描述'}]}
                        showClear
                    />
                </Form>
            </Modal>
        </div>
    );
};

export default TenantPage;
