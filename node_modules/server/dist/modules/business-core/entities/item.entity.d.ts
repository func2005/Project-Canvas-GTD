import { EntityType, SystemStatus } from '@project-canvas/shared-types';
export declare class DataItem {
    id: string;
    user_id: string;
    updated_at: Date;
    deleted: boolean;
    entity_type: EntityType;
    title: string;
    system_status: SystemStatus;
    do_date: string;
    due_date: Date;
    start_time: Date;
    end_time: Date;
    is_all_day: boolean;
    parent_id: string;
    sort_order: number;
    recurrence_rule: string;
    original_event_id: string;
    properties: Record<string, any>;
    created_at: Date;
    completed_at: Date;
}
