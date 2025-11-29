"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const uuid_1 = require("uuid");
const BASE_URL = 'http://localhost:3000';
let TOKEN = '';
let USER_ID = '';
async function run() {
    await new Promise(r => setTimeout(r, 5000));
    try {
        console.log('1. Registering...');
        const email = `test-${Date.now()}@example.com`;
        const regRes = await axios_1.default.post(`${BASE_URL}/auth/register`, {
            email,
            password: 'password123'
        });
        TOKEN = regRes.data.access_token;
        const payload = JSON.parse(Buffer.from(TOKEN.split('.')[1], 'base64').toString());
        USER_ID = payload.sub;
        console.log('Registered. User ID:', USER_ID);
        console.log('2. Checking Seeding...');
        const pullRes = await axios_1.default.get(`${BASE_URL}/sync/canvas_widgets/pull`, {
            headers: { Authorization: `Bearer ${TOKEN}` },
            params: { limit: 10 }
        });
        const widgets = pullRes.data.documents;
        console.log(`Pulled ${widgets.length} widgets.`);
        if (widgets.length !== 3)
            throw new Error('Expected 3 seeded widgets');
        console.log('3. Pushing Data...');
        const item1 = {
            id: (0, uuid_1.v4)(),
            entity_type: 'task',
            title: 'Test Task 1',
            updated_at: new Date().toISOString(),
            deleted: false
        };
        await axios_1.default.post(`${BASE_URL}/sync/data_items/push`, [item1], {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        console.log('Pushed item 1');
        console.log('4. Testing Cursor Edge Case...');
        const now = new Date().toISOString();
        const items = [
            { id: (0, uuid_1.v4)(), entity_type: 'task', title: 'Edge 1', updated_at: now, deleted: false },
            { id: (0, uuid_1.v4)(), entity_type: 'task', title: 'Edge 2', updated_at: now, deleted: false },
            { id: (0, uuid_1.v4)(), entity_type: 'task', title: 'Edge 3', updated_at: now, deleted: false }
        ].sort((a, b) => a.id.localeCompare(b.id));
        await axios_1.default.post(`${BASE_URL}/sync/data_items/push`, items, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
        console.log('Pushed 3 items with same timestamp');
        let checkpoint = { updatedAt: '', lastId: '' };
        let allDocs = [];
        console.log('Pulling page 1 (limit 2)...');
        const page1 = await axios_1.default.get(`${BASE_URL}/sync/data_items/pull`, {
            headers: { Authorization: `Bearer ${TOKEN}` },
            params: { limit: 2 }
        });
        allDocs.push(...page1.data.documents);
        checkpoint = page1.data.checkpoint;
        console.log('Checkpoint 1:', checkpoint);
        console.log('Pulling page 2 (limit 2)...');
        const page2 = await axios_1.default.get(`${BASE_URL}/sync/data_items/pull`, {
            headers: { Authorization: `Bearer ${TOKEN}` },
            params: {
                limit: 2,
                checkpoint_time: checkpoint.updatedAt,
                checkpoint_id: checkpoint.lastId
            }
        });
        allDocs.push(...page2.data.documents);
        console.log('Docs pulled:', allDocs.length);
        if (allDocs.length !== 4)
            throw new Error(`Expected 4 docs, got ${allDocs.length}`);
        const ids = new Set(allDocs.map(d => d.id));
        if (ids.size !== 4)
            throw new Error('Duplicate IDs found in pagination');
        console.log('Verification Successful!');
    }
    catch (e) {
        console.error('Verification Failed!');
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Data:', JSON.stringify(e.response.data, null, 2));
        }
        else {
            console.error('Error Message:', e.message);
        }
        process.exit(1);
    }
}
run();
//# sourceMappingURL=verify_server.js.map