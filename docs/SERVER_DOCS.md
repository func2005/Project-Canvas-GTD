# Project Canvas GTD - Server Documentation (v6.0)

## 1. 架构概览 (Architecture Overview)

本项目采用 **Local-First (本地优先)** 架构，服务端主要扮演 **数据备份 (Backup)**、**多端同步 (Sync)** 和 **冲突裁决 (Conflict Resolution)** 的角色，而非传统的 CRUD 中心。

*   **Framework**: NestJS
*   **Database**: PostgreSQL (with `pgcrypto` extension)
*   **ORM**: TypeORM
*   **Auth**: JWT (Access Token + Refresh Token)

---

## 2. 数据库设计 (Database Schema)

数据库设计遵循 v6.0 标准，包含 7 张核心表，分为三大模块。

### 2.1 账户与安全 (Auth & Identity)

#### Table: `users`
**描述**: 租户根节点，存储用户基本信息和全局配置。

| 字段名 (Field Name) | 类型 (Type) | 介绍 (Description) |
| :--- | :--- | :--- |
| `id` | UUID | 主键，自动生成 (Primary Key) |
| `email` | VARCHAR | 邮箱，唯一索引 (Unique Index) |
| `password_hash` | VARCHAR | 密码哈希 (Argon2/Bcrypt)，默认不查询 (`select: false`) |
| `nickname` | VARCHAR | 用户昵称 (Nullable) |
| `avatar_url` | VARCHAR | 头像链接 (Nullable) |
| `settings` | JSONB | 全局偏好设置 (如主题、每周开始日)，默认为 `{}` |
| `is_active` | BOOLEAN | 账户是否激活，默认为 `true` |
| `last_login_at` | TIMESTAMP | 最后登录时间 (Nullable) |
| `created_at` | TIMESTAMP | 创建时间，自动生成 |
| `updated_at` | TIMESTAMP | 更新时间，自动更新 |

#### Table: `refresh_tokens`
**描述**: 存储 JWT Refresh Token，用于长效登录和安全撤销。

| 字段名 (Field Name) | 类型 (Type) | 介绍 (Description) |
| :--- | :--- | :--- |
| `id` | UUID | 主键，自动生成 (Primary Key) |
| `user_id` | UUID | 外键 -> `users.id`，级联删除 (Cascade Delete) |
| `token_hash` | VARCHAR | Token 哈希值，索引 (Index) |
| `expires_at` | TIMESTAMP | 过期时间 |
| `is_revoked` | BOOLEAN | 是否已撤销，默认为 `false` |
| `device_info` | VARCHAR | 设备信息 (如 "Chrome on Mac") (Nullable) |
| `created_ip` | VARCHAR | 创建时的 IP 地址 (Nullable) |
| `created_at` | TIMESTAMP | 创建时间，自动生成 |

#### Table: `devices`
**描述**: 记录用户的多端会话信息，用于同步审计。

| 字段名 (Field Name) | 类型 (Type) | 介绍 (Description) |
| :--- | :--- | :--- |
| `id` | UUID | 主键，自动生成 (Primary Key) |
| `user_id` | UUID | 外键 -> `users.id`，级联删除 (Cascade Delete) |
| `client_id` | VARCHAR | RxDB 生成的唯一客户端 ID |
| `user_agent` | TEXT | 浏览器/设备 User Agent (Nullable) |
| `platform` | VARCHAR | 平台类型 (web, ios, android) (Nullable) |
| `last_seen_at` | TIMESTAMP | 最后活跃时间，默认为当前时间 |
| `last_sync_ip` | VARCHAR | 最后同步时的 IP 地址 (Nullable) |
| `created_at` | TIMESTAMP | 创建时间，自动生成 |

### 2.2 结构容器 (Structure)

#### Table: `canvas_pages`
**描述**: 视图容器，存储用户的看板页面元数据。

| 字段名 (Field Name) | 类型 (Type) | 介绍 (Description) |
| :--- | :--- | :--- |
| `id` | UUID | 主键，自动生成 (Primary Key) |
| `user_id` | UUID | 外键 -> `users.id` |
| `is_default` | BOOLEAN | 是否为默认首页，默认为 `false` |
| `viewport_config` | JSONB | 视口配置 (位置、缩放)，默认为 `{}` |
| `created_at` | TIMESTAMP | 创建时间，自动生成 |
| `updated_at` | TIMESTAMP | 更新时间，自动更新 |
| `deleted` | BOOLEAN | 软删除标记，默认为 `false` |

### 2.3 业务与同步 (Business & Sync)

所有此类表均包含 `updated_at` (精度3) 和复合索引 `(user_id, updated_at, id)` 以支持增量同步。

#### Table: `data_items`
**描述**: 存储 GTD 核心业务实体 (Task, Project, Event)。

| 字段名 (Field Name) | 类型 (Type) | 介绍 (Description) |
| :--- | :--- | :--- |
| `id` | UUID | 主键，自动生成 (Primary Key) |
| `user_id` | UUID | 所属用户 ID |
| `entity_type` | VARCHAR(20) | 实体类型 ('task', 'event', 'project') |
| `title` | TEXT | 标题 (Nullable) |
| `system_status` | VARCHAR(20) | 系统状态 ('active', 'completed', 'archived')，默认为 'active' |
| `do_date` | DATE | 执行日期 (软时间) (Nullable) |
| `due_date` | TIMESTAMP | 截止时间 (死线) (Nullable) |
| `start_time` | TIMESTAMP | 开始时间 (日程硬时间) (Nullable) |
| `end_time` | TIMESTAMP | 结束时间 (日程硬时间) (Nullable) |
| `parent_id` | UUID | 父级 ID (指向 Project 或 Event) (Nullable) |
| `properties` | JSONB | 扩展属性 (Markdown, 优先级, 标签)，默认为 `{}` |
| `sort_order` | NUMERIC | 排序权重 (Nullable) |
| `updated_at` | TIMESTAMP(3) | 更新时间 (毫秒精度)，用于同步冲突解决 |
| `deleted` | BOOLEAN | 软删除标记，默认为 `false` |

#### Table: `canvas_widgets`
**描述**: 存储看板上的视图组件配置。

| 字段名 (Field Name) | 类型 (Type) | 介绍 (Description) |
| :--- | :--- | :--- |
| `id` | UUID | 主键，自动生成 (Primary Key) |
| `user_id` | UUID | 所属用户 ID |
| `canvas_id` | UUID | 外键 -> `canvas_pages.id`，级联删除 |
| `widget_type` | VARCHAR(30) | 组件类型 ('calendar_master', 'smart_list', etc.) |
| `geometry` | JSONB | 几何属性 {x, y, w, h, z} |
| `data_source_config` | JSONB | 数据源配置 (过滤器、排序规则) |
| `view_state` | JSONB | 视图状态 (锁定、模式)，默认为 `{}` |
| `updated_at` | TIMESTAMP(3) | 更新时间 (毫秒精度)，用于同步冲突解决 |
| `deleted` | BOOLEAN | 软删除标记，默认为 `false` |

#### Table: `canvas_links`
**描述**: 存储组件之间的连接关系。

| 字段名 (Field Name) | 类型 (Type) | 介绍 (Description) |
| :--- | :--- | :--- |
| `id` | UUID | 主键，自动生成 (Primary Key) |
| `user_id` | UUID | 所属用户 ID |
| `source_widget_id` | UUID | 源组件 ID |
| `target_widget_id` | UUID | 目标组件 ID |
| `link_type` | VARCHAR(20) | 连接类型，默认为 'context' |
| `updated_at` | TIMESTAMP(3) | 更新时间 (毫秒精度)，用于同步冲突解决 |
| `deleted` | BOOLEAN | 软删除标记，默认为 `false` |

---

## 3. 同步协议 (Sync Protocol)

同步引擎基于 **Cursor-based Pagination** (Pull) 和 **Last-Write-Wins** (Push)。

### 3.1 下行同步 (Pull)

客户端通过 Checkpoint 请求增量数据。

*   **Endpoint**: `GET /sync/:collection/pull`
*   **Params**: `checkpoint_time` (ISO String), `checkpoint_id` (UUID), `limit`
*   **Logic**:
    1.  查询 `updated_at > checkpoint_time` 或 `(updated_at = checkpoint_time AND id > checkpoint_id)` 的记录。
    2.  按 `updated_at ASC, id ASC` 排序。
    3.  返回数据及新的 Checkpoint。

### 3.2 上行同步 (Push)

客户端上传本地变更，服务端进行冲突检测。

*   **Endpoint**: `POST /sync/:collection/push`
*   **Body**: `Array<Entity>`
*   **Logic**:
    1.  **强制覆写**: 服务端强制将 `user_id` 设为当前登录用户，防止越权。
    2.  **LWW 裁决**:
        *   如果记录不存在 -> Insert。
        *   如果记录存在 -> 比较 `client_updated_at` vs `server_updated_at`。
        *   若 `client < server` -> 拒绝写入 (Conflict)，返回服务端最新版本。
        *   若 `client >= server` -> Update。

---

## 4. 安全机制 (Security)

1.  **原子注册**: `AuthService.register` 使用事务，同时创建 User、默认 Page 和默认 Widgets，确保数据一致性。
2.  **密码存储**: 使用 `bcrypt` 哈希，且 Entity 中 `select: false` 防止误泄露。
3.  **JWT**: 短效 Access Token + 长效 Refresh Token (数据库持久化，支持撤销)。
