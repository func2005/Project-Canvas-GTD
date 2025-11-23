import { dbService } from '../db';
import { WidgetService } from '../services/widgetService';

/**
 * Phase 2: Seed the canvas with test widgets
 */
export async function seedPhase2Canvas() {
    console.log('=== Phase 2: Seeding Canvas ===\n');

    try {
        // Initialize database
        await dbService.initialize();

        // Create Master Calendar widget
        console.log('Creating Master Calendar...');
        await WidgetService.createWidget(
            'calendar_master',
            100,
            100,
            800,
            600
        );
        console.log('✓ Calendar created at (100, 100) with size 800×600');

        // Create Smart List widget
        console.log('\nCreating Smart List...');
        await WidgetService.createWidget(
            'smart_list',
            950,
            100,
            300,
            500
        );
        console.log('✓ List created at (950, 100) with size 300×500');

        // Create Pinned Detail widget
        console.log('\nCreating Pinned Detail Inspector...');
        const detail = await WidgetService.createWidget(
            'detail',
            100,
            750,
            400,
            300
        );

        // Update to pinned state
        const db = dbService.getDatabase();
        const detailDoc = await db.widgets.findOne(detail.id).exec();
        if (detailDoc) {
            await detailDoc.patch({
                view_state: {
                    is_pinned: true,
                    is_collapsed: false,
                    view_mode: 'default'
                }
            });
            console.log('✓ Detail created at (100, 750) - PINNED');
        }

        console.log('\n=== Canvas Seeded Successfully! ===');
        console.log('\nCreated 3 widgets on the canvas.');
        console.log('\nYou can now:');
        console.log('  - Drag widgets around (except pinned ones)');
        console.log('  - Resize widgets');
        console.log('  - Click pin icon to lock/unlock');
        console.log('  - Click X to close widgets');
        console.log('  - Use mouse wheel to zoom');
        console.log('  - Click and drag canvas background to pan');

    } catch (error) {
        console.error('Failed to seed canvas:', error);
        throw error;
    }
}

// Expose to window for browser console
if (typeof window !== 'undefined') {
    (window as any).seedPhase2Canvas = seedPhase2Canvas;
}
