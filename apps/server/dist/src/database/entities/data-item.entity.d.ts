export declare class DataItem {
    id: string;
    user_id: string;
    entity_type: string;
    title: string;
    system_status: string;
    do_date: string;
    due_date: Date;
    start_time: Date;
    end_time: Date;
    parent_id: string;
    properties: Record<string, any>;
    sort_order: number;
    updated_at: Date;
    deleted: boolean;
    is_all_day: boolean;
    recurrence_rule: string;
    original_event_id: string;
    created_at: number;
    completed_at: number;
}
