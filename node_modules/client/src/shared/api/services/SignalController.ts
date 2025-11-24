import { dbService } from '../db';

export type SignalPayload =
    | { type: 'date'; val: string; granularity?: 'day' | 'month' }
    | { type: 'item'; id: string }
    | { type: 'clear_project' };

export const propagateSignal = async (sourceId: string, payload: SignalPayload) => {
    try {
        const db = dbService.getDatabase();

        // 1. Get source widget to find its group_id
        const sourceWidget = await db.widgets.findOne(sourceId).exec();
        if (!sourceWidget) return;

        const groupId = sourceWidget.group_id;
        // Note: We allow missing group_id for project detail logic, as it might need to search globally or create new widgets outside the group


        if (!groupId) {
            return;
        }

        // 2. Find all widgets in the same group (excluding source)
        const targetWidgets = await db.widgets.find({
            selector: {
                canvas_id: sourceWidget.canvas_id,
                is_deleted: false,
                id: { $ne: sourceId },
                group_id: groupId
            }
        }).exec();

        if (targetWidgets.length === 0) return;



        // 3. Update logic based on widget types in group
        await Promise.all(targetWidgets.map(async (widget) => {
            // Rule: Pinned widgets ignore signals
            if (widget.view_state?.is_pinned) {
                return;
            }

            let newConfig = { ...widget.data_source_config };
            let hasChanges = false;

            // Rule: Calendar → Smart List
            if (payload.type === 'date' && widget.widget_type === 'smart_list') {
                // Create new criteria with date, explicitly removing project_id
                const { 'properties.project_id': _, ...restCriteria } = newConfig.criteria || {};
                newConfig.criteria = {
                    ...restCriteria,
                    do_date: payload.val,
                    entity_type: 'task' // Ensure entity type is task
                };

                // Update title based on granularity
                if (payload.granularity === 'month') {
                    const date = new Date(payload.val + '-01');
                    newConfig.title = date.toLocaleString('default', { month: 'long' });
                } else {
                    const date = new Date(payload.val);
                    newConfig.title = date.toLocaleString('default', { month: 'long', day: 'numeric' });
                }

                hasChanges = true;
            }
            // Rule: Calendar → Project Header
            else if (payload.type === 'date' && widget.widget_type === 'project_header') {
                newConfig.selected_date = payload.val;
                newConfig.date_granularity = payload.granularity;
                // Clear project_id when switching to date mode
                newConfig.project_id = undefined;
                hasChanges = true;
            }
            // Rule: Smart List → Detail
            else if (payload.type === 'item' && widget.widget_type === 'detail') {
                newConfig.item_id = payload.id;
                hasChanges = true;
            }
            // Rule: Project Item -> Project Header
            else if (payload.type === 'item' && widget.widget_type === 'project_header') {
                // Only update if the signal is directly from a Project item
                const item = await db.items.findOne(payload.id).exec();
                if (item && item.entity_type === 'project') {
                    newConfig.project_id = payload.id;
                    // Clear date when switching to project mode
                    newConfig.selected_date = undefined;
                    newConfig.date_granularity = undefined;
                    hasChanges = true;
                }
            }
            // Rule: Project Item -> Smart List (Task Mode)
            else if (payload.type === 'item' && widget.widget_type === 'smart_list') {
                const item = await db.items.findOne(payload.id).exec();
                if (item && item.entity_type === 'project') {
                    const currentCriteria = widget.data_source_config?.criteria || {};
                    // Only switch if currently showing tasks (or default)
                    if (!currentCriteria.entity_type || currentCriteria.entity_type === 'task') {
                        // Check if already filtering by this project
                        if (currentCriteria['properties.project_id'] === item.id) {
                            // Toggle OFF: Remove project filter
                            const { 'properties.project_id': _, ...restCriteria } = currentCriteria;
                            newConfig.criteria = restCriteria;
                            newConfig.title = widget.data_source_config?.title || 'Tasks';
                        } else {
                            // Toggle ON: Set project filter and clear date
                            const { do_date: _, ...restCriteria } = currentCriteria;
                            newConfig.title = item.title;
                            newConfig.criteria = {
                                ...restCriteria,
                                entity_type: 'task',
                                'properties.project_id': item.id
                            };
                        }
                        hasChanges = true;
                    }
                }
            }
            // Rule: Clear Project -> Smart List (remove project filter)
            else if (payload.type === 'clear_project' && widget.widget_type === 'smart_list') {
                const currentCriteria = widget.data_source_config?.criteria || {};
                // Remove project_id filter if it exists
                if (currentCriteria['properties.project_id']) {
                    const { 'properties.project_id': _, ...restCriteria } = currentCriteria;
                    newConfig.criteria = restCriteria;
                    newConfig.title = widget.data_source_config?.title || 'Tasks';
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                await widget.patch({
                    data_source_config: newConfig
                });
            }
        }));

    } catch (error) {
        console.error('Signal propagation failed:', error);
    }
};
