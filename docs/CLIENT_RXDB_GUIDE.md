# 前端 RxDB 集成指南 (Project Canvas GTD v6.0)

## 1. 依赖安装

确保安装了核心库及 IndexedDB 适配器：

``` bash
npm install rxdb rxjs uuid rxdb-adapter-indexeddb
```

## 2. 类型定义 (Type Definitions)

**变更说明**：为了匹配服务端 `SERVER_DOCS.md`，我们将 `is_deleted` 统一更名为 `deleted`，`type` (链接类型) 更名为 `link_type`。

``` typescript
// src/shared/api/types.ts

// 对应服务端的同步游标
export interface SyncCheckpoint {
  updatedAt: string; // ISO String
  lastId: string;    // UUID Tie-breaker
}

// Collection: items (对应服务端 data_items)
export interface RxItem {
  id: string;
  user_id: string;
  entity_type: 'task' | 'event' | 'project';
  system_status: 'active' | 'completed' | 'dropped' | 'archived' | 'waiting';
  title: string;
  parent_id?: string;
  sort_order?: number;

  // 时间字段 (ISO String)
  do_date?: string;
  due_date?: string;
  start_time?: string;
  end_time?: string;

  // 扩展属性
  properties: Record<string, any>; 

  // 同步核心字段
  updated_at: string; 
  deleted: boolean; // 修正：与服务端 "deleted" 字段保持一致
}

// Collection: widgets (对应服务端 canvas_widgets)
export interface RxWidget {
  id: string;
  user_id: string;
  canvas_id: string;
  widget_type: string;
  geometry: { x: number, y: number, w: number, h: number, z: number };
  data_source_config: Record<string, any>;
  view_state: Record<string, any>;
  updated_at: string;
  deleted: boolean;
}

// Collection: links (对应服务端 canvas_links)
export interface RxLink {
  id: string;
  source_widget_id: string;
  target_widget_id: string;
  link_type: string; // 修正：服务端字段为 link_type
  updated_at: string;
  deleted: boolean;
}
```

## 3. Schema 定义 (RxJsonSchema)

``` typescript
// src/shared/api/schemas/item.schema.ts
import { RxJsonSchema } from 'rxdb';
import { RxItem } from '../types';

export const itemSchema: RxJsonSchema<RxItem> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    user_id: { type: 'string' },
    entity_type: { type: 'string' },
    system_status: { type: 'string' },
    title: { type: 'string' },
    parent_id: { type: 'string' },
    sort_order: { type: 'number' },
    do_date: { type: 'string' },
    due_date: { type: 'string' },
    start_time: { type: 'string' },
    end_time: { type: 'string' },
    properties: { type: 'object' },
    updated_at: { type: 'string' },
    deleted: { type: 'boolean' } // 修正：使用 deleted
  },
  required: ['id', 'entity_type', 'updated_at'],
  indexes: [
    ['updated_at', 'id'], // 必须：用于 Sync Pull 排序
    'user_id',            // 必须：用于多租户过滤
    'parent_id'
  ]
};
```

## 4. 网络层配置 (HTTP Client)

``` typescript
// src/shared/api/axios.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

// 拦截器：注入 Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## 5. 核心同步插件 (Replication Plugin) - 重点修正

**修正说明**：

1. `push.handler` 修正了参数提取逻辑，从 `RxReplicationWriteToMasterRow` 中提取 `newDocumentState`。
2. 增加了对服务端冲突返回值的处理。

``` typescript
// src/shared/api/replication.ts
import { RxCollection } from 'rxdb';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { apiClient } from './axios';
import { SyncCheckpoint } from './types';

// 映射表：前端 Collection 名 -> 后端 URL 路径
const ENDPOINT_MAP: Record<string, string> = {
  items: 'data_items',
  widgets: 'canvas_widgets',
  links: 'canvas_links'
};

export async function startReplication(collection: RxCollection) {
  const endpoint = ENDPOINT_MAP[collection.name];
  if (!endpoint) throw new Error(`No endpoint mapping for collection: ${collection.name}`);

  return replicateRxCollection({
    collection,
    replicationIdentifier: `sync-${collection.name}-v6`,
    retryTime: 5000,
    autoStart: true,
    
    // --- Pull: 下行同步 (Server -> Client) ---
    pull: {
      batchSize: 50,
      async handler(lastCheckpoint: SyncCheckpoint | null, batchSize) {
        const params: any = { limit: batchSize };
        
        if (lastCheckpoint) {
          params.checkpoint_time = lastCheckpoint.updatedAt;
          params.checkpoint_id = lastCheckpoint.lastId;
        }
    
        try {
          const { data } = await apiClient.get(`/sync/${endpoint}/pull`, { params });
          return {
            documents: data.documents,
            checkpoint: data.checkpoint
          };
        } catch (error) {
          console.error(`Pull Error (${collection.name}):`, error);
          throw error;
        }
      }
    },
    
    // --- Push: 上行同步 (Client -> Server) ---
    push: {
      batchSize: 50,
      async handler(rows) {
        try {
          // 关键修正 1: 提取纯净的 Entity 数据
          // rows 是 RxReplicationWriteToMasterRow[] 类型
          const payload = rows.map(row => row.newDocumentState);
    
          // 关键修正 2: 发送 Entity 数组到服务端
          // 服务端逻辑: LWW 策略，若 client < server 则视为冲突并返回服务端版本
          const response = await apiClient.post(`/sync/${endpoint}/push`, payload);
          
          // 关键修正 3: 返回冲突文档
          // 如果服务端返回了数据 (Conflict Docs)，RxDB 会用这些数据更新本地，解决冲突
          // 如果写入成功，服务端应返回空数组
          return response.data || []; 
        } catch (error) {
          console.error(`Push Error (${collection.name}):`, error);
          throw error;
        }
      }
    }
  });
}
```

## 6. 数据库初始化 (Database Init)

``` typescript
// src/shared/api/db.ts
import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { itemSchema } from './schemas/item.schema';
import { startReplication } from './replication';

addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

let dbPromise: Promise<any> | null = null;

export const initDatabase = async () => {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const db = await createRxDatabase({
      name: 'project_canvas_gtd',
      storage: getRxStorageDexie(),
      ignoreDuplicate: true
    });

    await db.addCollections({
      items: { schema: itemSchema },
      // 确保 widget 和 link schema 也同样更新了 deleted 字段
      widgets: { schema: widgetSchema }, 
      links: { schema: linkSchema }
    });
    
    // 登录后启动同步
    if (localStorage.getItem('access_token')) {
      Object.values(db.collections).forEach(async (col) => {
        await startReplication(col);
      });
    }
    
    return db;
  })();

  return dbPromise;
};
```

## 7. 开发必读 (Checklist)

1.  **查询过滤 (User Isolation)**: 
    * 所有业务查询必须显式过滤 `user_id`。
    * RxDB 示例: `collection.find().where('user_id').eq(myUserId).exec()`
2.  **软删除过滤 (Soft Delete)**:
    * **非常重要**: RxDB 默认的 `remove()` 是内部机制。但在本系统中，我们使用业务字段 `deleted`。
    * **查询时**: 必须带上 `.where('deleted').eq(false)`，否则会查出已删除的数据。
    * **删除时**: 使用 `doc.patch({ deleted: true, updated_at: new Date().toISOString() })`。
3.  **时间格式**:
    * 所有存入 `updated_at` 的时间必须是 **ISO 8601 String** (e.g., `2023-10-27T10:00:00.000Z`)，以确保与服务端 PostgreSQL 的比较逻辑兼容。
