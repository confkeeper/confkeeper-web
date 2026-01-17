<h1 align="center">confkeeper</h1>

此项目是[confkeeper](https://github.com/confkeeper/confkeeper)的前端项目

## 技术栈

- [React](https://react.dev/)

- [TypeScript](https://www.typescriptlang.org/)

- [semi-ui](https://semi.design/zh-CN/)

- [tailwindcss](https://tailwindcss.com/)

- [zustand](https://zustand-demo.pmnd.rs/)

- [alova](https://alova.js.org/zh-CN/)

## 项目目录

```tree
.
├── src
    ├── api                     # 所有请求
    ├── components              # 全局公用组件
    ├── config                  # 全局配置
    ├── hooks                   # 全局hook
    ├── pages                   # 页面
    ├── router                  # 路由
    ├── services                # 请求封装
    ├── stores                  # 全局store
    └── utils                   # 全局工具类
        ├── auth.ts             # 权限管理
        └── request.ts          # 请求封装
```

## 启动

需要先创建一个`url.config.ts`文件(url配置模板)：

```ts
const ENV: number = 2
let ENV_url: string = ''
if (ENV === 1) {
    ENV_url = 'http://127.0.0.1:8888'
}else if (ENV === 2) {
    ENV_url = 'https://xxx.top'
}
module.exports = {
    ENV_url
};
```

