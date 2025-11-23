import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { RxDocument } from 'rxdb';
import type { CanvasWidget, DataItem } from '@/shared/api/db';
import { useRxQuery } from '@/shared/api/hooks/useRxDB';
import { propagateSignal } from '@/shared/api/services/SignalController';
import { useDroppable } from '@dnd-kit/core';

interface MasterCalendarProps {
    widget: RxDocument<CanvasWidget>;
}

const DroppableCell = ({ dateStr, isCurrentMonth, isToday, isSelected, onClick, children }: any) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `cell_${dateStr}`,
        data: {
            type: 'calendar_cell',
            date: dateStr
        }
    });

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={clsx(
                "p-1 flex flex-col gap-0.5 overflow-hidden transition-colors cursor-pointer",
                !isCurrentMonth ? "bg-gray-100 text-gray-400" : "bg-white",
                isToday && !isSelected && "bg-blue-50",
                isSelected && "bg-blue-100 ring-2 ring-inset ring-blue-500",
                isOver && "bg-green-100 ring-2 ring-inset ring-green-500 z-10"
            )}
        >
            {children}
        </div>
    );
};

export const MasterCalendar: React.FC<MasterCalendarProps> = ({ widget }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Query items for this range
    const query = useMemo(() => ({
        selector: {
            entity_type: { $in: ['task', 'event'] },
            is_deleted: false,
            system_status: { $ne: 'archived' },
            do_date: {
                $gte: format(startDate, 'yyyy-MM-dd'),
                $lte: format(endDate, 'yyyy-MM-dd')
            }
        }
    }), [startDate, endDate]);

    const items = useRxQuery<DataItem>('items', query);

    const getItemsForDay = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return items.filter(item => item.do_date === dateStr);
    };

    const handleDayClick = (day: Date, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedDate(day);
        const dateStr = format(day, 'yyyy-MM-dd');
        console.log('Selected date:', dateStr);

        // Propagate signal to downstream widgets
        propagateSignal(widget.id, { type: 'date', val: dateStr, granularity: 'day' });
    };

    const handleMonthChange = (newDate: Date) => {
        setCurrentDate(newDate);
        setSelectedDate(null); // Clear selection on month change
        const monthStr = format(newDate, 'yyyy-MM');
        console.log('Selected month:', monthStr);
        propagateSignal(widget.id, { type: 'date', val: monthStr, granularity: 'month' });
    };

    const handleBackgroundClick = () => {
        if (selectedDate) {
            setSelectedDate(null);
            const monthStr = format(currentDate, 'yyyy-MM');
            console.log('Cleared selection, reverting to month:', monthStr);
            propagateSignal(widget.id, { type: 'date', val: monthStr, granularity: 'month' });
        }
    };

    return (
        <div
            className="flex flex-col h-full bg-white"
            onClick={handleBackgroundClick}
        >
            <div className="flex items-center justify-between p-2 border-b bg-gray-50">
                <button
                    onClick={(e) => { e.stopPropagation(); handleMonthChange(subMonths(currentDate, 1)); }}
                    className="p-1 hover:bg-gray-200 rounded text-gray-600"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="font-semibold text-gray-700 text-sm">
                    {format(currentDate, 'MMMM yyyy')}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); handleMonthChange(addMonths(currentDate, 1)); }}
                    className="p-1 hover:bg-gray-200 rounded text-gray-600"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            <div className="grid grid-cols-7 bg-gray-200 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-gray-50 py-1 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-px bg-gray-200 overflow-hidden">
                {days.map(day => {
                    const dayItems = getItemsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const dateStr = format(day, 'yyyy-MM-dd');

                    return (
                        <DroppableCell
                            key={day.toISOString()}
                            dateStr={dateStr}
                            isCurrentMonth={isCurrentMonth}
                            isToday={isToday}
                            isSelected={isSelected}
                            onClick={(e: React.MouseEvent) => handleDayClick(day, e)}
                        >
                            <span className={clsx(
                                "text-[10px] w-4 h-4 flex items-center justify-center rounded-full",
                                isToday ? "bg-blue-500 text-white font-bold" : "text-gray-500",
                                isSelected && !isToday && "bg-blue-200 text-blue-800 font-bold"
                            )}>
                                {format(day, 'd')}
                            </span>

                            <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                                {dayItems.slice(0, 3).map(item => (
                                    <div
                                        key={item.id}
                                        className={clsx(
                                            "text-[9px] truncate px-1 rounded border",
                                            item.entity_type === 'event'
                                                ? "bg-purple-50 text-purple-700 border-purple-100"
                                                : "bg-blue-50 text-blue-700 border-blue-100",
                                            item.system_status === 'completed' && "opacity-50 line-through grayscale"
                                        )}
                                        title={item.title}
                                    >
                                        {item.title}
                                        {item.do_date && item.due_date && item.do_date > item.due_date && (
                                            <span className="ml-1 text-red-500 font-bold" title="Do Date > Due Date">⚠️</span>
                                        )}
                                    </div>
                                ))}
                                {dayItems.length > 3 && (
                                    <div className="text-[8px] text-gray-400 pl-1">
                                        +{dayItems.length - 3}
                                    </div>
                                )}
                            </div>
                        </DroppableCell>
                    );
                })}
            </div>
        </div>
    );
};
