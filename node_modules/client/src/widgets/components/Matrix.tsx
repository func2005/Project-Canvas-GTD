import React, { useMemo } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import { differenceInDays, parseISO } from 'date-fns';
import type { RxDocument } from 'rxdb';
import type { CanvasWidget, DataItem } from '@/shared/api/db';
import { useRxQuery } from '@/shared/api/hooks/useRxDB';

interface MatrixProps {
    widget: RxDocument<CanvasWidget>;
}

const Quadrant = ({ id, label, className, children }: any) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `matrix_${id}`,
        data: {
            type: 'matrix_quad',
            quad: id
        }
    });

    return (
        <div
            ref={setNodeRef}
            className={clsx(
                "relative flex flex-col p-2 border transition-colors",
                className,
                isOver && "bg-blue-50 ring-2 ring-inset ring-blue-400 z-10"
            )}
        >
            <div className="absolute top-2 left-2 text-xs font-bold text-gray-400 uppercase tracking-wider pointer-events-none">
                {label}
            </div>
            {children}
        </div>
    );
};

const MatrixItem = ({ item, widgetId, top, left }: { item: DataItem, widgetId: string, top: string, left: string }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `${widgetId}::${item.id}`,
        data: {
            id: item.id,
            entity_type: 'task',
            title: item.title
        }
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={clsx(
                "absolute w-3 h-3 rounded-full shadow-sm transform -translate-x-1/2 -translate-y-1/2 border border-white cursor-grab active:cursor-grabbing hover:scale-125 transition-transform z-20",
                item.properties?.priority === 'high' ? "bg-red-500" :
                    item.properties?.priority === 'low' ? "bg-gray-400" : "bg-blue-500",
                isDragging && "opacity-30"
            )}
            style={{ top, left }}
            title={`${item.title} (Due: ${item.due_date})`}
        />
    );
};

export const Matrix: React.FC<MatrixProps> = ({ widget: _widget }) => {
    const query = useMemo(() => ({
        selector: {
            entity_type: 'task',
            system_status: 'active',
            is_deleted: false
        }
    }), []);

    const items = useRxQuery<DataItem>('items', query);
    console.log('Matrix Items:', items.length, items[0]);

    const getPosition = (item: DataItem) => {
        // Y Axis: Importance (Priority)
        // High -> Top (10%), Normal -> Middle (50%), Low -> Bottom (90%)
        let top = 50;
        if (item.properties?.priority === 'high') top = 15;
        else if (item.properties?.priority === 'low') top = 85;

        // X Axis: Urgency (Due Date)
        // Formula: 1 / (due_date - today)
        // No due date -> Left buffer (5%)
        let left = 5;

        if (item.due_date) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = parseISO(item.due_date);
            const daysLeft = differenceInDays(due, today);

            if (daysLeft <= 0) {
                // Overdue or today -> Very Right (95%)
                left = 95;
            } else {
                // Formula: 1 / daysLeft
                // daysLeft = 1 -> 1.0 -> 95%
                // daysLeft = 7 -> 0.14 -> ~50%
                // daysLeft = 30 -> 0.03 -> ~10%

                // Mapping 0..1 to 5%..95%
                // We want 1 -> 95%, 0 -> 5%
                const urgency = 1 / daysLeft;

                // Scale urgency to percentage
                // Let's say max urgency (1 day left) is 1.0
                // Min urgency (inf days left) is 0.0

                // Map 0.0-1.0 to 5-95
                left = 5 + (urgency * 90);
            }
        }

        return { top: `${top}%`, left: `${left}%` };
    };

    return (
        <div className="w-full h-full flex flex-col bg-white">
            {/* Axis Labels */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Y Axis Label */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-gray-400 tracking-widest uppercase origin-left translate-x-2">
                    Importance
                </div>
                {/* X Axis Label */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-400 tracking-widest uppercase mb-1">
                    Urgency
                </div>
            </div>

            <div className="flex-1 grid grid-cols-2 grid-rows-2 relative z-0">
                {/* Center Cross Lines */}
                <div className="absolute inset-0 pointer-events-none z-10">
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300 -translate-x-1/2" />
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300 -translate-y-1/2" />
                </div>

                {/* Top Left: Q2 (Important & Not Urgent) */}
                <Quadrant id="Q2" label="Q2: Plan" className="border-r border-b border-gray-100 bg-blue-50/30" />

                {/* Top Right: Q1 (Important & Urgent) */}
                <Quadrant id="Q1" label="Q1: Do" className="border-b border-gray-100 bg-red-50/30" />

                {/* Bottom Left: Q4 (Not Important & Not Urgent) */}
                <Quadrant id="Q4" label="Q4: Drop" className="border-r border-gray-100 bg-gray-50/30" />

                {/* Bottom Right: Q3 (Not Important & Urgent) */}
                <Quadrant id="Q3" label="Q3: Delegate" className="bg-yellow-50/30" />
            </div>

            {/* Render Items as Dots */}
            <div className="absolute inset-0 pointer-events-none">
                {items.map(item => {
                    const pos = getPosition(item);
                    // console.log('Item Pos:', item.title, pos);
                    return (
                        <div key={item.id} className="pointer-events-auto">
                            <MatrixItem
                                item={item}
                                widgetId={_widget.id}
                                top={pos.top}
                                left={pos.left}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
