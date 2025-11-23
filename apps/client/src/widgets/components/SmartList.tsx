import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Check } from 'lucide-react';
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

import { useDraggable, useDroppable } from '@dnd-kit/core';

const SmartListItem = ({ item, widgetId, onToggle, onSelect }: { item: RxDocument<DataItem>, widgetId: string, onToggle: (item: RxDocument<DataItem>) => void, onSelect: (id: string) => void }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `${widgetId}::${item.id}`,
        data: {
            id: item.id,
            entity_type: 'task',
            title: item.title // Pass title for overlay
        }
    });

    const style = {
        // transform: CSS.Translate.toString(transform), // Disable transform on source, use DragOverlay instead
        opacity: isDragging ? 0.3 : 1, // Make source ghost-like
    };

    const isOverdue = item.do_date && new Date(item.do_date) < new Date(new Date().setHours(0, 0, 0, 0)) && item.system_status === 'active';
    const daysOverdue = isOverdue ? Math.floor((Date.now() - new Date(item.do_date!).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={clsx(
                "group flex items-center gap-2 p-2 rounded hover:bg-gray-50 transition-colors touch-none relative overflow-hidden",
                item.system_status === 'completed' && "opacity-50",
                isOverdue && "bg-red-50 border border-red-100"
            )}
        >
            {isOverdue && (
                <div className="absolute right-1 top-0.5 text-[10px] text-red-500 font-medium px-1 bg-red-100 rounded">
                    {daysOverdue} days ago
                </div>
            )}
            <button
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on checkbox
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle(item);
                }}
                className={clsx(
                    "flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer",
                    item.system_status === 'completed'
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "border-gray-300 text-transparent hover:border-blue-400"
                )}
            >
                <Check size={12} strokeWidth={3} />
            </button>

            <div
                className="flex-1 cursor-pointer hover:text-blue-600"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelect(item.id)}
            >
                <span
                    className={clsx(
                        "text-sm text-gray-700 truncate block",
                        item.system_status === 'completed' && "line-through text-gray-400",
                        isOverdue && "text-red-700"
                    )}
                >
                    {item.properties?.energy_level === 'high' && <span title="High Energy">🔋</span>}
                    {item.properties?.energy_level === 'low' && <span title="Low Energy">☕️</span>}
                    {item.title}
                </span>
            </div>
        </div>
    );
};

export const SmartList: React.FC<SmartListProps> = ({ widget }) => {
    const [newItemTitle, setNewItemTitle] = useState('');
    const config = widget.data_source_config || {};
    const query = useQueryBuilder(config as any);
    const items = useRxQuery<DataItem>('items', query);

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

            await db.items.insert({
                id: uuidv4(),
                title: newItemTitle,
                entity_type: 'task',
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
                    <SmartListItem
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
                        placeholder="Add a task..."
                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400"
                    />
                </div>
            </form>
        </div>
    );
};
