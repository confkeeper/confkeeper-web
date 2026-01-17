import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import MonacoEditorWebpackPlugin from "monaco-editor-webpack-plugin";
import path from 'path';
// @ts-ignore
import { APP_NAME } from "./src/config";

let ENV_url: string;

try {
    const {ENV_url: importedUrl} = require('./url.config');
    ENV_url = importedUrl;
} catch (error) {
    // 如果导入文件失败，将 ENV_url 设置为空字符串
    console.error('没有url.config.js文件:', error);
    ENV_url = '';
}

export default defineConfig({
    source: {
        entry: {
            index: './src/main.tsx'
        },
    },
    html: {
        title: APP_NAME,
        favicon: './public/confkeeper.svg',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './')
        }
    },
    plugins: [pluginReact(), pluginSass()],
    tools: {
        rspack: {
            plugins: [new MonacoEditorWebpackPlugin({
                languages: ['json', 'html', 'xml', 'yaml', 'html', 'ini'],
                globalAPI: true,
            })],
            ignoreWarnings: [
                {
                    module: /monaco-editor[\\/]esm[\\/]vs[\\/]editor[\\/]common[\\/]services/,
                    message: /Critical dependency/
                }
            ]
        },
    },
    server: {
        proxy: {
            '/api': {
                target: ENV_url,
                changeOrigin: true,
            }
        }
    },
    output: {
        module: true,
        legalComments: 'none',
        distPath: {
            root: 'dist',
            js: '',
            jsAsync: '',
            css: '',
            cssAsync: '',
            image: '',
            font: '',
            svg: '',
            favicon: '',
            assets: '',
        },
        inlineScripts({size}) {
            return size < 10 * 1000;
        },
    },
    performance: {
        printFileSize: {
            diff: true,
        },
    },
});
