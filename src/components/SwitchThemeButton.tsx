import { IconMoon, IconSun, IconMonitorStroked } from "@douyinfe/semi-icons";
import { Button } from "@douyinfe/semi-ui-19";
import { useState, useEffect } from "react";

type ThemeMode = 'light' | 'dark' | 'system';

export default function SwitchThemeButton() {
    // 从 localStorage 初始化状态
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
        const savedMode = localStorage.getItem('theme-mode');
        return (savedMode as ThemeMode) || 'system';
    });

    // 获取系统主题偏好
    const getSystemTheme = (): 'light' | 'dark' => {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    // 计算当前实际主题
    const getCurrentTheme = (): 'light' | 'dark' => {
        if (themeMode === 'system') {
            return getSystemTheme();
        }
        return themeMode;
    };

    // 应用主题
    const applyTheme = (theme: 'light' | 'dark') => {
        const body = document.body;
        if (theme === 'dark') {
            body.setAttribute("theme-mode", "dark");
        } else {
            body.removeAttribute("theme-mode");
        }
    };

    // 组件加载时应用主题
    useEffect(() => {
        applyTheme(getCurrentTheme());
    }, []);

    // 监听主题模式变化
    useEffect(() => {
        applyTheme(getCurrentTheme());
    }, [themeMode]);

    // 监听系统主题变化
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (themeMode === 'system') {
                applyTheme(getCurrentTheme());
            }
        };

        // 添加监听器
        mediaQuery.addEventListener('change', handleChange);

        // 清理函数
        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, [themeMode]);

    // 切换主题模式
    const changeMode = () => {
        let newMode: ThemeMode;
        if (themeMode === 'light') {
            newMode = 'dark';
        } else if (themeMode === 'dark') {
            newMode = 'system';
        } else {
            newMode = 'light';
        }
        setThemeMode(newMode);
        localStorage.setItem('theme-mode', newMode);
    };

    // 获取当前模式显示文本
    const getModeText = (): string => {
        if (themeMode === 'light') {
            return '亮色';
        } else if (themeMode === 'dark') {
            return '暗色';
        } else {
            return '系统';
        }
    };

    // 获取下一个模式显示文本
    const getNextModeText = (): string => {
        if (themeMode === 'light') {
            return '暗色';
        } else if (themeMode === 'dark') {
            return '系统';
        } else {
            return '亮色';
        }
    };

    // 获取当前模式图标
    const getModeIcon = () => {
        if (themeMode === 'light') {
            return <IconSun size="extra-large"/>;
        } else if (themeMode === 'dark') {
            return <IconMoon size="extra-large"/>;
        } else {
            return <IconMonitorStroked size="extra-large"/>;
        }
    };

    const IconButtons = [
        {
            icon: getModeIcon(),
            event: () => changeMode(),
            tip: `当前模式: ${getModeText()}，点击切换到${getNextModeText()}模式`,
        },
    ];

    // 顶部导航右侧icon按钮
    const renderIcons = () => {
        return (
            <div className="flex gap-2 mr-4">
                {IconButtons.map((item, index) => {
                    return (
                        <Button
                            key={index}
                            theme="borderless"
                            icon={item.icon}
                            onClick={item.event}
                            type="tertiary"
                            title={item.tip}
                        />
                    );
                })}
            </div>
        );
    };

    return renderIcons();
}