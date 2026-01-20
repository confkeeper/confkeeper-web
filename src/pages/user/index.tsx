import React, { useRef, useState } from "react";
import { Table, Button, Modal, Form, Input, Switch, Select } from "@douyinfe/semi-ui-19";
import useService from "@/src/hooks/useService";
import { ColumnProps } from "@douyinfe/semi-ui-19/lib/es/table";
import { FormApi } from "@douyinfe/semi-ui-19/lib/es/form";
import { IconRefresh } from "@douyinfe/semi-icons";
import { UserService } from "@/src/services/user";
import ChangePasswordModal from "@/src/components/ChangePasswordModal";
import { AddUserParams } from "@/src/api/user/types";
import { getUserid } from "@/src/utils/auth";

const UserPage = () => {
    const [pageSize, setPageSize] = useState<number>(12);
    const [pageNum, setPage] = useState<number>(1);
    const [queryParams, setQueryParams] = useState<{ username?: string; enable?: boolean }>({});
    const [usernameInput, setUsernameInput] = useState<string>('');
    const [enableInput, setEnableInput] = useState<boolean | undefined>(undefined);
    const serviceResponse = useService(() => UserService.list({
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
    const changePasswordRef = useRef<{ open: (userId: string) => void }>(null);

    // 显示弹窗
    const changePasswd = (userId: string) => {
        changePasswordRef.current?.open(userId);
    };

    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这条记录吗？',
            onOk: async () => {
                await UserService.delete({user_id: id});
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
                await UserService.add(values as AddUserParams);
            } else {
                await UserService.update(modalRecord.user_id, values);
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

    const editInfo = (record: any) => {
        setModalType('edit');
        setModalRecord(record);
        setVisible(true);
    };

    const columns: ColumnProps[] = [
        {title: "id", width: '10%', dataIndex: "user_id"},
        {title: "用户名", width: '30%', dataIndex: "username"},
        {
            title: "启用",
            dataIndex: "enable",
            width: '30%',
            render: (text: boolean) => (<Switch checked={text} disabled></Switch>),
        },
        {
            title: "操作",
            dataIndex: "actions",
            align: 'center',
            render: (_text: string, record: any) => {
                return (
                    <div className="flex items-center justify-center gap-2">
                        <Button type="primary" theme='solid' onClick={() => editInfo(record)}>编辑</Button>
                        <Button type="primary" theme='solid'
                                onClick={() => changePasswd(record.user_id)}>修改密码</Button>
                        <Button
                            type="danger"
                            theme="solid"
                            disabled={record.user_id === '1'}
                            onClick={() => handleDelete(record.user_id)}
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
                            value={usernameInput}
                            onChange={value => setUsernameInput(value)}
                            placeholder='用户名'
                            showClear
                        ></Input>
                        <Select
                            value={enableInput === undefined ? undefined : (enableInput ? 'true' : 'false')}
                            onChange={value => setEnableInput(value === 'true')}
                            placeholder='启用状态'
                            style={{width: 250}}
                        >
                            <Select.Option value='true'>启用</Select.Option>
                            <Select.Option value='false'>禁用</Select.Option>
                        </Select>
                        <Button type="primary" theme="solid" onClick={() => {
                            setQueryParams({
                                username: usernameInput || undefined,
                                enable: enableInput
                            });
                            setPage(1);
                        }}>查询</Button>
                        <Button icon={<IconRefresh/>} type="primary" theme="solid" onClick={() => {
                            setQueryParams({});
                            setUsernameInput('');
                            setPage(1);
                        }}>清空刷新</Button>
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
                    modalType === 'create' ? '新增用户' : '编辑用户信息'
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
                        field='username'
                        label='用户名'
                        rules={[{required: true, message: '请输入用户名'}]}
                        showClear
                    />
                    {modalType === 'edit' ? (
                        <>
                            {Number(modalRecord?.user_id) !== 1 && (
                                <Form.Switch
                                    field='enable'
                                    label='启用'
                                />
                            )}
                        </>
                    ) : null}
                </Form>
            </Modal>
            <ChangePasswordModal ref={changePasswordRef}/>
        </div>
    );
};

export default UserPage;
