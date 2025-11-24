import { useMemo } from 'react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import type { IDataSourceConfig } from '@project-canvas/shared-types';
import type { MangoQuery } from 'rxdb';

export const useQueryBuilder = (config?: IDataSourceConfig): MangoQuery => {
    return useMemo(() => {
        if (!config) return { selector: {} };

        const selector: any = {
            is_deleted: false,
        };

        // Handle criteria
        if (config.criteria) {
            // Entity Type
            if (config.criteria.entity_type) {
                selector.entity_type = config.criteria.entity_type;
            }

            // Status
            if (config.criteria.status) {
                if (Array.isArray(config.criteria.status)) {
                    selector.system_status = { $in: config.criteria.status };
                } else {
                    selector.system_status = config.criteria.status;
                }
            }

            // Do Date Logic
            if (config.criteria.do_date !== undefined) {
                const today = new Date();
                const val = config.criteria.do_date;

                if (val === null) {
                    selector.do_date = null;
                } else if (val === 'today' || /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                    const targetDate = val === 'today' ? format(today, 'yyyy-MM-dd') : val;

                    // Ghost View Logic:
                    // 1. Tasks for the target date
                    // 2. Past incomplete tasks (do_date < targetDate)
                    // 3. Past due incomplete tasks (due_date < targetDate)
                    selector.$or = [
                        { do_date: targetDate },
                        {
                            do_date: { $lt: targetDate },
                            system_status: 'active'
                        },
                        {
                            due_date: { $lt: targetDate },
                            system_status: 'active'
                        }
                    ];
                } else if (val === 'tomorrow') {
                    selector.do_date = format(addDays(today, 1), 'yyyy-MM-dd');
                } else if (val === 'this_week') {
                    const start = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                    const end = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                    selector.do_date = { $gte: start, $lte: end };
                } else if (val === 'this_month') {
                    const start = format(startOfMonth(today), 'yyyy-MM-dd');
                    const end = format(endOfMonth(today), 'yyyy-MM-dd');
                    selector.do_date = { $gte: start, $lte: end };
                } else if (/^\d{4}-\d{2}$/.test(val)) {
                    // Specific month: yyyy-MM
                    const date = new Date(val + '-01');
                    const start = format(startOfMonth(date), 'yyyy-MM-dd');
                    const end = format(endOfMonth(date), 'yyyy-MM-dd');
                    selector.do_date = { $gte: start, $lte: end };
                } else {
                    // Assume it's a direct value or other query object
                    selector.do_date = val;
                }
            }

            // Handle other criteria (e.g. properties.project_id)
            Object.keys(config.criteria).forEach(key => {
                if (!['entity_type', 'status', 'do_date'].includes(key)) {
                    // @ts-ignore
                    selector[key] = config.criteria[key];
                }
            });
        }

        // Default sort if not provided
        // Note: RxDB requires sort fields to be indexed. 
        // Ensure 'sort_order' and 'due_date' are in the schema indexes if used here.
        // For now, we use a safe default or rely on config.
        const sort = config.sort || [{ updated_at: 'desc' }];

        return {
            selector,
            sort
        };
    }, [config]);
};
