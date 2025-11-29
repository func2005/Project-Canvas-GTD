"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./src/database/entities/user.entity");
const canvas_page_entity_1 = require("./src/database/entities/canvas-page.entity");
const data_item_entity_1 = require("./src/database/entities/data-item.entity");
const canvas_widget_entity_1 = require("./src/database/entities/canvas-widget.entity");
const canvas_link_entity_1 = require("./src/database/entities/canvas-link.entity");
const dotenv = require("dotenv");
dotenv.config();
const ds = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'heshuhan123',
    database: process.env.DB_DATABASE || 'project_canvas_gtd',
    entities: [user_entity_1.User, canvas_page_entity_1.CanvasPage, data_item_entity_1.DataItem, canvas_widget_entity_1.CanvasWidget, canvas_link_entity_1.CanvasLink],
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
//# sourceMappingURL=debug_db.js.map