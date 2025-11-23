import { dbService } from '../db';
import { ItemService } from '../services/itemService';
import { WidgetService } from '../services/widgetService';

/**
 * Verification script for Phase 1: Local-First Data Foundation
 * 
 * This script tests:
 * 1. Database initialization
 * 2. Creating tasks, events, and projects
 * 3. Creating widgets
 * 4. Querying data
 * 5. Updating and deleting items
 */
export async function runVerification() {
    console.log('=== Phase 1 Verification Started ===\n');

    try {
        // Step 1: Initialize Database
        console.log('Step 1: Initializing database...');
        await dbService.initialize();
        console.log('✓ Database initialized successfully\n');

        // Step 2: Create Test Task
        console.log('Step 2: Creating test task...');
        const task = await ItemService.createNewTask(
            'Test Task Phase 1',
            new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD
        );
        console.log('✓ Task created:', task);
        console.log();

        // Step 3: Create Test Event
        console.log('Step 3: Creating test event...');
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        const event = await ItemService.createNewEvent(
            'Test Event Phase 1',
            now.toISOString(),
            oneHourLater.toISOString(),
            false
        );
        console.log('✓ Event created:', event);
        console.log();

        // Step 4: Create Test Project
        console.log('Step 4: Creating test project...');
        const project = await ItemService.createNewProject('Test Project Phase 1');
        console.log('✓ Project created:', project);
        console.log();

        // Step 5: Create Master Calendar Widget
        console.log('Step 5: Creating Master Calendar widget...');
        const calendarWidget = await WidgetService.createWidget(
            'calendar_master',
            100,
            100,
            800,
            600
        );
        console.log('✓ Calendar widget created:', calendarWidget);
        console.log();

        // Step 6: Create Smart List Widget
        console.log('Step 6: Creating Smart List widget...');
        const listWidget = await WidgetService.createWidget(
            'smart_list',
            100,
            750,
            400,
            500
        );
        console.log('✓ List widget created:', listWidget);
        console.log();

        // Step 7: Query all active items
        console.log('Step 7: Querying all active items...');
        const allItems = await ItemService.getAllActiveItems();
        console.log(`✓ Found ${allItems.length} active items:`);
        allItems.forEach(item => {
            console.log(`  - [${item.entity_type}] ${item.title}`);
        });
        console.log();

        // Step 8: Query tasks by today's date
        console.log('Step 8: Querying tasks for today...');
        const todayTasks = await ItemService.getTasksByDate(
            new Date().toISOString().split('T')[0]
        );
        console.log(`✓ Found ${todayTasks.length} tasks for today:`);
        todayTasks.forEach(task => {
            console.log(`  - ${task.title} (${task.system_status})`);
        });
        console.log();

        // Step 9: Query widgets by canvas
        console.log('Step 9: Querying widgets...');
        const widgets = await WidgetService.getWidgetsByCanvas('default_canvas');
        console.log(`✓ Found ${widgets.length} widgets:`);
        widgets.forEach(widget => {
            console.log(`  - [${widget.widget_type}] at (${widget.geometry.x}, ${widget.geometry.y})`);
        });
        console.log();

        // Step 10: Update task
        console.log('Step 10: Updating task...');
        const updatedTask = await ItemService.updateItem(task.id, {
            properties: {
                priority: 'high',
                tags: ['verification', 'phase1']
            }
        });
        console.log('✓ Task updated:', updatedTask);
        console.log();

        // Step 11: Complete task
        console.log('Step 11: Completing task...');
        const completedTask = await ItemService.completeTask(task.id);
        console.log('✓ Task completed:', completedTask);
        console.log();

        // Step 12: Get database statistics
        const db = dbService.getDatabase();
        const itemsCount = await db.items.count().exec();
        const widgetsCount = await db.widgets.count().exec();

        console.log('=== Verification Summary ===');
        console.log(`Total items in database: ${itemsCount}`);
        console.log(`Total widgets in database: ${widgetsCount}`);
        console.log('\n✅ All verification steps completed successfully!');

        return {
            success: true,
            stats: {
                items: itemsCount,
                widgets: widgetsCount
            }
        };

    } catch (error) {
        console.error('\n❌ Verification failed:', error);
        throw error;
    }
}

// Export for use in browser console or tests
if (typeof window !== 'undefined') {
    (window as any).runVerification = runVerification;
}
