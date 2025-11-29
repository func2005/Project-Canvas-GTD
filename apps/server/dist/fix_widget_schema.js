"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
async function fixWidgetSchema() {
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
        console.log('Adding user_id column to canvas_widgets...');
        await dataSource.query(`
            ALTER TABLE canvas_widgets 
            ADD COLUMN IF NOT EXISTS user_id VARCHAR;
        `);
        console.log('Creating index for user_id...');
        await dataSource.query(`
            CREATE INDEX IF NOT EXISTS IDX_canvas_widgets_user_id ON canvas_widgets(user_id);
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
fixWidgetSchema();
//# sourceMappingURL=fix_widget_schema.js.map