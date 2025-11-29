import { RxJsonSchema } from 'rxdb';
import { CanvasWidget } from '../db';

export const widgetSchema: RxJsonSchema<CanvasWidget> = {
    title: 'canvas_widgets schema',
    version: 3,
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
        canvas_id: {
            type: 'string',
            maxLength: 100
        },
        group_id: {
            type: 'string'
        },
        widget_type: {
            type: 'string',
            enum: ['calendar_master', 'smart_list', 'matrix', 'detail', 'project_header', 'archive_bin', 'timeline']
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
                view_mode: { type: 'string' }
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
