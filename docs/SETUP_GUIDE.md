# Project Canvas GTD - 环境配置指南 (Setup & Configuration)

**目标**: 帮助新成员在 10 分钟内完成本地开发环境搭建。

---

## 1. 依赖服务说明 (Prerequisites)

在开始之前，请确保你的机器已经安装了以下工具：

| 工具名称 | 推荐版本 | 说明 |
| :--- | :--- | :--- |
| **Node.js** | `v20.x` (LTS) | `package.json` 锁定 `npm@10.0.0`。 |
| **Docker** | `24.x` + | 必须包含 Docker Compose V2。 |
| **PostgreSQL**| `15.x` | 本地开发可选 (Docker已内置)。推荐安装 PgAdmin 或 DBeaver。 |

---

## 2. 环境变量 (.env)

项目根目录的 `.env` 文件是 Docker Compose 的主要配置源。

**Action**: 复制 `.env.example` (若无则参照下表) 到 `.env`。

| 变量名 | 默认值 / 示例 | 作用说明 |
| :--- | :--- | :--- |
| **DB_PASSWORD** | `canvas_password` | **核心**: PostgreSQL 数据库密码。对应 Docker 容器内的 `POSTGRES_PASSWORD`。 |
| **JWT_SECRET** | `please_change_this...` | **安全**: 用于签署 Auth Token 的密钥。生产环境**严禁**使用默认值。 |
| **DB_HOST** | `postgres` | 数据库主机名 (Docker 内网 DNS)。本地调试 Server 时改为 `localhost`。 |
| **DB_PORT** | `5432` | 数据库端口。 |
| **DB_USERNAME** | `canvas_user` | 数据库用户名。 |
| **DB_DATABASE** | `project_canvas` | 数据库名称。 |

---

## 3. 快速启动 (Quick Start with Docker)

这是最推荐的启动方式，一键拉起 Database, Backend Server (API) 和 Frontend Client (Nginx)。

1.  **构建并启动**:
    ```bash
    docker-compose up --build -d
    ```

2.  **验证服务**:
    *   **Frontend**: 访问 `http://localhost:80` (由 Nginx 承载)。
    *   **Backend API**: 访问 `http://localhost:80/api` (由 Nginx 转发到 `server:3000`)。
    *   **Database**: 端口 `5432` 已暴露到宿主机。连接地址: `postgres://canvas_user:canvas_password@localhost:5432/project_canvas`。

3.  **停止服务**:
    ```bash
    docker-compose down
    ```

---

## 4. 本地开发模式 (Local Development)

如果你需要修改代码并看到即时反馈 (HMR)，请按以下步骤操作：

### 4.1 启动基础设施 (DB Only)
我们仍然建议用 Docker 跑数据库，但这不需要跑整个全家桶。

```bash
# 只启动 postgres 服务
docker-compose up -d postgres
```

### 4.2 启动后端 (Server)

1.  进入 Server 目录:
    ```bash
    cd apps/server
    ```
2.  修改临时配置 (或设置临时的 shell 环境变量) 指向本地 DB:
    *   确保 `src/app.module.ts` 或 `.env` 中 `DB_HOST` 为 `localhost`。
3.  启动开发服务器:
    ```bash
    npm run start:dev
    # 服务将运行在 http://localhost:3000
    ```

### 4.3 启动前端 (Client)

1.  进入 Client 目录:
    ```bash
    cd apps/client
    ```
2.  启动 Vite 开发服务器:
    ```bash
    npm run dev
    # 服务将运行在 http://localhost:5173 (默认 Vite 端口)
    ```
3.  **注意**: 本地 Vite 默认会代理 `/api` 到 `http://localhost:3000` (需检查 `vite.config.ts` 代理配置)，确保前后端能通信。

---

## 5. 常见问题 (Troubleshooting)

*   **Q: Server 报错 `Connection refused`?**
    *   A: 检查 `DB_HOST`。在 Docker 内部它应该是 `postgres` (服务名)，在宿主机运行 `npm run start:dev` 时它应该是 `localhost`。

*   **Q: Nginx 返回 502 Bad Gateway?**
    *   A: 后端 Server 容器还没启动完全。NestJS 启动需要几秒钟，请通过 `docker logs project_canvas_server` 查看日志。

*   **Q: 数据库连接失败?**
    *   A: 确保端口 `5432` 没有被本地其他的 Postgres 实例占用。如有冲突，修改 `docker-compose.yml` 中的端口映射，例如 `"5433:5432"`。
