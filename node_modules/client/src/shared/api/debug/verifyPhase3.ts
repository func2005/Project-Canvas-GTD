import { dbService } from '../db';
import { format } from 'date-fns';

export async function verifyPhase3() {
    console.log('Starting Phase 3 Verification...');
    const db = dbService.getDatabase();

    // 1. Create Widgets
    console.log('Creating widgets...');
    const canvasId = 'default_canvas'; // Use default canvas to see results immediately

    // Clear existing widgets for clarity? No, let's just add.

    // Smart List
    await db.widgets.insert({
        id: 'widget_list_' + Date.now(),
        canvas_id: canvasId,
        widget_type: 'smart_list',
        geometry: { x: 50, y: 50, w: 300, h: 400, z: 10 },
        data_source_config: {
            mode: 'filter',
            criteria: { do_date: 'today', status: ['active', 'completed'] }
        },
        view_state: {},
        updated_at: new Date().toISOString(),
        is_deleted: false
    });

    // Master Calendar
    await db.widgets.insert({
        id: 'widget_calendar_' + Date.now(),
        canvas_id: canvasId,
        widget_type: 'calendar_master',
        geometry: { x: 400, y: 50, w: 600, h: 500, z: 10 },
        data_source_config: { mode: 'query' },
        view_state: {},
        updated_at: new Date().toISOString(),
        is_deleted: false
    });

    // 2. Create Task
    console.log('Creating task...');
    const taskId = 'task_' + Date.now();
    await db.items.insert({
        id: taskId,
        title: 'Verify Phase 3 Task',
        entity_type: 'task',
        system_status: 'active',
        do_date: format(new Date(), 'yyyy-MM-dd'),
        created_at: Date.now(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        user_id: 'user_1',
        properties: {}
    });

    // Detail Inspector for the task
    await db.widgets.insert({
        id: 'widget_detail_' + Date.now(),
        canvas_id: canvasId,
        widget_type: 'detail',
        geometry: { x: 1050, y: 50, w: 300, h: 400, z: 10 },
        data_source_config: {
            mode: 'query',
            item_id: taskId
        },
        view_state: {},
        updated_at: new Date().toISOString(),
        is_deleted: false
    });

    console.log('Verification data seeded. Please check the canvas.');
}
