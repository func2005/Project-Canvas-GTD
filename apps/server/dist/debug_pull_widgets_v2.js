"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
const canvas_widget_entity_1 = require("./src/modules/canvas-engine/entities/canvas-widget.entity");
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
        const userId = '1000000000';
        const checkpoint = 0;
        const limit = 100;
        const minTimestamp = new Date(checkpoint);
        console.log(`Pulling widgets for user ${userId}. Checkpoint: ${checkpoint}, Limit: ${limit}`);
        const repo = dataSource.getRepository(canvas_widget_entity_1.CanvasWidget);
        console.log('Checking raw SQL...');
        const raw = await repo.query('SELECT * FROM canvas_widgets LIMIT 1');
        if (raw.length > 0) {
            console.log('Column names:', Object.keys(raw[0]));
        }
        else {
            console.log('Table is empty');
        }
        return;
        console.log('Checking user_id...');
        await repo.find({ select: ['user_id'], take: 1 });
        console.log('user_id OK');
        console.log('Checking group_id...');
        await repo.find({ select: ['group_id'], take: 1 });
        console.log('group_id OK');
        console.log('Checking all...');
        const documents = await repo.find({
            where: {
                updated_at: (0, typeorm_1.MoreThan)(minTimestamp),
                user_id: userId
            },
            order: { updated_at: 'ASC' },
            take: limit,
        });
        console.log(`Found ${documents.length} widgets.`);
        console.log('First widget:', documents[0]);
    }
    catch (error) {
        console.error('Pull failed:', error);
    }
    finally {
        await dataSource.destroy();
    }
}
debugPullWidgets();
//# sourceMappingURL=debug_pull_widgets_v2.js.map