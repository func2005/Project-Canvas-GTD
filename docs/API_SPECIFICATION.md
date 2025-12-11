# Project Canvas GTD - API Specifications

**版本**: 6.0
**Base URL**: `/api` (Proxied via Nginx) / `http://localhost:3000` (Direct)
**Authentication**: Bearer Token (JWT)

---

## 1. 认证模块 (Authentication)

### 1.1 注册 (Register)

*   **Endpoint**: `/auth/register`
*   **Method**: `POST`
*   **Description**: 创建新用户账户。

#### 请求参数 (Request Body)

| 参数名 | 类型 | 必填 | 说明 | 示例 |
| :--- | :--- | :--- | :--- | :--- |
| `email` | string | 是 | 用户邮箱 | `user@example.com` |
| `password` | string | 是 | 密码 (min 6 chars) | `password123` |

#### 返回示例 (Response)

```json
{
  "id": "uuid-...",
  "email": "user@example.com",
  "created_at": "2025-12-11T10:00:00Z"
}
```

### 1.2 登录 (Login)

*   **Endpoint**: `/auth/login`
*   **Method**: `POST`
*   **Description**: 获取访问令牌。

#### 请求参数 (Request Body)

| 参数名 | 类型 | 必填 | 说明 | 示例 |
| :--- | :--- | :--- | :--- | :--- |
| `email` | string | 是 | 用户邮箱 | `user@example.com` |
| `password` | string | 是 | 密码 | `password123` |

#### 返回示例 (Response)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR...",
  "user": {
    "id": "uuid-...",
    "email": "user@example.com"
  }
}
```

---

## 2. 同步模块 (Synchronization)

所有同步接口均需在 Header 中携带 `Authorization: Bearer <token>`。

### 2.1 拉取变更 (Pull Changes)

*   **Endpoint**: `/sync/:collection/pull`
*   **Method**: `GET`
*   **Description**: 获取指定集合的增量变更数据。

#### 路径参数 (Path Params)

| 参数名 | 说明 |
| :--- | :--- |
| `collection` | 集合名称 (`data_items`, `canvas_widgets`, `canvas_links`, `canvas_pages`) |

#### 查询参数 (Query Params)

| 参数名 | 类型 | 必填 | 说明 | 示例 |
| :--- | :--- | :--- | :--- | :--- |
| `checkpoint_time` | string | 否 | 上次同步的最后更新时间 (ISO) | `2025-12-10T10:00:00Z` |
| `checkpoint_id` | string | 否 | 上次同步的最后 ID (Tie-breaker) | `uuid-...` |
| `limit` | number | 否 | 批次大小 (默认 100) | `50` |

#### 返回示例 (Response)

```json
{
  "documents": [
    {
      "id": "item-1",
      "title": "Buy Milk",
      "updated_at": "2025-12-11T12:00:00Z",
      "deleted": false
      // ... other fields
    }
  ],
  "checkpoint": {
    "updatedAt": "2025-12-11T12:00:00Z",
    "lastId": "item-1"
  },
  "hasMore": false
}
```

### 2.2 批量推送变更 (Batch Push)

*   **Endpoint**: `/sync/batch/push`
*   **Method**: `POST`
*   **Description**: 事务性地提交多个集合的变更。

#### 请求参数 (Request Body)

```json
{
  "items": [ ... ],   // data_items 变更数组
  "widgets": [ ... ], // canvas_widgets 变更数组
  "links": [ ... ],   // canvas_links 变更数组
  "pages": [ ... ]    // canvas_pages 变更数组
}
```

每个变更对象必须包含 `id` 和 `updated_at`。

#### 返回示例 (Response)

成功时返回空 JSON，或包含冲突数据的结构（具体取决于实现，Local-First 通常只返回冲突）：

```json
{
  "items": [],
  "widgets": [],
  "links": [],
  "pages": []
}
```
*注：如果数组非空，表示发生了冲突，客户端应使用返回的服务端数据更新本地。*

### 2.3 单集合推送 (Single Push)

*   **Endpoint**: `/sync/:collection/push`
*   **Method**: `POST`
*   **Description**: 仅提交单个集合的变更 (通常用于简单场景或调试)。

#### 请求参数 (Request Body)

JSON数组，包含变更的文档对象。

```json
[
  { "id": "...", "updated_at": "..." }
]
```

#### 返回示例 (Response)

同 Batch Push，返回冲突文档列表。

```json
[]
```

---

## 3. 错误码说明 (Error Codes)

| HTTP Code | Error | 说明 |
| :--- | :--- | :--- |
| 200 | OK | 请求成功 |
| 201 | Created | 创建成功 |
| 400 | Bad Request | 参数错误或校验失败 |
| 401 | Unauthorized | Token 无效或过期 |
| 403 | Forbidden | 无权访问该资源 |
| 409 | Conflict | 数据冲突 (通常由 200 返回冲突数据代替，此处仅指硬性约束) |
| 500 | Internal Server Error | 服务器内部错误 |
