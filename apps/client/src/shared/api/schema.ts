// Data Items Schema
export const dataItemsSchema = {
    title: 'data_items schema',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        user_id: {
            type: 'string'
        },
        entity_type: {
            type: 'string',
            enum: ['task', 'event', 'project'],
            maxLength: 10 // Length of longest value 'project'
        },
        system_status: {
            type: 'string',
            enum: ['active', 'completed', 'dropped', 'archived', 'waiting'],
            default: 'active',
            maxLength: 10 // Length of longest value 'completed'
        },
        title: {
            type: 'string'
        },
        // Relationships
        parent_id: {
            type: ['string', 'null']
        },
        sort_order: {
            type: 'number'
        },
        // Time Dimensions
        do_date: {
            type: ['string', 'null'], // YYYY-MM-DD
            format: 'date'
        },
        due_date: {
            type: ['string', 'null'], // ISO Date-Time
            format: 'date-time'
        },
        start_time: {
            type: ['string', 'null'],
            format: 'date-time'
        },
        end_time: {
            type: ['string', 'null'],
            format: 'date-time'
        },
        is_all_day: {
            type: 'boolean'
        },
        // Recurrence
        recurrence_rule: {
            type: ['string', 'null']
        },
        original_event_id: {
            type: ['string', 'null']
        },
        // Extended Properties (JSONB)
        properties: {
            type: 'object',
            properties: {
                priority: {
                    type: 'string',
                    enum: ['high', 'normal', 'low']
                },
                energy_level: {
                    type: 'string',
                    enum: ['high', 'medium', 'low']
                },
                tags: {
                    type: 'array',
                    items: { type: 'string' }
                },
                content: {
                    type: 'string'
                } // Markdown
            }
        },
        // Sync Metadata
        updated_at: {
            type: 'string',
            format: 'date-time',
            maxLength: 35 // ISO 8601 date-time string
        },
        is_deleted: {
            type: 'boolean',
            default: false
        },
        created_at: {
            type: 'number'
        },
        completed_at: {
            type: ['number', 'null']
        }
    },
    required: ['id', 'entity_type', 'title', 'updated_at', 'system_status'],
    indexes: ['updated_at', 'entity_type', 'system_status']
};

// Canvas Widgets Schema
export const canvasWidgetsSchema = {
    title: 'canvas_widgets schema',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        canvas_id: {
            type: 'string',
            maxLength: 100
        },
        widget_type: {
            type: 'string',
            enum: ['calendar_master', 'smart_list', 'matrix', 'detail', 'project_header', 'archive_bin']
        },
        // Physical Properties
        geometry: {
            type: 'object',
            properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                w: { type: 'number' },
                h: { type: 'number' },
                z: { type: 'number' }
            },
            required: ['x', 'y', 'w', 'h']
        },
        // Data Source Configuration (The Brain)
        data_source_config: {
            type: 'object'
            // Flexible structure for storing { criteria: {...} }
        },
        // View State
        view_state: {
            type: 'object',
            properties: {
                is_pinned: { type: 'boolean' },
                is_collapsed: { type: 'boolean' },
                view_mode: { type: 'string' },
                group_id: { type: 'string' }
            }
        },
        // Sync Metadata
        updated_at: {
            type: 'string',
            format: 'date-time',
            maxLength: 35
        },
        is_deleted: {
            type: 'boolean',
            default: false
        }
    },
    required: ['id', 'widget_type', 'geometry', 'canvas_id', 'updated_at'],
    indexes: ['canvas_id']
};
