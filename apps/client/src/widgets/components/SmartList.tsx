import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import type { RxDocument } from 'rxdb';
import type { CanvasWidget, DataItem } from '@/shared/api/db';
import { useQueryBuilder } from '@/shared/api/hooks/useQueryBuilder';
import { useRxQuery } from '@/shared/api/hooks/useRxDB';
import { dbService } from '@/shared/api/db';
import { propagateSignal } from '@/shared/api/services/SignalController';

interface SmartListProps {
    widget: RxDocument<CanvasWidget>;
}

import { useDroppable } from '@dnd-kit/core';
import { DraggableListItem } from './DraggableListItem';



export const SmartList: React.FC<SmartListProps> = ({ widget }) => {
    const [newItemTitle, setNewItemTitle] = useState('');
    const config = widget.data_source_config || {};
    const query = useQueryBuilder(config as any);
    const rawItems = useRxQuery<DataItem>('items', query);

    // Sort items: Ghost Tasks (Overdue) first
    const items = [...rawItems].sort((a, b) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const aPastDue = a.due_date && new Date(a.due_date) < today && a.system_status === 'active';
        const bPastDue = b.due_date && new Date(b.due_date) < today && b.system_status === 'active';

        if (aPastDue && !bPastDue) return -1;
        if (!aPastDue && bPastDue) return 1;

        const aPastDo = a.do_date && new Date(a.do_date) < today && a.system_status === 'active';
        const bPastDo = b.do_date && new Date(b.do_date) < today && b.system_status === 'active';

        if (aPastDo && !bPastDo) return -1;
        if (!aPastDo && bPastDo) return 1;

        return 0;
    });

    const handleToggleComplete = async (item: RxDocument<DataItem>) => {
        const newStatus = item.system_status === 'completed' ? 'active' : 'completed';
        await (item as any).incrementalPatch({
            system_status: newStatus,
            completed_at: newStatus === 'completed' ? Date.now() : null
        });
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemTitle.trim()) return;

        try {
            const db = dbService.getDatabase();

            // Determine do_date based on filter
            let doDate = null;
            const criteria = config?.criteria || {};
            const criteriaDate = criteria.do_date;

            console.log('Adding item with criteria:', criteria);

            if (criteriaDate === 'today') {
                doDate = format(new Date(), 'yyyy-MM-dd');
            } else if (criteriaDate && /^\d{4}-\d{2}-\d{2}$/.test(criteriaDate)) {
                // If it's a specific date (yyyy-MM-dd), use it
                doDate = criteriaDate;
            } else if (criteriaDate && /^\d{4}-\d{2}$/.test(criteriaDate)) {
                // If it's a month (yyyy-MM), default to today if within month, or 1st of month
                // For now, let's just use today if it matches the month, otherwise 1st
                const today = new Date();
                if (format(today, 'yyyy-MM') === criteriaDate) {
                    doDate = format(today, 'yyyy-MM-dd');
                } else {
                    doDate = `${criteriaDate}-01`;
                }
            }

            console.log('Calculated do_date:', doDate);

            // Apply other properties from criteria (e.g. project_id)
            const properties: any = {};
            Object.keys(criteria).forEach(key => {
                if (key.startsWith('properties.')) {
                    const propName = key.replace('properties.', '');
                    properties[propName] = criteria[key];
                }
            });

            // Determine entity_type based on filter
            let entityType: 'task' | 'event' | 'project' = 'task';
            const filterType = criteria.entity_type;
            if (filterType && ['task', 'event', 'project'].includes(filterType)) {
                entityType = filterType as any;
            }

            await db.items.insert({
                id: uuidv4(),
                title: newItemTitle,
                entity_type: entityType,
                system_status: 'active',
                created_at: Date.now(),
                updated_at: new Date().toISOString(),
                is_deleted: false,
                user_id: 'user_1', // Placeholder
                do_date: doDate,
                properties: properties
            });

            setNewItemTitle('');
        } catch (error) {
            console.error('Failed to add item:', error);
        }
    };

    const { setNodeRef, isOver } = useDroppable({
        id: `smart_list_${widget.id}`,
        data: {
            type: 'smart_list',
            config: widget.data_source_config
        }
    });

    const filterType = (config?.criteria?.entity_type || 'task') as string;
    const placeholderText = ({
        task: 'Add a task...',
        event: 'Add an event...',
        project: 'Add a project...',
        all: 'Add a task...'
    } as Record<string, string>)[filterType] || 'Add a task...';

    // @ts-ignore
    const isFlipped = widget.view_state?.is_flipped;

    if (isFlipped) {
        return (
            <div className="flex flex-col h-full bg-white p-4 overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
                <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">List Settings</h3>

                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">List Title</label>
                        <input
                            type="text"
                            defaultValue={config.title || ''}
                            onBlur={(e) => widget.patch({ data_source_config: { ...config, title: e.target.value } })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none"
                            placeholder="My List"
                        />
                    </div>

                    {/* Entity Type */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Item Type</label>
                        <select
                            defaultValue={config.criteria?.entity_type || 'task'}
                            onChange={(e) => widget.patch({
                                data_source_config: {
                                    ...config,
                                    criteria: { ...config.criteria, entity_type: e.target.value }
                                }
                            })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none bg-white"
                        >
                            <option value="task">Tasks</option>
                            <option value="event">Events</option>
                            <option value="project">Projects</option>
                            <option value="all">All Types</option>
                        </select>
                    </div>

                    {/* Date Filter */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Date Filter</label>
                        <select
                            defaultValue={config.criteria?.do_date || ''}
                            onChange={(e) => widget.patch({
                                data_source_config: {
                                    ...config,
                                    criteria: { ...config.criteria, do_date: e.target.value || null }
                                }
                            })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none bg-white"
                        >
                            <option value="">Any Date</option>
                            <option value="today">Today</option>
                            <option value={format(new Date(), 'yyyy-MM-dd')}>Today (Fixed: {format(new Date(), 'yyyy-MM-dd')})</option>
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">
                            * Drag a date from calendar to set specific date
                        </p>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select
                            defaultValue={config.criteria?.system_status || 'active'}
                            onChange={(e) => widget.patch({
                                data_source_config: {
                                    ...config,
                                    criteria: { ...config.criteria, system_status: e.target.value }
                                }
                            })}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none bg-white"
                        >
                            <option value="active">Active Only</option>
                            <option value="completed">Completed Only</option>
                            <option value="all">All Statuses</option>
                        </select>
                    </div>

                    <button
                        onClick={() => widget.patch({ view_state: { ...widget.view_state, is_flipped: false } as any })}
                        className="w-full bg-blue-500 text-white rounded py-1.5 text-sm font-medium hover:bg-blue-600 transition-colors mt-4"
                    >
                        Done
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "flex flex-col h-full bg-white transition-colors",
                isOver && "bg-blue-50 ring-2 ring-blue-200 ring-inset"
            )}
        >
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
                {items.length === 0 && (
                    <div className="text-center text-gray-400 py-4 text-sm">
                        No items found
                    </div>
                )}

                {items.map((item) => (
                    <DraggableListItem
                        key={item.id}
                        item={item}
                        widgetId={widget.id}
                        onToggle={handleToggleComplete}
                        onSelect={(id) => propagateSignal(widget.id, { type: 'item', id })}
                    />
                ))}
            </div>

            <form onSubmit={handleAddItem} className="p-2 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded px-2 py-1.5 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
                    <Plus size={16} className="text-gray-400" />
                    <input
                        type="text"
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        placeholder={placeholderText}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400"
                    />
                </div>
            </form>
        </div>
    );
};
