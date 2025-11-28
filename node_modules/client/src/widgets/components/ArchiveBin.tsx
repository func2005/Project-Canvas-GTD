import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Archive, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import type { RxDocument } from 'rxdb';
import type { CanvasWidget, DataItem } from '@/shared/api/db';
import { useRxQuery } from '@/shared/api/hooks/useRxDB';
import { format } from 'date-fns';

interface ArchiveBinProps {
    widget: RxDocument<CanvasWidget>;
}

export const ArchiveBin: React.FC<ArchiveBinProps> = ({ widget }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { isOver, setNodeRef } = useDroppable({
        id: `archive_bin_${widget.id}`,
        data: {
            type: 'archive_bin'
        }
    });

    // Lazy load: Only query when expanded
    const items = useRxQuery<DataItem>('items', {
        selector: {
            system_status: 'archived',
            is_deleted: false
        },
        sort: [{ completed_at: 'desc' }],
        limit: 50
    });

    const displayItems = isExpanded ? items : [];

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "w-full h-full flex flex-col rounded-lg border-2 transition-all duration-200 bg-white overflow-hidden",
                isOver
                    ? "bg-red-50 border-red-500 text-red-600 shadow-lg"
                    : "border-gray-200 text-gray-600"
            )}
        >
            {/* Header / Drop Zone */}
            <div
                className={clsx(
                    "flex flex-col items-center justify-center p-4 cursor-pointer transition-colors",
                    isExpanded ? "h-auto border-b border-gray-100" : "h-full",
                    isOver && "bg-red-50"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className={clsx("transition-transform duration-200", isOver && "animate-bounce")}>
                    {isOver ? <Trash2 size={32} /> : <Archive size={32} />}
                </div>
                <span className="mt-2 text-sm font-medium">
                    {isOver ? "Drop to Archive" : "Archive Bin"}
                </span>
                <div className="mt-1 text-xs text-gray-400">
                    {items.length} items
                </div>
                {isExpanded ? <ChevronUp size={16} className="mt-2 text-gray-400" /> : <ChevronDown size={16} className="mt-auto text-gray-400" />}
            </div>

            {/* Expanded List */}
            {isExpanded && (
                <div className="flex-1 overflow-y-auto p-2 bg-gray-50">
                    {displayItems.length === 0 && (
                        <div className="text-center text-gray-400 text-xs py-4">Empty</div>
                    )}
                    {displayItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100 mb-1 text-xs">
                            <span className="truncate flex-1 line-through text-gray-400">{item.title}</span>
                            <span className="text-gray-300 ml-2 whitespace-nowrap">
                                {item.completed_at ? format(new Date(item.completed_at), 'MMM d') : '-'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
