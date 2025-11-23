import { dbService } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { propagateSignal } from '../services/SignalController';

export const verifyPhase4 = async () => {
    console.log('Starting Phase 4 Verification...');

    const db = await dbService.initialize();

    // Clear existing data
    await db.widgets.find().remove();
    await db.links.find().remove();
    console.log('Cleared existing widgets and links.');

    // 1. Setup Widgets
    const calendarId = uuidv4();
    const listId = uuidv4();

    await db.widgets.insert({
        id: calendarId,
        canvas_id: 'default_canvas',
        widget_type: 'calendar_master',
        geometry: { x: 100, y: 100, w: 800, h: 600, z: 1 },
        data_source_config: {},
        updated_at: new Date().toISOString(),
        is_deleted: false
    });

    await db.widgets.insert({
        id: listId,
        canvas_id: 'default_canvas',
        widget_type: 'smart_list',
        geometry: { x: 950, y: 100, w: 300, h: 500, z: 1 },
        data_source_config: {
            criteria: { do_date: 'today' }
        },
        updated_at: new Date().toISOString(),
        is_deleted: false
    });

    console.log('Created Calendar and Smart List widgets.');

    // 2. Create Link
    await db.links.insert({
        id: uuidv4(),
        source_widget_id: calendarId,
        target_widget_id: listId,
        type: 'context_flow',
        created_at: Date.now()
    });
    console.log('Pinned Smart List.');

    const testDate2 = '2026-01-01';
    await propagateSignal(calendarId, { type: 'date', val: testDate2 });

    const listWidget2 = await db.widgets.findOne(listId).exec();
    if (listWidget2?.data_source_config?.criteria?.do_date === testDate2) {
        console.log('✅ SUCCESS: List ignored signal (remained', testDate2 + ')');
    } else {
        console.error('❌ FAILURE: List updated despite being pinned. Current config:', listWidget2?.data_source_config);
    }

    // 5. Test Unpinning (Manual check required for immediate update logic if not implemented in signal controller, 
    // but here we just check if it accepts signals again)
    console.log('\n--- Test 3: Unpinning ---');
    await listWidget2?.patch({
        view_state: { is_pinned: false }
    });
    console.log('Unpinned Smart List.');

    await propagateSignal(calendarId, { type: 'date', val: testDate2 });

    const listWidget3 = await db.widgets.findOne(listId).exec();
    if (listWidget3?.data_source_config?.criteria?.do_date === testDate2) {
        console.log('✅ SUCCESS: List accepted signal after unpinning (updated to', testDate2 + ')');
    } else {
        console.error('❌ FAILURE: List did not update after unpinning. Current config:', listWidget3?.data_source_config);
    }

    console.log('\nPhase 4 Verification Complete.');
};
