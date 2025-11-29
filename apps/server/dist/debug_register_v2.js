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
        try {
            const seqResult = await dataSource.query("SELECT last_value FROM users_id_seq");
            console.log('Current sequence value:', seqResult[0]?.last_value);
        }
        catch (e) {
            console.log('Could not read sequence:', e.message);
        }
        const maxResult = await dataSource.query('SELECT MAX(id) as max_id FROM users');
        console.log('Max User ID:', maxResult[0]?.max_id);
        const username = 'debug_user_v2_' + Date.now();
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
        const result = {
            success: false,
            dbState: {
                maxId: (await dataSource.query('SELECT MAX(id) as max_id FROM users'))[0]?.max_id,
                sequenceValue: (await dataSource.query("SELECT last_value FROM users_id_seq"))[0]?.last_value
            },
            message: error.message,
            code: error.code,
            detail: error.detail,
            constraint: error.constraint,
            stack: error.stack
        };
        const fs = require('fs');
        fs.writeFileSync('debug_result.json', JSON.stringify(result, null, 2));
        console.error('Registration failed!');
    }
    finally {
        await dataSource.destroy();
    }
}
debugRegister();
//# sourceMappingURL=debug_register_v2.js.map