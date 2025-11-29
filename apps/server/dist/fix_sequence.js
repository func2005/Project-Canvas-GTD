"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
async function fixSequence() {
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
        const result = await dataSource.query('SELECT MAX(id) as max_id FROM users');
        const maxId = result[0]?.max_id;
        console.log('Max ID:', maxId);
        let startValue = 1000000000;
        if (maxId) {
            const currentMax = parseInt(maxId, 10);
            if (currentMax >= 1000000000) {
                startValue = currentMax + 1;
            }
        }
        console.log('Setting sequence to:', startValue);
        await dataSource.query(`ALTER SEQUENCE users_id_seq RESTART WITH ${startValue};`);
        const seqResult = await dataSource.query("SELECT last_value FROM users_id_seq");
        console.log('New sequence value:', seqResult[0]?.last_value);
    }
    catch (error) {
        console.error('Fix failed:', error);
    }
    finally {
        await dataSource.destroy();
    }
}
fixSequence();
//# sourceMappingURL=fix_sequence.js.map