import { dbService } from '../db';
import { handleGlobalDragEnd } from '../services/DragLogic';
import { v4 as uuidv4 } from 'uuid';

export const verifyPhase6 = async () => {
    console.log('Starting Phase 6 Verification...');
    const db = dbService.getDatabase();

    // 1. Setup Ghost Task
    const ghostId = uuidv4();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await db.items.insert({
        id: ghostId,
        title: 'Ghost Task',
        entity_type: 'task',
        system_status: 'active',
        do_date: yesterday.toISOString().split('T')[0],
        created_at: Date.now(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        user_id: 'user_1',
        properties: {}
    });
    console.log('Created Ghost Task:', ghostId);

    // 2. Simulate Drag to Calendar (Tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const mockEvent1: any = {
        active: { data: { current: { id: ghostId, entity_type: 'task' } } },
        over: { data: { current: { type: 'calendar_cell', date: tomorrowStr } } }
    };

    await handleGlobalDragEnd(mockEvent1, db);

    const doc1 = await db.items.findOne(ghostId).exec();
    if (doc1?.do_date === tomorrowStr) {
        console.log('✅ Drag to Calendar Verified');
    } else {
        console.error('❌ Drag to Calendar Failed', doc1?.do_date);
    }

    // 3. Simulate Drag to Archive
    const mockEvent2: any = {
        active: { data: { current: { id: ghostId, entity_type: 'task' } } },
        over: { data: { current: { type: 'archive_bin' } } }
    };

    await handleGlobalDragEnd(mockEvent2, db);

    const doc2 = await db.items.findOne(ghostId).exec();
    if (doc2?.system_status === 'completed') {
        console.log('✅ Drag to Archive Verified');
    } else {
        console.error('❌ Drag to Archive Failed', doc2?.system_status);
    }

    // 4. Simulate Drag to Matrix Q1
    const matrixId = uuidv4();
    await db.items.insert({
        id: matrixId,
        title: 'Matrix Task',
        entity_type: 'task',
        system_status: 'active',
        created_at: Date.now(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        user_id: 'user_1',
        properties: { priority: 'low' }
    });

    const mockEvent3: any = {
        active: { data: { current: { id: matrixId, entity_type: 'task' } } },
        over: { data: { current: { type: 'matrix_quad', quad: 'Q1' } } }
    };

    await handleGlobalDragEnd(mockEvent3, db);

    const doc3 = await db.items.findOne(matrixId).exec();
    if (doc3?.properties.priority === 'high') {
        console.log('✅ Drag to Matrix Q1 Verified');
    } else {
        console.error('❌ Drag to Matrix Q1 Failed', doc3?.properties);
    }

    console.log('Phase 6 Verification Complete');
};
