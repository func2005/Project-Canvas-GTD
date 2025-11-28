"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv = require("dotenv");
dotenv.config();
const AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'heshuhan123',
    database: process.env.DB_DATABASE || 'project_canvas_gtd',
    synchronize: false,
});
async function fixSchema() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected.');
        console.log('Adding user_id column to canvas_widgets...');
        await AppDataSource.query(`
            ALTER TABLE canvas_widgets 
            ADD COLUMN IF NOT EXISTS user_id VARCHAR;
        `);
        console.log('Column added command executed.');
        const result = await AppDataSource.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'canvas_widgets' 
                AND column_name = 'user_id'
            );
        `);
        console.log('Verification - User ID Column Exists:', result[0].exists);
        await AppDataSource.destroy();
    }
    catch (error) {
        console.error('Error:', error);
    }
}
fixSchema();
//# sourceMappingURL=fix_schema.js.map