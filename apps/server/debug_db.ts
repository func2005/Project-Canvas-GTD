import { DataSource } from 'typeorm';
import { User } from './src/database/entities/user.entity';
import { CanvasPage } from './src/database/entities/canvas-page.entity';
import { DataItem } from './src/database/entities/data-item.entity';
import { CanvasWidget } from './src/database/entities/canvas-widget.entity';
import { CanvasLink } from './src/database/entities/canvas-link.entity';
import * as dotenv from 'dotenv';

dotenv.config();

const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'heshuhan123',
    database: process.env.DB_DATABASE || 'project_canvas_gtd',
    entities: [User, CanvasPage, DataItem, CanvasWidget, CanvasLink],
    synchronize: true,
});

ds.initialize()
    .then(() => {
        console.log('DB Connected!');
        process.exit(0);
    })
    .catch(err => {
        console.error('DB Error:', err);
        process.exit(1);
    });
