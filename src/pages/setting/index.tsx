import React, { useState } from "react";
import { Card, Button, Modal, Space, Typography } from "@douyinfe/semi-ui-19";
import { IconDelete, IconSetting } from "@douyinfe/semi-icons";
import { ConfigInfoService } from "@/src/services/config_info";

const { Title, Text } = Typography;

const SettingPage = () => {
    const [cleanupModalVisible, setCleanupModalVisible] = useState(false);
    const [cleanupLoading, setCleanupLoading] = useState(false);

    const handleCleanup = async () => {
        setCleanupLoading(true);
        try {
            const success = await ConfigInfoService.cleanup();
            if (success) {
                setCleanupModalVisible(false);
            }
        } finally {
            setCleanupLoading(false);
        }
    };

    return (
        <div className="p-6 bg-(--semi-color-bg-1) min-h-screen">
            <div className="w-[90%] mx-auto">
                <Title heading={3} className="mb-6">
                    <IconSetting className="mr-2" />
                    系统设置
                </Title>

                <Space vertical className="w-full mt-5">
                    {/* 配置管理卡片 */}
                    <Card
                        title={
                            <div className="flex items-center">
                                <IconDelete className="mr-2 text-red-500" />
                                配置管理
                            </div>
                        }
                        className="shadow-sm hover:shadow-md transition-shadow w-full"
                    >
                        <div className="space-y-4">
                            <div>
                                <Title heading={4} className="!mb-2">清理旧配置</Title>
                                <Text type="secondary" className="block mb-4">
                                    清理系统中过期的配置数据，释放存储空间。此操作不可恢复，请谨慎操作。
                                </Text>
                                
                                <Button
                                    type="danger"
                                    theme="solid"
                                    icon={<IconDelete />}
                                    onClick={() => setCleanupModalVisible(true)}
                                    className="hover:scale-105 transition-transform"
                                >
                                    清理旧配置
                                </Button>
                            </div>

                        </div>
                    </Card>

                </Space>
            </div>

            {/* 清理确认弹窗 */}
            <Modal
                title={
                    <div className="flex items-center text-red-600">
                        <IconDelete className="mr-2" />
                        确认清理旧配置
                    </div>
                }
                visible={cleanupModalVisible}
                onCancel={() => setCleanupModalVisible(false)}
                onOk={handleCleanup}
                okButtonProps={{ 
                    loading: cleanupLoading,
                    type: 'danger'
                }}
                cancelButtonProps={{ disabled: cleanupLoading }}
                centered
                size="small"
            >
                <div className="text-center py-4">
                    <IconDelete 
                        size="extra-large" 
                        className="text-yellow-500 mb-4" 
                    />
                    <Title heading={4} className="!mb-2 text-gray-800">
                        确定要清理旧配置吗？
                    </Title>
                    <Text type="secondary" className="block mb-4">
                        此操作将删除系统中所有过期的配置数据，释放存储空间。
                    </Text>
                    <Text type="danger" strong>
                        注意：此操作不可撤销，请确保您已备份重要数据。
                    </Text>
                </div>
            </Modal>
        </div>
    );
};

export default SettingPage;
