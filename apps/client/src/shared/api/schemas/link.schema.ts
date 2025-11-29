import { RxJsonSchema } from 'rxdb';
import { CanvasLink } from '../db';

export const linkSchema: RxJsonSchema<CanvasLink> = {
    title: 'canvas links schema',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        source_widget_id: {
            type: 'string'
        },
        target_widget_id: {
            type: 'string'
        },
        link_type: {
            type: 'string',
            default: 'context_flow'
        },
        updated_at: {
            type: 'string',
            format: 'date-time'
        },
        is_deleted: {
            type: 'boolean',
            default: false
        },
        created_at: {
            type: 'number'
        }
    },
    required: ['id', 'source_widget_id', 'target_widget_id', 'created_at']
};
