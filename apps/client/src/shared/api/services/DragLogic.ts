import { DragEndEvent } from '@dnd-kit/core';
import { ProjectCanvasDatabase, DataItem } from '../db';

export const handleGlobalDragEnd = async (event: DragEndEvent, db: ProjectCanvasDatabase) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current; // { id: 'task_1', entity_type: 'task' }
    const overData = over.data.current;     // { type: 'calendar_cell', date: '2025-11-25' }

    if (!activeData || !overData) return;

    // We only handle tasks for now
    if (activeData.entity_type !== 'task') return;

    try {
        const doc = await db.items.findOne(activeData.id).exec();
        if (!doc) return;



        // Logic Table 5.4 Implementation
        if (overData.type === 'calendar_cell') {
            // Case A: List Item -> Calendar Cell
            await (doc as any).incrementalPatch({
                do_date: overData.date,
                start_time: null // Reset time block
            });
        }
        else if (overData.type === 'matrix_quad') {
            // Case B: List Item -> Matrix Quadrant
            const quad = overData.quad;
            const currentProps = doc.properties || {};
            const newProps = { ...currentProps };
            const updates: Partial<DataItem> = {};

            // Document 6.3.B Logic
            if (quad === 'Q1') { // Important & Urgent
                newProps.priority = 'high';
                updates.do_date = new Date().toISOString().split('T')[0]; // Today
            } else if (quad === 'Q2') { // Important & Not Urgent
                newProps.priority = 'high';
                // Keep existing date
            } else if (quad === 'Q3') { // Not Important & Urgent
                newProps.priority = 'low';
                updates.do_date = new Date().toISOString().split('T')[0]; // Today
            } else if (quad === 'Q4') { // Not Important & Not Urgent
                newProps.priority = 'low';
                updates.system_status = 'dropped';
            }

            updates.properties = newProps;
            await (doc as any).incrementalPatch(updates);
        }
        else if (overData.type === 'smart_list') {
            // Case D: Item -> Smart List
            // Apply target list's criteria to the item
            const criteria = overData.config?.criteria || {};
            const updates: Partial<DataItem> = {};
            const props: any = { ...doc.properties };

            // 1. Handle do_date
            if (criteria.do_date === null) {
                updates.do_date = null;
            } else if (criteria.do_date === 'today') {
                updates.do_date = new Date().toISOString().split('T')[0];
            } else if (criteria.do_date === 'tomorrow') {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                updates.do_date = d.toISOString().split('T')[0];
            } else if (typeof criteria.do_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(criteria.do_date)) {
                // Handle specific date (YYYY-MM-DD)
                updates.do_date = criteria.do_date;
            }
            // Note: complex dates like 'this_week' are hard to map to a single date, ignoring for now

            // 2. Handle properties (project_id, priority, etc.)
            Object.keys(criteria).forEach(key => {
                if (key.startsWith('properties.')) {
                    const propName = key.replace('properties.', '');
                    props[propName] = criteria[key];
                }
            });

            // 3. Handle system_status
            if (criteria.system_status && typeof criteria.system_status === 'string') {
                updates.system_status = criteria.system_status;
            }

            updates.properties = props;
            await (doc as any).incrementalPatch(updates);
        }
        else if (overData.type === 'archive_bin') {
            // Case C: Item -> Archive Bin
            await (doc as any).incrementalPatch({
                system_status: 'completed',
                completed_at: Date.now()
            });
        }
        else if (overData.type === 'project_detail') {
            // Case E: Item -> Project Detail
            const projectId = overData.project_id;
            if (projectId) {
                const currentProps = doc.properties || {};
                await (doc as any).incrementalPatch({
                    properties: {
                        ...currentProps,
                        project_id: projectId
                    }
                });
            }
        }
    } catch (error) {
        console.error('Drag logic failed:', error);
    }
};
