import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { SimpleApiService } from "@/src/services/simple_api";
import { demoStatusStore } from "@/src/stores/useDemoStatusStore";
import { ConfigInfoService } from "@/src/services/config_info";
import { languageListStore } from "@/src/stores/useLanguageListStore";
import { CONFIG_TYPE_LIST } from "@/src/config";

// 异步获取demo状态并设置到store中
SimpleApiService.get_demo().then(is_demo => {
    demoStatusStore.getState().setDemoStatus(is_demo);
});

// 异步获取语言列表并设置到store中
ConfigInfoService.get_language().then((resp) => {
    let langList: string[] = CONFIG_TYPE_LIST;
    if (Array.isArray(resp)) {
        langList = resp.length > 0 ? resp : CONFIG_TYPE_LIST;
    } else if (resp && resp.languages) {
        langList = resp.languages.length > 0 ? resp.languages : CONFIG_TYPE_LIST;
    }
    languageListStore.getState().setLanguageList(langList);
});

const root = document.getElementById('root');
ReactDOM.createRoot(root as HTMLElement).render(<App />)
