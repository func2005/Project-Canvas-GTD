"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
async function updateSchema() {
    const dataSource = new typeorm_1.DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'heshuhan123',
        database: process.env.DB_DATABASE || 'project_canvas_gtd',
        synchronize: false,
    });
    try {
        await dataSource.initialize();
        console.log('Database connected');
        console.log('Updating data_items table...');
        await dataSource.query(`
            ALTER TABLE data_items 
            ADD COLUMN IF NOT EXISTS parent_id UUID,
            ADD COLUMN IF NOT EXISTS start_time TIMESTAMP,
            ADD COLUMN IF NOT EXISTS end_time TIMESTAMP,
            ADD COLUMN IF NOT EXISTS sort_order NUMERIC DEFAULT 0,
            ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
            ADD COLUMN IF NOT EXISTS original_event_id UUID;
        `);
        console.log('Updating canvas_widgets table...');
        await dataSource.query(`
            ALTER TABLE canvas_widgets 
            ADD COLUMN IF NOT EXISTS group_id UUID;
        `);
        console.log('Creating indexes...');
        await dataSource.query(`
            CREATE INDEX IF NOT EXISTS IDX_data_items_parent_id ON data_items(parent_id);
            CREATE INDEX IF NOT EXISTS IDX_canvas_widgets_group_id ON canvas_widgets(group_id);
        `);
        console.log('Schema update complete.');
    }
    catch (error) {
        console.error('Schema update failed:', error);
    }
    finally {
        await dataSource.destroy();
    }
}
updateSchema();
//# sourceMappingURL=update_schema.js.map