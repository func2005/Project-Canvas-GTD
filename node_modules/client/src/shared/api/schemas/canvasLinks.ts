import { RxJsonSchema } from 'rxdb';

export interface CanvasLink {
    id: string;
    source_widget_id: string;
    target_widget_id: string;
    type: string;
    created_at: number;
}

export const canvasLinksSchema: RxJsonSchema<CanvasLink> = {
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
        type: {
            type: 'string',
            default: 'context_flow'
        },
        created_at: {
            type: 'number'
        }
    },
    required: ['id', 'source_widget_id', 'target_widget_id', 'created_at']
};
