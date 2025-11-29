"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const canvas_widget_entity_1 = require("./src/modules/canvas-engine/entities/canvas-widget.entity");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
async function debugPullWidgets() {
    const dataSource = new typeorm_1.DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'heshuhan123',
        database: process.env.DB_DATABASE || 'project_canvas_gtd',
        entities: [canvas_widget_entity_1.CanvasWidget],
        synchronize: false,
    });
    try {
        await dataSource.initialize();
        console.log('Database connected');
        const userId = '1000000008';
        const checkpoint = 0;
        const limit = 100;
        const minTimestamp = new Date(checkpoint || 0);
        console.log(`Pulling widgets for user ${userId}. Checkpoint: ${checkpoint}, Limit: ${limit}`);
        const documents = await dataSource.getRepository(canvas_widget_entity_1.CanvasWidget).find({
            where: {
                updated_at: (0, typeorm_1.MoreThan)(minTimestamp),
                user_id: userId
            },
            order: { updated_at: 'ASC' },
            take: limit,
        });
        console.log(`Found ${documents.length} widgets.`);
    }
    catch (error) {
        console.error('Pull failed!');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
    }
    finally {
        await dataSource.destroy();
    }
}
debugPullWidgets();
//# sourceMappingURL=debug_pull_widgets.js.map