"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./src/modules/auth/entities/user.entity");
const bcrypt = require("bcrypt");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
async function debugRegister() {
    const dataSource = new typeorm_1.DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'heshuhan123',
        database: process.env.DB_DATABASE || 'project_canvas_gtd',
        entities: [user_entity_1.User],
        synchronize: false,
    });
    try {
        await dataSource.initialize();
        console.log('Database connected');
        const result = await dataSource.query('SELECT MAX(id) as max_id FROM users');
        const maxId = result[0]?.max_id;
        let startValue = 1000000000;
        if (maxId) {
            const currentMax = parseInt(maxId, 10);
            if (currentMax >= 1000000000) {
                startValue = currentMax + 1;
            }
        }
        await dataSource.query(`ALTER SEQUENCE users_id_seq RESTART WITH ${startValue};`);
        console.log(`User ID sequence initialized to ${startValue}`);
        const username = 'debug_user_' + Date.now();
        const password = 'password123';
        const salt = await bcrypt.genSalt();
        const password_hash = await bcrypt.hash(password, salt);
        console.log('Attempting to save user:', username);
        const user = new user_entity_1.User();
        user.username = username;
        user.password_hash = password_hash;
        await dataSource.manager.save(user);
        console.log('User saved successfully:', user);
    }
    catch (error) {
        console.error('Registration failed!');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        if (error.driverError) {
            console.error('Driver Error:', error.driverError);
        }
    }
    finally {
        await dataSource.destroy();
    }
}
debugRegister();
//# sourceMappingURL=debug_register.js.map