import { dbService } from '../db';

export type SignalPayload =
    | { type: 'date'; val: string; granularity?: 'day' | 'month' }
    | { type: 'item'; id: string };

export const propagateSignal = async (sourceId: string, payload: SignalPayload) => {
    try {
        const db = dbService.getDatabase();

        // 1. Get source widget to find its group_id
        const sourceWidget = await db.widgets.findOne(sourceId).exec();
        if (!sourceWidget) return;

        const groupId = sourceWidget.view_state?.group_id;
        if (!groupId) {
            console.log(`Signal ignored: Source ${sourceId} has no group_id`);
            return;
        }

        // 2. Find all widgets in the same group (excluding source)
        const targetWidgets = await db.widgets.find({
            selector: {
                canvas_id: sourceWidget.canvas_id,
                is_deleted: false,
                id: { $ne: sourceId },
                'view_state.group_id': groupId
            }
        }).exec();

        if (targetWidgets.length === 0) return;

        console.log(`Propagating signal from ${sourceId} (Group: ${groupId}) to ${targetWidgets.length} widgets`);

        // 3. Update logic based on widget types in group
        await Promise.all(targetWidgets.map(async (widget) => {
            // Rule: Pinned widgets ignore signals
            if (widget.view_state?.is_pinned) {
                console.log(`Signal blocked by pin: ${widget.id}`);
                return;
            }

            let newConfig = { ...widget.data_source_config };
            let hasChanges = false;

            // Rule: Calendar → Smart List
            if (payload.type === 'date' && widget.widget_type === 'smart_list') {
                newConfig.criteria = {
                    ...newConfig.criteria,
                    do_date: payload.val
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
            // Rule: Smart List → Detail
            else if (payload.type === 'item' && widget.widget_type === 'detail') {
                newConfig.item_id = payload.id;
                hasChanges = true;
            }

            if (hasChanges) {
                console.log(`Updating ${widget.widget_type} ${widget.id}:`, newConfig);
                await widget.patch({
                    data_source_config: newConfig
                });
            }
        }));

    } catch (error) {
        console.error('Signal propagation failed:', error);
    }
};
