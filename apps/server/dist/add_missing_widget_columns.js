"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
async function addMissingColumns() {
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
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        console.log('Adding user_id column...');
        try {
            await queryRunner.query('ALTER TABLE "canvas_widgets" ADD COLUMN IF NOT EXISTS "user_id" character varying');
            await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_canvas_widgets_user_id" ON "canvas_widgets" ("user_id")');
            console.log('user_id added successfully');
        }
        catch (e) {
            console.error('Error adding user_id:', e);
        }
        console.log('Adding group_id column...');
        try {
            await queryRunner.query('ALTER TABLE "canvas_widgets" ADD COLUMN IF NOT EXISTS "group_id" uuid');
            await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_canvas_widgets_group_id" ON "canvas_widgets" ("group_id")');
            console.log('group_id added successfully');
        }
        catch (e) {
            console.error('Error adding group_id:', e);
        }
        await queryRunner.release();
    }
    catch (error) {
        console.error('Migration failed:', error);
    }
    finally {
        await dataSource.destroy();
    }
}
addMissingColumns();
//# sourceMappingURL=add_missing_widget_columns.js.map