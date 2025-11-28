import { DataSource } from 'typeorm';
import { CanvasWidget } from './src/modules/canvas-engine/entities/canvas-widget.entity';
import { DataItem } from './src/modules/business-core/entities/data-item.entity';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'heshuhan123',
    database: process.env.DB_DATABASE || 'project_canvas_gtd',
    entities: [CanvasWidget, DataItem],
    synchronize: false,
});

async function checkData() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected.');

        const widgetRepo = AppDataSource.getRepository(CanvasWidget);
        const itemRepo = AppDataSource.getRepository(DataItem);

        const widgetCount = await widgetRepo.count();
        console.log(`Total Widgets: ${widgetCount}`);

        const widgets = await widgetRepo.find({ take: 5 });
        console.log('Sample Widgets:', JSON.stringify(widgets, null, 2));

        const itemCount = await itemRepo.count();
        console.log(`Total Items: ${itemCount}`);

        const items = await itemRepo.find({ take: 5 });
        console.log('Sample Items:', JSON.stringify(items, null, 2));

        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkData();
