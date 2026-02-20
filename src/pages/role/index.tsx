import React, { useRef, useState } from "react";
import { Table, Button, Modal, Form, Tag } from "@douyinfe/semi-ui-19";
import useService from "@/src/hooks/useService";
import { ColumnProps } from "@douyinfe/semi-ui-19/lib/es/table";
import { FormApi } from "@douyinfe/semi-ui-19/lib/es/form";
import { IconRefresh } from "@douyinfe/semi-icons";
import { RoleService } from "@/src/services/role";
import { UserService } from "@/src/services/user";
import { AddRoleParams, EditRoleParams, RoleInfo } from "@/src/api/role/types";
import { getUserid } from "@/src/utils/auth";
import { UserInfo } from "@/src/api/user/types";

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
    const [modalType, setModalType] = useState<'create' | 'edit'>('create');
    const [modalRecord, setModalRecord] = useState<RoleInfo | undefined>();
    const [okLoading, setOkLoading] = useState(false)
    const formApi = useRef<FormApi>(null);

    const [userList, setUserList] = useState<UserInfo[]>([]);
    const [userPage, setUserPage] = useState(1);
    const [userTotal, setUserTotal] = useState(0);
    const [userLoading, setUserLoading] = useState(false);

    const fetchUserList = async (page: number = 1, reset: boolean = false) => {
        if (userLoading) return;
        setUserLoading(true);
        try {
            const res = await UserService.list({page, page_size: 50});
            if (res.data) {
                if (reset) {
                    setUserList(res.data);
                } else {
                    setUserList(prev => {
                        const newUsers = res.data || [];
                        const existingIds = new Set(prev.map(u => u.username));
                        return [...prev, ...newUsers.filter(u => !existingIds.has(u.username))];
                    });
                }
                setUserTotal(res.total || 0);
                setUserPage(page);
            }
        } finally {
            setUserLoading(false);
        }
    };

    const handleUserScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        if (target.scrollTop + target.clientHeight >= target.scrollHeight - 10) {
            if (userList.length < userTotal && !userLoading) {
                fetchUserList(userPage + 1);
            }
        }
    };

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

    const handleEdit = async (record: RoleInfo) => {
        setModalType('edit');
        setModalRecord({...record});
        setVisible(true);
        setUserList([]);
        fetchUserList(1, true);
    };

    const handleSubmit = async () => {
        if (!formApi.current) return;
        const values = await formApi.current.validate();
        setOkLoading(true);
        try {
            if (modalType === 'create') {
                await RoleService.add({role: values.role, usernames: values.usernames} as AddRoleParams);
            } else {
                await RoleService.edit({role: values.role, usernames: values.usernames} as EditRoleParams);
            }
            refresh();
            setVisible(false);
        } finally {
            setOkLoading(false);
        }
    };

    const openCreateModal = async () => {
        setModalType('create');
        setModalRecord(undefined);
        setVisible(true);
        setUserList([]);
        fetchUserList(1, true);
    };

    const columns: ColumnProps[] = [
        {title: "角色名", width: '30%', dataIndex: "role"},
        {
            title: "包含用户",
            width: '50%',
            dataIndex: "usernames",
            render: (usernames: string[]) => {
                return (
                    <div className="flex flex-wrap gap-1">
                        {usernames?.map(u => <Tag key={u} color="blue">{u}</Tag>)}
                    </div>
                );
            }
        },
        {
            title: "操作",
            dataIndex: "actions",
            align: 'center',
            render: (_text: string, record: RoleInfo) => {
                const isAdmin = getUserid().toString() === '1';
                return (
                    <div className="flex items-center justify-center gap-2">
                        <Button
                            type="primary"
                            theme="light"
                            onClick={() => handleEdit(record)}
                            disabled={!isAdmin}
                        >
                            编辑
                        </Button>
                        <Button
                            type="danger"
                            theme="solid"
                            onClick={() => handleDelete(record.role)}
                            disabled={!isAdmin}
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
                    modalType === 'create' ? '新增角色' : '编辑角色成员'
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
                        disabled={modalType === 'edit'}
                        showClear
                    />
                    <Form.Select
                        field='usernames'
                        label={modalType === 'create' ? '用户名' : '包含用户'}
                        multiple
                        rules={[{required: true, message: '请选择至少一个用户'}]}
                        style={{width: '100%'}}
                        optionList={userList.map(u => ({label: u.username, value: u.username}))}
                        onListScroll={handleUserScroll}
                    />
                </Form>
            </Modal>
        </div>
    );
};

export default RolePage;

