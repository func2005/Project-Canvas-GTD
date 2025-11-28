import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Check } from 'lucide-react';
import clsx from 'clsx';
import type { RxDocument } from 'rxdb';
import type { DataItem } from '@/shared/api/db';

interface DraggableListItemProps {
    item: RxDocument<DataItem>;
    widgetId: string;
    onToggle: (item: RxDocument<DataItem>) => void;
    onSelect: (id: string) => void;
}

export const DraggableListItem: React.FC<DraggableListItemProps> = ({ item, widgetId, onToggle, onSelect }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `${widgetId}::${item.id}`,
        data: {
            id: item.id,
            entity_type: item.entity_type,
            title: item.title, // Pass title for overlay
            start_time: item.start_time,
            end_time: item.end_time
        }
    });

    const style = {
        opacity: isDragging ? 0.3 : 1, // Make source ghost-like
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isPastDue = item.entity_type === 'task' && item.due_date && new Date(item.due_date) < today && item.system_status === 'active';
    const isPastDo = item.entity_type === 'task' && item.do_date && new Date(item.do_date) < today && item.system_status === 'active';

    const daysPastDue = isPastDue ? Math.floor((Date.now() - new Date(item.due_date!).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const daysPastDo = isPastDo ? Math.floor((Date.now() - new Date(item.do_date!).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={clsx(
                "group flex items-center gap-2 p-2 rounded hover:bg-gray-50 transition-colors touch-none relative overflow-hidden",
                item.system_status === 'completed' && "opacity-50",
                isPastDue ? "bg-red-50 border border-red-100" :
                    isPastDo ? "bg-yellow-50 border border-yellow-100" : ""
            )}
        >
            {isPastDue && (
                <div className="absolute right-1 top-0.5 text-[10px] text-red-500 font-medium px-1 bg-red-100 rounded">
                    Due {daysPastDue} days ago
                </div>
            )}
            {!isPastDue && isPastDo && (
                <div className="absolute right-1 top-0.5 text-[10px] text-yellow-600 font-medium px-1 bg-yellow-100 rounded">
                    {daysPastDo} days ago
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
                        isPastDue && "text-red-700"
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
