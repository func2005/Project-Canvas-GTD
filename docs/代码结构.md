# Project Canvas GTD - 代码规范 (Coding Guidelines)

**目标**: 统一团队开发风格，降低维护成本，提升代码质量。

---

## 1. Git 分支管理策略 (Git Workflow)

我们采用简化版的 **Git Flow** 模式，适应快速迭代。

### 1.1 分支类型

| 分支名 | 说明 | 示例 |
| :--- | :--- | :--- |
| **`main`** | (Protected) 生产环境稳定分支。仅允许从 `develop` 或 `hotfix/*` 合并。 | `main` |
| **`develop`** | (Protected) 开发主干。包含最新功能。所有 Feature 分支均从此迁出。 | `develop` |
| **`feature/*`** | 功能分支。开发新功能使用。 | `feature/canvas-drag`, `feature/auth-login` |
| **`bugfix/*`** | 修复分支。修复非紧急 Bug。 | `bugfix/widget-rendering` |
| **`hotfix/*`** | 热修复分支。修复 `main` 上的紧急 Bug。 | `hotfix/v1.0.1-login-crash` |

### 1.2 工作流程

1.  从 `develop` 拉取新分支: `git checkout -b feature/my-cool-feature develop`
2.  开发并提交代码 (遵循 Commit 规范)。
3.  推送到远程: `git push origin feature/my-cool-feature`
4.  发起 Pull Request (PR) 到 `develop`。
5.  Code Review 通过后合并。

---

## 2. Commit Message 规范

本项目严格遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 2.1 格式
`<type>(<scope>): <subject>`

### 2.2 Type 类型列表

| Type | 说明 |
| :--- | :--- |
| **feat** | 新功能 (A new feature) |
| **fix** | Bug 修复 (A bug fix) |
| **docs** | 文档变更 (Documentation only changes) |
| **style** | 格式调整，不影响逻辑 (White-space, formatting, etc) |
| **refactor** | 代码重构 (A code change that neither fixes a bug nor adds a feature) |
| **perf** | 性能优化 (A code change that improves performance) |
| **test** | 测试相关 (Adding missing tests or correcting existing tests) |
| **chore** | 构建/工具/依赖更新 (Changes to the build process or auxiliary tools) |

### 2.3 示例
*   `feat(client): add drag and drop support for calendar widgets`
*   `fix(server): resolve db connection timeout issue`
*   `docs: update API specifications`
*   `refactor(auth): simplify jwt strategy`

---

## 3. 目录结构说明 (Directory Structure)

简化版 FSD 结构

```
/
├── apps/
│   ├── client/              # 前端应用 (React + Vite)
│   │   ├── src/
│   │   │   ├── app/         # 路由与布局根组件
│   │   │   ├── features/    # 业务特性模块
│   │   │   ├── shared/      # 共享资源 (Types, Utils, Hooks)
│   │   │   │   └── api/     # RxDB 数据库定义与 Sync 逻辑
│   │   │   └── widgets/     # 核心功能组件 (画板上的主要元素)
│   │   │       ├── canvas/  # 画布容器逻辑
│   │   │       └── components/ # 基础原子组件
│   └── server/              # 后端应用 (NestJS)
│       ├── src/
│       │   ├── common/      # 公共守卫、过滤器、拦截器
│       │   ├── database/    # TypeORM 实体定义
│       │   └── modules/     # 业务模块
│       │       ├── auth/    # 认证模块
│       │       ├── items/   # 核心数据项模块
│       │       ├── sync/    # 数据同步模块
│       │       └── tasks/   # 定时任务模块
├── packages/                # 共享包 (Workspace Packages)
│   ├── shared-types/        # 前后端共用的 TypeScript 类型定义
│   ├── logic/               # 纯业务逻辑 (复用算法)
│   └── ui-kit/              # 基础 UI 组件库 (Buttons, Inputs)
├── docker-compose.yml       # Docker 编排文件
└── package.json             # Root 依赖管理
```

---

## 4. 命名约定 (Naming Conventions)

### 4.1 文件与目录
*   **普通文件/目录**: `kebab-case` (短横线命名)。
    *   Example: `user-profile.tsx`, `auth.controller.ts`, `data-item.entity.ts`
*   **React 组件文件**: 若文件仅包含一个组件且为 Default Export，允许使用 `PascalCase`，但在本项目中推荐与 NextJS/NestJS 保持一致，优先使用 `kebab-case`，组件名在文件内使用 `PascalCase`。
    *   *Current Best Practice here*: `WidgetWrapper.tsx` (Pascal) for React Components, `file-name.ts` (kebab) for utilities.

### 4.2 代码标识符

| 实体 | 命名风格 | 示例 |
| :--- | :--- | :--- |
| **Class** | PascalCase | `class AuthController {}` |
| **Interface / Type** | PascalCase | `interface UserProfile {}` |
| **React Component** | PascalCase | `const TaskItem = () => {}` |
| **Variable / Function** | camelCase | `const userEmail = ...`, `function getUser()` |
| **Constant** | UPPER_SNAKE_CASE | `const MAX_RETRY_COUNT = 3;` |
| **Database Table** | snake_case | `data_items`, `user_settings` |
| **JSON Property** | snake_case | `{ "user_id": "...", "created_at": "..." }` (为了与 DB 保持一致) |

### 4.3 若有冲突
*   前端代码中，若直接处理 API 返回的数据，允许暂时保留 `snake_case` 属性名。
*   若进行转换，应在 Interface定义中明确映射关系 (如 `camelCase` 属性对应)。

---

## 5. 最佳实践 (Best Practices)

1.  **Local-First First**: 在前端写逻辑时，优先考虑“如果断网了会怎样”。数据优先写入 RxDB，而不是直接调 API。
2.  **Explicit Types**: 尽量避免 `any`。利用 `packages/shared-types` 共享类型定义。
3.  **Component Co-location**: 组件相关的样式、测试、子组件尽量靠近该组件存放，而不是分散在全局目录。
