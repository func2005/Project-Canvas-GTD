### 进度：

- 时间轴组件暂未优化

- 日历周视图暂未优化

- event 和 task 的 time block 功能暂未测试

- 暂时没有完成主页面板设计

- Docker版已完成 





主要变更点包括：

1.  暂时删除 matrix 矩阵及相关逻辑。

# Project Canvas GTD: 空间化任务管理系统设计白皮书

**版本**: 6.4 (实施中)
**日期**: 2025-11-21
**架构基础**: Local-First (RxDB + PostgreSQL)
**状态**: 修改中

---

## 1. 项目愿景

本项目旨在构建一个基于 **画布 (Canvas)** 的下一代 GTD (Getting Things Done) 工作空间。

### 核心理念

1.  **空间化 (Spatiality)**：打破传统列表的线性限制，利用二维空间的“位置”和“连接”来组织上下文。
2.  **组件实例化 (Instantiation)**：视图（日历、列表、矩阵）不再是单例页面，而是画布上可无限复用的组件实例 (`canvas_widgets`)。
3.  **本地优先 (Local-First)**：采用 RxDB + PostgreSQL 架构。数据优先存储在本地，通过增量复制协议与云端同步，实现极致响应速度和离线可用性。
4.  **数据与视图分离 (Decoupling)**：业务数据 (`Data Store`) 是唯一的真理来源，而画布 (`Canvas Store`) 仅是数据的投影方式。

---

## 2. 核心实体定义

### 2.1 Task (任务) —— "软时间"与"自我排程"

-   **定义**：需要用户主动执行的原子行动 (`entity_type = 'task'`)。
-   **时间行为扩充**：
    -   通常仅有 `do_date` (在那天做)。
    -   **Time Blocking (时间块)**：Task 也可以拥有 `start_time` 和 `end_time`。这意味着用户决定“自我约束”，在特定时间段专注处理该任务。
-   **核心维度 (存储于 `properties` JSONB)**：
    1.  **约束**：`due_date` (死线，硬字段)。
    2.  **意图**：`do_date` (计划日) + 可选的 Time Block。
    3.  **权重**：`properties.priority` + `sort_order` (手动排序权重)。
    4.  **成本**：`properties.energy_level`。

### 2.2 Event (事件/日程) —— "硬时间"与"外部契约"

-   **定义**：具有排他性的、通常涉及他人的固定事务 (`entity_type = 'event'`)。
-   **重复性 (Recurrence)**：
    -   Event 支持 iCal 标准的 `recurrence_rule`，例如“每周一上午10点”。
    -   *例外处理*：修改重复事件的某一次会生成一个新记录，其 `original_event_id` 指向父规则 ID。
-   **Canvas 形态**：始终显示为时间轴上的实心色块。

### 2.3 Project (项目) —— 聚合标签

-   **定义**：一个需要多步操作才能完成的结果 (`entity_type = 'project'`)。它是 Task 和 Event 的父级 (`parent_id`)。
-   **核心状态**：
    1.  **活跃 (Active)**：项目中至少包含一个 `active` 的 Task。
    2.  **僵尸 (Zombie)**：项目处于 Active，但其下无任何可执行 Task。系统会自动检测并提示。
    3.  **完成 (Completed)**：所有子任务均已归档。
-   **交互**：可“展开 (Explode)” 为一组独立的看板视图组件。

---

## 3. 数据库架构设计

本系统采用 **双核隔离架构**：业务数据 (`data_*`) 与 视图配置 (`canvas_*`) 分离。

### 3.1 业务数据层 (Data Layer) - The Source of Truth

核心表：`data_items`。承载所有 GTD 实体。

| 字段名 (Column)           | 类型      | 说明 (Description)                                           |
| :------------------------ | :-------- | :----------------------------------------------------------- |
| **id**                    | UUID      | 主键。                                                       |
| **user_id**               | UUID      | 多租户隔离。                                                 |
| **entity_type**           | String    | `'task'`, `'event'`, `'project'`。                           |
| **system_status**         | String    | `'active'`, `'waiting'`,`'completed'`, `'dropped'`, `'archived'`。 |
| **title**                 | Text      | 事务标题。                                                   |
| **parent_id**             | UUID      | 指向 Project ID 或 Event ID (作为子任务)。                   |
| **do_date**               | Date      | Task 计划执行日期。                                          |
| **due_date**              | Timestamp | Task 截止死线。                                              |
| **start_time / end_time** | Timestamp | Event 必填；Task 选填 (Time Block)。                         |
| **sort_order**            | Numeric   | 用于列表内的手动拖拽排序 (Lexicographical Rank)。            |
| **recurrence_rule**       | Text      | iCal 规则字符串。                                            |
| **original_event_id**     | UUID      | 指向重复事件的父 ID。                                        |
| **properties**            | JSONB     | **[扩展包]** 包含 `priority`, `energy_level`, `tags`, `content` (Markdown)。 |
| **updated_at**            | Timestamp | 用于 RxDB 增量同步。                                         |
| **deleted**               | Boolean   | 软删除标记。                                                 |

### 3.2 视图配置层

核心表：`canvas_widgets`。决定用户看到什么。

| 字段名 (Column)        | 类型   | 说明 (Description)                                           |
| :--------------------- | :----- | :----------------------------------------------------------- |
| **id**                 | UUID   | 组件实例 ID。                                                |
| **canvas_id**          | UUID   | 所属画布页面 ID (`canvas_pages`)。                           |
| **widget_type**        | String | `'calendar_master'`, `'smart_list'`, `'matrix'`, `'detail'`, `'time_line'`。 |
| **geometry**           | JSONB  | `{ x, y, w, h, z }` 物理位置与层级。                         |
| **data_source_config** | JSONB  | **[大脑]** 定义组件的数据查询逻辑。例如 `{ "filter": { "do_date": "today" } }`。 |
| **view_state**         | JSONB  | 内部状态。例如 `{ "is_pinned": true, "view_mode": "week" }`。 |
| **group_id**           | UUID   | 所属分组，组内数据订阅                                       |

------

## 4. 画布组件体系

在本项目中，所有功能模块均被封装为**独立的、可实例化的浮动窗口**。它们的数据状态持久化于 `canvas_widgets` 表中，通过 RxDB 在客户端实时渲染。

### 4.1 组件通用物理属性

所有组件实例（无论是日历还是列表）都共享一套基础的“外框”交互逻辑与数据结构：

-   **Header Bar (标题栏)**：
    -   **Title**：显示当前上下文（如 "Nov 20" 或 project名称"Apollo"）。
    -   **Pin Button (📌)**：修改 `view_state.is_pinned`。锁定后，组件不再响应上游信号，`data_source_config` 被固化。
    -   **Add**: 创建同组组件。信号在组内传递。
    -   **View Switcher**：修改 `view_state.view_mode`（如 List $\leftrightarrow$ Kanban）。
-   **Geometry (几何)**：对应数据库 `geometry` JSON 字段 (`x, y, w, h`)。支持自由拖拽与缩放。
-   **Z-Index (层级)**：点击组件时自动置顶 (更新 `geometry.z`)。支持手动“置底”作为背景板。

### 4.2 组件实例数据模型

这是前端 RxDB 中 `canvas_widgets` 集合存储的实际 JSON 结构，它是视图渲染的唯一依据：

```TypeScript
interface CanvasWidget {
  id: string;
  widget_type: 'calendar_master' | 'smart_list' | 'matrix' | 'detail' | 'project_header' | 'archive_bin';
  
  // 物理位置
  geometry: { x: number, y: number, w: number, h: number, z: number };
  
  // [The Brain] 数据驱动核心：决定这个组件显示什么数据
  data_source_config: {
    source_type: 'filter' | 'context' | 'static'; 
    criteria: {
      do_date?: string;           // e.g., '2025-11-21'
      project_id?: string;        // e.g., 'uuid-...'
      system_status?: string[];   // e.g., ['active']
      sort_by?: string;           // e.g., 'priority'
    }
  };

  // 视图内部状态
  view_state: {
    is_pinned: boolean;           // 是否锁定
    view_mode: string;            // e.g., 'month', 'week', 'kanban'
  };
}
```

### 4.3 核心组件详解

#### A. 主控日历

-   **Type**: `calendar_master`
-   **数据逻辑**: 监听全局时间范围。查询 `data_items` 中落在当前视口的 Task 和 Event。
-   **视觉形态**:
    -   **Event**: 实心色块 (Hard Time)。
    -   **Task**: 圆点或紧凑条目 (Soft Time)。
    -   **Alert**: 若 `do_date > due_date`，显示红色感叹号 ⚠️。
-   **交互**: 主要的**信号发射源**。点击日期格时，广播 `{ date: '...' }` 信号，触发未锁定下游组件更新 `data_source_config`。
-   **视图切换：**切换至周视图

#### B. 智能列表

-   **Type**: `smart_list`
-   **数据逻辑**: 最通用的容器。根据 `config.criteria` 渲染列表。
-   **视觉形态**:
    -   **Priority**: 渲染 `properties.priority`，高优显示左侧红条。
    -   **Energy**: 渲染 `properties.energy_level`，显示 🔋 / ☕️ 图标。
    -   **Ghosts**: 自动在顶部包含“已逾期”的任务（即使当前过滤条件是“今天”）。
-   **排序**: 混合排序 `sort_order` (手动) $\rightarrow$ `priority` $\rightarrow$ `energy` $\rightarrow$ `due_date`。

#### C. 详情检查器

-   **Type**: `detail`
-   **数据逻辑**: 绑定单个 `item_id`。
-   **形态**: 全字段编辑器。
    -   **Context Aware**: 画布上通常保留一个**未锁定**的详情组件。当用户在日历或列表中点击任意任务时，该组件会自动刷新内容（复用窗口），而不是不断弹出新窗口。

### 4.4 复合与特殊组件

这些组件在逻辑上更复杂，可能由多个 Widget 组合而成。

#### E. 项目组合视图

-   **触发**: 用户在 smart list 中切换至 Project，即可新建项目，可在 calendar 中新建 Project Header 用于展示项目主要信息
-   选中某个 Project 即可在组内广播项目信号，在 Project Header 和 Smart List 中展示项目的主要信息和子任务。
-   选中某个日期或月份，Project Header 也会接收信号并显示当日/当月的信息
-   当前版本的项目更加类似于“标签”的定义。

#### F. 归档与收集箱

-   **Inbox (收集箱)**
    -   **本质**: 一个配置了特殊过滤器的 `smart_list`。
    -   **Config**: `{ criteria: { do_date: null, system_status: 'active' } }`。
    -   **交互**: 作为“未排程池”。任务一旦被拖出到日历（被赋予 `do_date`），即不符合过滤条件，自动从箱中消失。
-   **Archive (归档箱)**
    -   **Type**: `archive_bin`
    -   **形态**: 默认是一个图标（碎纸机/黑洞），可展开为列表。
    -   **物理交互**:
        -   **Delete**: 将任何 Item 拖入此组件，触发 `update({ system_status: 'archived' })` 。
        -   **Lazy Load**: 展开列表时，触发服务端 SQL 查询（冷数据不全量同步到 RxDB）。


-----

## 5. 交互与信号流转逻辑

本章节定义了组件之间如何通过**“发布/订阅” (Pub/Sub)** 机制进行通讯，以及用户的空间操作（拖拽、锁定）如何转化为底层的数据库变更。

在 v6.0 架构中，交互的核心不再是简单的事件冒泡，而是 **“修改配置 $\rightarrow$ 反应式查询”** 的循环：

1.  上游组件修改自身的选中状态 (`selection_state`)。
2.  控制器根据 `canvas_links` 找到下游组件。
3.  控制器修改下游组件的 `data_source_config`。
4.  RxDB 自动检测到配置变更，重新运行查询并渲染视图。

### 5.1 信号源与响应规则

组件间的联动本质上是上游组件动态改写下游组件的 `JSON Query`。

| 上游操作                                   | 信号含义                         | 下游组件响应               | 业务场景                                           |
| :----------------------------------------------------------- | :-------------------------------------------- | :----------------------------------------------------------- | :------------------------------------------------- |
| **Calendar: 点击日期**<br>*(e.g., Select 'Nov 20')*          | `{ type: 'date', val: '2025-11-20' }`         | **更新过滤条件**: <br>`config.criteria = { do_date: '2025-11-20' }` | 聚焦处理某一天的任务列表。                         |
| **Calendar: 切换周视图**<br>*(e.g., View range Nov 17-23)*   | `{ type: 'range', start: '...', end: '...' }` | **更新范围过滤**: <br>`config.criteria = { do_date: { $gte: start, $lte: end } }` | 查看本周整体工作量。                               |
| **Calendar: 点击 Event**<br>*(e.g., Select 'Meeting A')*     | `{ type: 'context', id: 'evt_001' }`          | **更新父级过滤**: <br>`config.criteria = { parent_id: 'evt_001' }` | 查看该日程下的子任务（如会议纪要）。               |
| **List: 选中任务 A**<br>*(e.g., Select 'Task A')*            | `{ type: 'item', id: 'task_001' }`            | **更新详情绑定**: <br>`config.criteria = { id: 'task_001' }` | **详情检查器 (Detail Inspector)** 加载该任务数据。 |
| **Project List: 选中项目**<br>*(e.g., Select 'Project Apollo')* | `{ type: 'project', id: 'proj_001' }`         | **更新项目过滤**: <br>`config.criteria = { parent_id: 'proj_001' }` | 钻取查看该项目内的所有任务。                       |

### 5.2 画布视觉反馈

在无限画布上，用户必须直观地感知到“谁控制着谁”。这依赖于 `canvas_links` 表的数据渲染。

1.  **连接线 (The Umbilical Cord)**：
      * **数据基础**: 每一条 `canvas_links` 记录渲染为一条贝塞尔曲线。
      * **未锁定态 (Live)**: 实线，颜色跟随 UI 主题色（表示数据实时流通）。
      * **锁定态 (Pinned)**: 连接线断开、变为虚线或半透明（表示关系已“快照化”或暂时断开）。

2.  **选中高亮**：

      * 当用户点击下游组件（如 List B）时，系统查询 `canvas_links` 找到其 Source Widget（如 Calendar A）。
      * **效果**: Source Widget 的边框发出微光 (Glow Effect)，提示用户：“当前列表的数据是由这个日历决定的”。

### 5.3 锁定与快照机制

这是解决“数据修改后消失”问题的核心逻辑。

  * **状态 A: 订阅模式**

    * `view_state.is_pinned = false`。
    * **行为**: 下游组件实时监听上游信号。
    * *例子*: 日历选“今天”，列表显示“今天”。日历切“明天”，列表变“明天”。

  * **状态 B: 锁定模式**

    * **触发**: 用户点击 📌 按钮。
    * **系统动作**:
        1.  `view_state.is_pinned` 设为 `true`。
        2.  **快照化 (Snapshotting)**: 获取当前列表所有可见 Item 的 ID。
        3.  **配置冻结**: 将 `data_source_config` 从“动态过滤” (`criteria: { do_date: '...' }`) 修改为“静态集合” (`criteria: { id: { $in: [id1, id2...] } }`)。
    * **业务价值**: 此时即使修改任务日期（使其不再符合原查询条件），任务**也不会消失**。它只是留在了这个“临时快照列表”中，直到用户手动移除或刷新。

### 5.4 空间拖拽逻辑

拖拽是修改 `data_items` 属性最高效的方式。以下表格定义了拖拽事件触发的 RxDB 更新逻辑。

| 拖拽源  | 放置目标  | 业务语义                  | 底层数据变更                               |
| :---------------- | :----------------------- | :------------------------ | :----------------------------------------------------------- |
| **List Item**     | **Calendar (日期格)**    | **排程 (Schedule)**       | `doc.atomicPatch({ do_date: targetDate, start_time: null })` |
| **List Item**     | **Calendar (时间轴)**    | **时间块 (Time Block)**   | `doc.atomicPatch({ do_date: targetDate, start_time: dropTime, end_time: dropTime + 1h })` |
| **Calendar Item** | **Inbox Component**      | **取消排程 (Unschedule)** | `doc.atomicPatch({ do_date: null, start_time: null })` <br>*(从日历上移除，回到“未安排”状态)* |
| **List Item**     | **Same List (上下移动)** | **手动排序 (Reorder)**    | **算法**: 计算前后两个 Item 的 `sort_order` 均值。<br>`doc.atomicPatch({ sort_order: newRank })` |
| **List Item**     | **Matrix Q1 (右上)**     | **变更为重要/紧急**       | `doc.atomicPatch({ properties: { priority: 'high' }, do_date: today })` |
| **List Item**     | **Matrix Q4 (左下)**     | **变更为不重要/不紧急**   | `doc.atomicPatch({ properties: { priority: 'low' }, system_status: 'active' })` |
| **Any Item**      | **Archive Box**          | **归档**                  | `doc.atomicPatch({ system_status: 'archived', completed_at: now() })` |


-----

## 6\. 自动化与业务规则

本章节定义了系统的“隐形管家”逻辑。在 Local-First 架构下，自动化规则被拆分为两部分：

1.  **UI 响应式规则 (Client-Side)**：基于 RxDB 的实时计算，负责视图过滤、状态推导和即时反馈。
2.  **数据守护规则 (Server-Side)**：基于 PostgreSQL 的定时任务 (Cron Jobs)，负责数据完整性检查和重型分析。

### 6.1 时间维度的自动化

处理时间流逝带来的状态变更，核心目标是**“消除过期焦虑”**。

#### A. 逾期幽灵视图—— *[Client-Side RxDB]*

  * **痛点解决**: 防止“昨日未完任务”因日期变更而从“今日列表”中消失，导致遗忘。

  * **实现逻辑**: 在所有配置为“显示今日任务”的 `smart_list` 组件中，RxDB 查询会自动注入“幽灵条件”。

  * **查询构造 (Query Construction)**:

    ```javascript
    // 伪代码：生成 RxDB Selector
    {
      selector: {
        $or: [
          { do_date: '2025-11-21' }, // 今天
          { 
            do_date: { $lt: '2025-11-21' }, // 过去
            system_status: 'active'         // 且没做完
          }
        ]
      }
    }
    ```

  * **视觉表现**: 幽灵任务强制置顶，背景带有红色半透明纹理，显示标签 "3 days ago"。

#### B. 智能逾期警告—— *[UI Computed]*

  * **规则**: 当用户的“排程意愿”违背了“外部死线”时，系统发出警告。
  * **计算公式**:
    $$\text{Alert Level} = (\text{do\_date} > \text{due\_date}) \ ? \ \text{CRITICAL} \ : \ \text{NORMAL}$$
  * **表现**:
    * **日历/列表**: 任务显示醒目的红色虚线边框或 ⚠️ 图标。
    * **详情页**: Date Picker 区域显示文字提示 "Scheduled date is past the deadline\!"。


### 6.2 结构维度的自动化

维护 Project - Task - Event 之间的层级健康。

#### A. 僵尸项目检测 (Zombie Project Detection) —— *[Server-Side SQL]*

  * **定义**: 一个处于 `active` 状态的项目，但其下没有任何 `active` 或 `waiting` 的子任务（即缺乏下一步行动）。

  * **守护进程**: 每日凌晨运行 SQL 扫描。

    ```sql
    -- 找出僵尸项目 ID
    SELECT P.id, P.title 
    FROM data_items P
    WHERE P.entity_type = 'project' 
      AND P.system_status = 'active'
      AND P.deleted = FALSE
      AND NOT EXISTS (
        -- 检查是否存在活跃子任务
        SELECT 1 FROM data_items T 
        WHERE T.parent_id = P.id 
          AND T.system_status IN ('active', 'waiting')
          AND T.deleted = FALSE
      );
    ```

  * **系统行为**:

    * 不直接修改数据。
    * 向 `data_items` 对应的记录注入一个临时的系统标签或通知，提示用户 "Review Required"。

#### B. 项目自动完成建议 —— *[Client-Side Logic]*

  * **触发时机**: 当用户勾选完成某个 Project 下的**最后一个** Active Task 时。
  * **交互**: 弹出 Toast 提示 —— *"项目 [Project Name] 似乎已清空，是否将其标记为完成？"*
  * **动作**: 点击“是”触发 `update({ id: project_id, system_status: 'completed' })`。

### 6.3 属性继承与衍生逻辑

减少用户输入，通过上下文自动填充 `properties`。

#### A. 从日程衍生任务

  * **场景**: 在日历的 Event 上右键选择 "Create Prep Task" (创建准备任务)。
  * **自动填充规则**:
    1.  `parent_id`: 继承 Event 的 ID (或 Event 所属的 Project ID)。
    2.  `do_date`: 默认为 Event **开始前一天**。
    3.  `due_date`: 严格设为 Event 的 **start\_time**。


-----

## 7. 数据查询接口规范

本章节定义了前端视图（Calendar, List, Matrix）如何获取数据。
在 **Local-First** 架构下，**90% 的查询在客户端 (RxDB)** 针对本地 IndexedDB 执行；仅**归档检索**和**增量同步**涉及服务端 API。

**预设变量**:

  * `$currentUserId`: 当前登录用户 UUID
  * `$viewStart`, `$viewEnd`: 当前视图时间窗口 (ISO String)
  * `$today`: 今日日期 (YYYY-MM-DD)

### 7.1 主控日历视图 (Master Calendar Query) —— *[Client: RxDB]*

日历组件需要一次性拉取视口内的“硬日程”、“软任务”以及“隐形炸弹”（未排程但即将到期的任务）。

```javascript
// Collection: data_items
// 目的: 渲染 Month/Week 视图
const calendarQuery = {
  selector: {
    user_id: $currentUserId,
    system_status: { $ne: 'archived' }, // 排除归档，显示 Completed 以便划掉
    $or: [
      // A. 硬日程 (Event): 落在时间范围内
      {
        entity_type: 'event',
        start_time: { $gte: $viewStart, $lte: $viewEnd }
      },
      // B. 软任务 (Task): 计划在该时间段做
      {
        entity_type: 'task',
        do_date: { $gte: $viewStart, $lte: $viewEnd }
      },
      // C. 隐形炸弹 (Task): 无计划日期，但死线落在范围内
      {
        entity_type: 'task',
        do_date: null,
        due_date: { $gte: $viewStart, $lte: $viewEnd }
      }
    ]
  },
  // 排序: 优先按开始时间/计划日期渲染
  sort: [{ start_time: 'asc' }, { do_date: 'asc' }]
};
```

### 7.2 智能列表视图 (Smart List Query) —— *[Client: RxDB]*

这是最复杂的查询，包含“逾期幽灵”逻辑、上下文过滤以及混合排序。

```javascript
// Collection: data_items
// 目的: 渲染 "Today" 或特定日期的列表
const listQuery = {
  selector: {
    user_id: $currentUserId,
    entity_type: 'task',
    system_status: { $in: ['active', 'waiting'] },
    
    // 1. 核心过滤: 选中日期 OR (如果是今天，则包含历史逾期)
    $or: [
      { do_date: $selectedDate },
      // 幽灵逻辑 (Ghosts): 过去未完成的任务自动投射到今天
      { 
        do_date: { $lt: $today }, 
        system_status: 'active' 
      }
    ],

    // 2. 属性过滤 (基于 JSONB 扁平化索引)
    // 注意: 若 schema 中 properties 未定义为顶层索引，需在内存中过滤
    'properties.energy_level': { $eq: $energyFilter } // Optional
  },
  
  // 3. 混合排序策略
  // RxDB 排序限制: 排序字段必须在 Selector 中或有索引。
  // 实际实现中，通常先 fetch 再由 UI 组件进行复杂排序(Sort Order > Priority > Due Date)
  sort: [
    { sort_order: 'asc' }, // 用户手动拖拽顺序优先
    { due_date: 'asc' }    // 其次按死线
  ]
};
```

### 7.4 服务端同步与守护接口

这些 SQL 运行在 NestJS 后端，直接操作 PostgreSQL。

#### A. 增量同步接口

前端 RxDB 发起 pull 请求时调用。

```sql
-- GET /api/sync/pull?checkpoint=2025-11-20T10:00:00Z
SELECT 
  id, user_id, entity_type, title, system_status, 
  do_date, due_date, start_time, end_time,
  properties, updated_at, deleted 
FROM data_items
WHERE user_id = :userId
  AND updated_at > :checkpoint
ORDER BY updated_at ASC
LIMIT :batchSize;
```

#### B. 僵尸项目检测

后台定时任务，用于发现需要维护的数据。

```sql
-- 找出 Active 但没有 Active 子任务的项目
SELECT P.id, P.title, P.user_id
FROM data_items P
WHERE P.entity_type = 'project' 
  AND P.system_status = 'active'
  AND P.deleted = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM data_items T 
    WHERE T.parent_id = P.id 
      AND T.system_status IN ('active', 'waiting')
      AND T.deleted = FALSE
  );
```

### 7.5 全局归档检索 —— *[Server API]*

归档数据属于“冷数据”，不全量同步到本地 IndexedDB，而是通过 REST API 分页拉取。

```sql
-- GET /api/items/archive?page=1&q=keyword
SELECT * FROM data_items
WHERE user_id = :userId
  AND system_status IN ('completed', 'dropped', 'archived')
  AND deleted = FALSE
  -- 支持简单的文本搜索
  AND (:keyword IS NULL OR title ILIKE :keyword)
ORDER BY completed_at DESC -- 最近完成的在最前
LIMIT 50 OFFSET :offset;
```

-----

## 8. UI 组件规范与交互详解

本章节定义了前端组件的详细交互行为。在 Local-First 架构下，所有交互必须遵循 **“立即反馈，后台同步”** 的原则。

### 8.1 通用外框控制器

所有组件实例（`canvas_widgets`）均包裹在一个统一的容器中，该容器负责处理物理属性。

| UI 元素                           | 触发操作 (Trigger) | 数据/视图响应 (Response)                                     |
| :-------------------------------- | :----------------- | :----------------------------------------------------------- |
| **Drag Handle**<br>(标题栏空白处) | 拖拽 (Drag)        | **实时移动**：<br>1. 更新 DOM `transform: translate(...)`.<br>2. 节流 (Throttle 200ms) 保存：`widget.atomicPatch({ geometry: { x, y } })`。<br>3. 自动置顶：`z-index ++`。 |
| **Resize Handle**<br>(右下角)     | 拖拽 (Drag)        | **调整尺寸**：<br>更新 `geometry.w / h`。某些组件（如列表）会根据宽度自动切换 Compact/Full 模式。 |
| **Pin Toggle**<br>(📌 图标)        | 单击               | **切换锁定 (Freeze State)**：<br>1. **Lock**: `view_state.is_pinned = true`。组件停止监听上游信号，Snapshot 当前数据。<br>2. **Unlock**: `view_state.is_pinned = false`。组件重新订阅上游信号，并立即执行一次 Refresh。 |
| **Add**<br>(➕ 图标)               | 单击               | **新建下游组件 (Transaction)**：<br>1. 弹出菜单选择下游类型 (e.g., "Linked List")。<br>2. **DB Action**: 并在当前组件右侧 `x+width+20` 处创建一个新 Widget 记录。<br>3. **Link Action**: 创建一条 `canvas_links` 记录。<br>4. **Visual**: 自动绘制连接线。 |
| **Close**<br>(✖ 图标)             | 单击               | **销毁**：<br>执行 `widget.remove()`。这仅删除视图实例，**绝不删除**业务数据 (`data_items`)。 |

---

### 8.2 智能列表视图

列表是交互最高频的区域，需支持键盘操作和快速编辑。

#### A. 工具栏

* **[Sort Btn]**: 下拉菜单。直接修改 RxDB Query 的 `sort` 字段。
* **[+ Add Task]**:
    * **Action**: 在列表底部的 Input Row。
    * **Save**: 回车触发 `items.insert({ title: input, do_date: currentContextDate, ... })`。

#### B. 列表项

每一行代表一个 Task 文档。

| 区域/元素                   | 动作     | 交互细节与数据变更                                           |
| :-------------------------- | :------- | :----------------------------------------------------------- |
| **Checkbox**                | 单击     | **乐观完成 (Optimistic Completion)**：<br>1. **UI**: 立即播放打钩动画，文字变灰划掉。<br>2. **DB**: `doc.atomicPatch({ system_status: 'completed', completed_at: now() })`。 |
| **Title Text**              | 单击     | **选中信号**：<br>1. **UI**: 该行高亮。<br>2. **Signal**: 广播 `{ type: 'item', id: doc.id }`。如果画布上有未锁定的 Detail Widget，它会立即显示该任务详情。 |
| **Drag Grip**<br>(::before) | 拖拽开始 | **启动搬运**：<br>1. 生成半透明 Ghost Image。<br>2. 画布上所有可接受 Drop 的区域（日历格、矩阵象限、归档箱）高亮显示 (Drop Zones Highlight)。 |

---

### 8.3 主控日历

日历是主要的信号发射源和投放目标。

#### A. 日期网格 (Date Cell)

| 动作           | 响应                                                         |
| :------------- | :----------------------------------------------------------- |
| **单击空白处** | **发射信号**：<br>广播 `{ date: 'YYYY-MM-DD' }`。下游列表刷新。 |
| **双击空白处** | **快速创建**：<br>在格内弹出 Popover Input。创建 `do_date = 此格日期` 的新任务。 |
| **接收 Drop**  | **排程 (Schedule)**：<br>1. 获取被拖入 Item 的 UUID。<br>2. **DB**: `doc.atomicPatch({ do_date: targetDate })`。<br>3. **UI**: Item 立即出现在该格内。 |

#### B. 日程块/任务点 (Event Block / Task Dot)

| 动作                         | 响应                                                         |
| :--------------------------- | :----------------------------------------------------------- |
| **单击**                     | **发射上下文信号**：<br>广播 `{ context_id: doc.id }`。常用于查看 Event 关联的 Prep Tasks。 |
| **拖拽边缘**<br>(Event only) | **调整时长**：<br>实时更新 `end_time`。松手时提交 DB。       |
| **拖拽移动**                 | **重新排程**：<br>从 20号 拖到 22号 $\rightarrow$ 更新 `start_time` 或 `do_date`。 |

---

### 8.4 详情检查器

| 控件               | 交互规范                                                     |
| :----------------- | :----------------------------------------------------------- |
| **Auto Save**      | 所有输入框 (Title, Note) 均采用 **Debounce (500ms)** 自动保存机制。右上角显示 "Saving..." / "Saved" 状态指示器。 |
| **Date Picker**    | 包含 `Do Date` (计划) 和 `Due Date` (死线)。<br>修改 `Do Date` 时，如果画布上有日历组件，日历上的小圆点应**实时跳动**到新日期。 |
| **Project Select** | 下拉搜索框。支持创建新 Project。                             |
| **Sub-tasks**      | 简单的 Checklist。数据存储在 `properties.checklist` JSON 数组中，不作为独立 Item 存储，以减轻数据库压力。 |

---

### 8.5 归档箱

| 状态                      | 动作       | 响应                                                         |
| :------------------------ | :--------- | :----------------------------------------------------------- |
| **Icon Mode**<br>(默认)   | 接收 Drop  | **粉碎效果 (Shredder)**：<br>1. 播放碎纸机音效/动画。<br>2. **DB**: `update({ system_status: 'completed' })`。<br>3. **Undo**: 底部弹出 Toast "Task Completed (Undo)" 持续 3秒。 |
| **List Mode**<br>(展开后) | 滚动到底部 | **无限加载 (Infinite Scroll)**：<br>触发 API 请求 `GET /api/archive?page=N`。将冷数据追加到本地临时列表缓存中。 |

-----

## 9. 用户旅程与冷启动

本章节描述用户首次进入系统时的默认状态，以及完成第一个核心闭环（Capture $\rightarrow$ Schedule $\rightarrow$ Review $\rightarrow$ Focus）的标准剧本。

### 9.1 默认初始化状态

当新用户注册完成并首次登录时，服务端 (NestJS) 会向 `canvas_pages` 和 `canvas_widgets` 表中写入一套“最佳实践”预设数据，随后同步至客户端 RxDB。

**默认画布配置**:

1.  **Widget A: 主控日历 (Master Calendar)**
    * **Type**: `calendar_master`
    * **Geometry**: `{ x: 40, y: 40, w: 800, h: 600 }` (占据左侧主视区)
    * **State**: 显示当前月份。

2.  **Widget B: 收集箱 (Inbox / Unscheduled)**
    * **Type**: `smart_list`
    * **Geometry**: `{ x: 860, y: 40, w: 350, h: 400 }` (右上角)
    * **Config**: `{ criteria: { do_date: null, system_status: 'active' } }`
    * **说明**: 这是一个标准的列表组件，但通过配置专门用于捕获“无时间意图”的想法。

3.  **Widget C: 归档箱 (The Shredder)**
    * **Type**: `archive_bin`
    * **Geometry**: `{ x: 860, y: 460, w: 350, h: 180 }` (右下角)
    * **State**: 收起状态 (Icon Mode)。

---

### 9.2 场景 A: 捕获与排程

**目标**：将脑海中的杂事（无结构）转化为系统中的计划（有结构）。

1.  **捕获 (Capture)**：

    * **用户动作**: 在右侧 Widget B (Inbox) 点击 `[+ Add]`，输入 "买菜"，回车。
    * **RxDB Action**: `items.insert({ title: '买菜', do_date: null, entity_type: 'task' })`。
    * **视图响应**: 任务立即出现在 Inbox 列表中。

2.  **排程 (Drag & Drop)**：

    * **用户动作**: 按住 "买菜" 任务，将其拖入左侧日历的 **23号** 格子。

    * **RxDB Action**:

        ```javascript
        // 触发原子更新
        doc.atomicPatch({ do_date: '2025-11-23' });
        ```

    * **视图响应 (Reactive Update)**:

        * **Inbox**: 由于 `do_date` 不再是 `null`，该任务不再符合 Widget B 的过滤条件 $\rightarrow$ **瞬间消失**。
        * **Calendar**: 23号格子监听到数据变更 $\rightarrow$ **出现** "买菜" 的圆点/条目。

---

### 9.3 场景 B: 详情查看与“窗口复用”策略

**目标**：避免“弹窗爆炸”。系统智能判断是复用现有窗口还是新建窗口。

1.  **查看任务 A**:
    * **用户动作**: 点击日历上 23号 的 "买菜"。
    * **系统逻辑**:
        1.  扫描 `canvas_widgets`。
        2.  寻找 `type == 'detail'` 且 `view_state.is_pinned == false` 的组件。
        3.  **结果**: 未找到 (冷启动第一次)。
    * **系统响应**:
        * 在 `x: 860, y: 40` (覆盖在 Inbox 上方) **新建**一个 Detail Widget。
        * 设置其 `config.item_id = 'task_buy_milk'`。

2.  **切换任务 B**:
    * **用户动作**: 点击日历上 25号 的 "阅读"。
    * **系统逻辑**:
        1.  扫描发现刚才创建的 Detail Widget 正处于 **未锁定 (Unpinned)** 状态。
    * **系统响应**:
        * **不新建窗口**。
        * 直接更新该 Widget 的配置: `config.item_id = 'task_reading'`。
        * 内容瞬间从 "买菜" 刷新为 "阅读"。

---

### 9.4 场景 C: 锁定与多窗口并行

**目标**：保留当前上下文（参考资料），同时处理另一个任务。

1.  **锁定上下文**:
    * **用户动作**: 决定此时需要对着 "阅读" 的笔记进行思考。点击 Detail Widget 右上角的 **📌 (Pin)**。
    * **RxDB Action**: `widget_detail.atomicPatch({ view_state: { is_pinned: true } })`。
    * **UI 反馈**: 右上角的 **📌 (Pin)**变实心。此时它切断了与日历的信号监听。

2.  **再次查看任务 A**:
    * **用户动作**: 再次点击日历上的 "买菜"。
    * **系统逻辑**:
        1.  扫描 `canvas_widgets`。
        2.  发现唯一的 Detail Widget 已被 **锁定 (Pinned)**。
        3.  **结果**: 无可用复用窗口。
    * **系统响应**:
        * 在屏幕智能空位 (Smart Placement) **新建** 第二个 Detail Widget。
        * 加载 "买菜" 的数据。
    * **最终状态**: 屏幕上同时存在 "阅读" (锁定参考) 和 "买菜" (当前编辑) 两个窗口。

---

### 9.5 场景 D: 深度钻取与同组关联

**目标**：从宏观月视图进入微观日视图，体验 v6.0 的组件联动。

1.  **展开某日**:
    * **用户动作**: 在日历上点击 **23号** 日期格（非任务）。
    * **系统响应**:
        * 创建同组关联组件 `Widget D (Smart List)`。
        * 同组默认关联，可进行数据订阅: `Link: Calendar -> Widget D`。
        * 初始化配置: `Widget D.config = { criteria: { do_date: '2025-11-23' } }`。
    * **视觉结果**: 日历旁出现了一个只显示 "23号任务" 的列表。

2.  **同组联动验证**:
    * 此时画布上有：`Calendar`, `List (23rd)`, 和一个未锁定的 `Detail Widget`。
    * **路径 1**: 点击 `List (23rd)` 中的 "买菜" $\rightarrow$ `Detail Widget` 刷新。
    * **路径 2**: 点击 `Calendar` 中的 "买菜" $\rightarrow$ `Detail Widget` 刷新。
    * **逻辑总结**: 只要组件未锁定，它就是整个画布数据的**“公共投影仪”**，任何上游组件的点击都会将内容投射到它上面。
