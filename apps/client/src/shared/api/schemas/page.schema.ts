export const pageSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 36
        },
        user_id: {
            type: 'string'
        },
        is_default: {
            type: 'boolean'
        },
        viewport_config: {
            type: 'object'
        },
        updated_at: {
            type: 'string'
        },
        is_deleted: {
            type: 'boolean'
        }
    },
    required: ['id', 'user_id', 'updated_at', 'is_deleted']
};
