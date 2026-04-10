# ConfKeeper 规范

## 一、项目定位
ConfKeeper：配置管理系统（集中管理 + 版本控制）

## 二、核心技术栈
- React + TypeScript
- Semi UI + Tailwind CSS
- Zustand（状态管理）
- Alova（请求）
- React Router
- Monaco Editor
- 构建：Rsbuild
- 包管理：pnpm（必须）

## 三、核心目录结构
src/
├── api/        # API定义（类型 + 请求）
├── services/   # 业务封装
├── stores/     # Zustand状态
├── pages/      # 页面
├── components/ # 通用组件
├── hooks/      # 自定义Hook（useService）
├── router/     # 路由
├── utils/      # 工具

核心调用链：
页面 → services → api → request

## 四、核心开发规范

### 1. API调用（必须用 useService）
const [state, refresh] = useService(() => Service.list(params), [deps]);

禁止：
useEffect + fetch 直调接口

---

### 2. 分层规范
- api：只写请求 + 类型
- services：组合业务逻辑
- pages：只处理UI和交互

---

### 3. 状态管理（Zustand）
- 全局状态放 stores
- Token 只存 store（不要用 localStorage）

---

### 4. UI规范
- 必须使用 Semi UI
- 样式优先 Tailwind
- 禁止原生HTML替代UI库组件

---

### 5. 表单规范
- 使用 Semi Form
- 必加：maskClosable={false}
- 使用 FormApi 做校验

---

### 6. 错误处理
try {
await action();
} catch {
Toast.error('操作失败');
}

---

### 7. 权限
- 使用 useAuthStore
- userId === '1' 为管理员

---

## 五、命名规范

- 组件：PascalCase
- 页面目录：snake_case
- 函数：camelCase
- 常量：UPPER_SNAKE_CASE
- 类型/interface：PascalCase

---

## 六、开发流程

### 新功能
1. api/{module}
2. services/{module}
3. pages/{module}
4. router 注册

### 新组件
components/ 下创建 + 定义类型

---

## 七、最佳实践

- 组件保持小而单一职责
- 所有数据必须有类型
- 所有接口必须有错误处理
- 使用 Toast 提示用户
- 用 useMemo/useCallback 做优化
- 统一使用 pnpm（禁止 npm/yarn）

---

## 八、关键约束（必须遵守）

- 禁止直接 fetch
- 禁止 any
- 禁止 localStorage 存 token
- 禁止绕过 services 层
- 禁止不用 Semi UI

- 必须 useService
- 必须 TypeScript 类型完整
- 必须分层清晰

---