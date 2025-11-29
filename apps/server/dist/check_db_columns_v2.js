"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
async function checkColumns() {
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
        const checks = {
            data_items: [
                'parent_id',
                'start_time',
                'end_time',
                'sort_order',
                'recurrence_rule',
                'original_event_id',
                'user_id'
            ],
            canvas_widgets: [
                'group_id',
                'user_id'
            ]
        };
        for (const [table, columns] of Object.entries(checks)) {
            console.log(`\nChecking table: ${table}`);
            const dbColumns = await dataSource.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = '${table}'
            `);
            const existingCols = new Set(dbColumns.map(c => c.column_name));
            const colTypes = Object.fromEntries(dbColumns.map(c => [c.column_name, c.data_type]));
            for (const col of columns) {
                if (existingCols.has(col)) {
                    console.log(`[OK] ${col} exists (type: ${colTypes[col]})`);
                }
                else {
                    console.log(`[MISSING] ${col}`);
                }
            }
        }
    }
    catch (error) {
        console.error('Check failed:', error);
    }
    finally {
        await dataSource.destroy();
    }
}
checkColumns();
//# sourceMappingURL=check_db_columns_v2.js.map