// ----- Domain A: Business Data -----
export type EntityType = 'task' | 'event' | 'project';
export type SystemStatus = 'active' | 'completed' | 'archived' | 'dropped';

export interface IItem {
  id: string;
  user_id: string;
  updated_at: string; // ISO string
  deleted: boolean;

  entity_type: EntityType;
  title: string;
  system_status: SystemStatus;

  // Time Dimensions
  do_date?: string | null; // YYYY-MM-DD
  due_date?: string | null; // ISO string
  start_time?: string | null; // ISO string
  end_time?: string | null; // ISO string
  is_all_day?: boolean;

  // Structure & Sorting
  parent_id?: string | null;
  sort_order?: number;

  // Recurrence
  recurrence_rule?: string | null;
  original_event_id?: string | null;

  // Extended Properties (JSONB)
  properties: {
    content?: string;
    priority?: string;
    energy_level?: string;
    tags?: string[];
    [key: string]: any;
  };

  created_at: number;
  completed_at?: number | null;
}

// ----- Domain B: Canvas Config -----
export type WidgetType = 'calendar_master' | 'smart_list' | 'matrix' | 'detail';

export interface IDataSourceConfig {
  mode: 'filter' | 'query';
  criteria?: Record<string, any>;
  [key: string]: any;
}

export interface IWidgetInstance {
  id: string;
  canvas_id: string;
  updated_at: string;
  deleted: boolean;

  widget_type: WidgetType;

  geometry: {
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
  };

  data_source_config: IDataSourceConfig;
  view_state: Record<string, any>;
}

export interface IPage {
  id: string;
  user_id: string;
  updated_at: string;
  deleted: boolean;

  title: string;
  icon?: string;
  is_default: boolean;
}

export interface IWidgetLink {
  id: string;
  canvas_id: string;
  updated_at: string;
  deleted: boolean;

  source_widget_id: string;
  target_widget_id: string;
  link_type: 'standard' | 'context';
}
