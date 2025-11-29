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
        const tables = ['data_items', 'canvas_widgets'];
        for (const table of tables) {
            console.log(`\nChecking table: ${table}`);
            const columns = await dataSource.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = '${table}'
                ORDER BY ordinal_position;
            `);
            console.table(columns);
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
//# sourceMappingURL=check_db_columns.js.map