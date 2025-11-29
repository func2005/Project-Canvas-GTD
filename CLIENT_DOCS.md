# Project Canvas GTD - Client Documentation (v6.0)

## 1. 架构概览 (Architecture Overview)

客户端采用 **Local-First (本地优先)** 架构，基于 **RxDB** 实现离线可用、实时响应和多端同步。

*   **Framework**: React + TypeScript
*   **Local Database**: RxDB (IndexedDB adapter)
*   **State Management**: RxDB (作为单一数据源) + React Context
*   **UI Library**: TailwindCSS

---

## 2. 本地数据库 (RxDB Schema)

本地数据库结构与服务端保持高度一致，但针对前端查询进行了优化。

### 2.1 Collections

#### Collection: `items`
**描述**: 存储 Task, Project, Event 等核心业务数据。

| 字段名 (Field Name) | 类型 (Type) | 介绍 (Description) |
| :--- | :--- | :--- |
| `id` | string | 主键 (UUID) |
| `user_id` | string | 所属用户 ID |
| `entity_type` | string | 实体类型 ('task', 'event', 'project') |
| `system_status` | string | 状态 ('active', 'completed', 'dropped', 'archived', 'waiting') |
| `title` | string | 标题 |
| `parent_id` | string | 父级 ID (Nullable) |
| `sort_order` | number | 排序权重 (Nullable) |
| `do_date` | string | 执行日期 (ISO Date String) (Nullable) |
| `due_date` | string | 截止时间 (ISO String) (Nullable) |
| `start_time` | string | 开始时间 (ISO String) (Nullable) |
| `end_time` | string | 结束时间 (ISO String) (Nullable) |
| `is_all_day` | boolean | 是否全天事件 (Nullable) |
| `recurrence_rule` | string | 重复规则 (Rrule) (Nullable) |
| `original_event_id` | string | 原始事件 ID (用于重复事件例外) (Nullable) |
| `properties` | object | 扩展属性 (priority, energy_level, tags, content, project_id) |
| `updated_at` | string | 更新时间 (ISO String)，用于同步 |
| `is_deleted` | boolean | 软删除标记 |
| `created_at` | number | 创建时间戳 |
| `completed_at` | number | 完成时间戳 (Nullable) |

#### Collection: `widgets`
**描述**: 存储看板组件配置。

| 字段名 (Field Name) | 类型 (Type) | 介绍 (Description) |
| :--- | :--- | :--- |
| `id` | string | 主键 (UUID) |
| `user_id` | string | 所属用户 ID |
| `canvas_id` | string | 所属画布 ID |
| `group_id` | string | 所属分组 ID (Nullable) |
| `widget_type` | string | 组件类型 ('calendar_master', 'smart_list', etc.) |
| `geometry` | object | 几何属性 {x, y, w, h, z} |
| `data_source_config` | object | 数据源配置 (Record<string, any>) |
| `view_state` | object | 视图状态 (is_pinned, is_collapsed, view_mode) |
| `updated_at` | string | 更新时间 (ISO String)，用于同步 |
| `is_deleted` | boolean | 软删除标记 |

#### Collection: `links`
**描述**: 存储组件之间的连接关系。

| 字段名 (Field Name) | 类型 (Type) | 介绍 (Description) |
| :--- | :--- | :--- |
| `id` | string | 主键 (UUID) |
| `source_widget_id` | string | 源组件 ID |
| `target_widget_id` | string | 目标组件 ID |
| `type` | string | 连接类型，默认为 'context_flow' |
| `created_at` | number | 创建时间戳 |

### 2.2 Schema 特性

*   **CRDT 字段**: 所有 Collection 均包含 `updated_at` (string format) 和 `is_deleted` (boolean) 用于同步。
*   **JSON 支持**: 复杂字段如 `properties`, `geometry` 直接存储为 JSON 对象。

---

## 3. 同步集成 (Sync Integration)

客户端使用 RxDB 的 Replication 插件与服务端进行增量同步。

### 3.1 配置 (db.ts)

*   **Pull**:
    *   向服务端发送本地最后的 Checkpoint。
    *   接收服务端返回的 `documents` 并批量写入本地 IndexedDB。
*   **Push**:
    *   监听本地变更流 (ChangeStream)。
    *   将变更批量发送至服务端。
    *   处理冲突：若服务端返回冲突数据，RxDB 会自动更新本地数据为服务端版本 (Master-Slave 模式)。

### 3.2 实时性

*   **Stream**: 目前主要依赖轮询 (Polling) 或手动触发同步。
*   **Optimistic UI**: 用户操作立即写入本地 RxDB，界面即时更新，同步在后台异步进行。

---

## 4. 状态管理 (State Management)

*   **AuthContext**: 管理用户登录状态、Token 存储及 `dbService` 的初始化/销毁。
*   **useRxQuery**: 在组件中使用 RxDB 的 Hooks 订阅数据变更。例如 `SmartList` 组件订阅 `items` 集合，当同步发生时，列表会自动刷新。

## 5. 目录结构 (Directory Structure)

*   `src/shared/api/db.ts`: RxDB 数据库初始化、Schema 定义及同步插件配置。
*   `src/features/auth`: 登录/注册 UI 及逻辑。
*   `src/widgets`: 各类看板组件 (Calendar, SmartList) 的实现。
