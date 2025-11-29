import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addMinutes, setHours, setMinutes, differenceInMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { RxDocument } from 'rxdb';
import type { CanvasWidget, DataItem } from '@/shared/api/db';
import { useRxQuery } from '@/shared/api/hooks/useRxDB';
import { propagateSignal } from '@/shared/api/services/SignalController';
import { useDroppable, useDndMonitor } from '@dnd-kit/core';

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

const DroppableTimelineDay = ({ day, startHour, totalMinutes, children, isToday, onClick }: any) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const { setNodeRef } = useDroppable({
        id: `timeline_${dateStr}`,
        data: {
            type: 'timeline_day',
            date: dateStr,
            day,
            startHour,
            totalMinutes
        }
    });

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={clsx(
                "border-r last:border-r-0 relative h-full",
                isToday && "bg-blue-50/30"
            )}
        >
            {children}
        </div>
    );
};

export const MasterCalendar: React.FC<MasterCalendarProps> = ({ widget }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [timelineHeight, setTimelineHeight] = useState(0);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [resizing, setResizing] = useState<{ itemId: string; edge: 'top' | 'bottom'; initialY: number; originalStart: Date; originalEnd: Date } | null>(null);
    const [draggedOverItem, setDraggedOverItem] = useState<{ day: Date; start: Date; end: Date } | null>(null);

    useDndMonitor({
        onDragMove(event) {
            const { active, over } = event;

            // Don't show ghost view for events
            if (active.data.current?.entity_type === 'event') {
                setDraggedOverItem(null);
                return;
            }

            if (!over || !over.data.current || over.data.current.type !== 'timeline_day') {
                setDraggedOverItem(null);
                return;
            }

            const { day, startHour, totalMinutes } = over.data.current;

            // Use active.rect.current.translated if available, otherwise fallback to delta
            let activeRect = active.rect.current.translated;
            if (!activeRect && active.rect.current.initial && event.delta) {
                activeRect = {
                    top: active.rect.current.initial.top + event.delta.y,
                    left: active.rect.current.initial.left + event.delta.x,
                    height: active.rect.current.initial.height,
                    width: active.rect.current.initial.width,
                    bottom: active.rect.current.initial.bottom + event.delta.y,
                    right: active.rect.current.initial.right + event.delta.x
                } as any;
            }
            // Fallback to client rect


            const overRect = over.rect;

            if (activeRect && overRect) {
                const relativeY = activeRect.top - overRect.top;
                const percentage = Math.max(0, Math.min(1, relativeY / overRect.height));
                const minutesFromStart = percentage * totalMinutes;
                const snappedMinutes = Math.round(minutesFromStart / 15) * 15;

                const start = addMinutes(setHours(setMinutes(new Date(day), 0), startHour), snappedMinutes);

                let duration = 45;
                const activeData = active.data.current;
                if (activeData && activeData.start_time && activeData.end_time) {
                    const diff = differenceInMinutes(new Date(activeData.end_time), new Date(activeData.start_time));
                    if (diff > 0) duration = diff;
                }

                const end = addMinutes(start, duration);

                setDraggedOverItem({ day: new Date(day), start, end });
            }
        },
        onDragEnd() {
            setDraggedOverItem(null);
        }
    });

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Week View Range
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Query items for this range
    const query = useMemo(() => {
        const start = viewMode === 'month' ? startDate : weekStart;
        const end = viewMode === 'month' ? endDate : weekEnd;
        return {
            selector: {
                entity_type: { $in: ['task', 'event'] },
                is_deleted: false,
                system_status: { $ne: 'archived' },
                do_date: {
                    $gte: format(start, 'yyyy-MM-dd'),
                    $lte: format(end, 'yyyy-MM-dd')
                }
            }
        };
    }, [viewMode, startDate, endDate, weekStart, weekEnd]);

    const items = useRxQuery<DataItem>('items', query);

    const getItemsForDay = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return items.filter(item => item.do_date === dateStr);
    };

    const handleDayClick = (date: Date, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedDate(date);
        propagateSignal(widget.id, {
            type: 'date',
            val: format(date, 'yyyy-MM-dd'),
            granularity: 'day'
        });
    };

    const handleMonthChange = (newDate: Date) => {
        setCurrentDate(newDate);
        propagateSignal(widget.id, {
            type: 'date',
            val: format(newDate, 'yyyy-MM-dd'),
            granularity: 'month'
        });
    };

    const handleWeekChange = (newDate: Date) => {
        setCurrentDate(newDate);
    };

    const handleBackgroundClick = () => {
        setSelectedDate(null);
    };

    const handleItemClick = (item: DataItem, e: React.MouseEvent) => {
        e.stopPropagation();
        propagateSignal(widget.id, {
            type: 'item',
            id: item.id
        });
    };

    // Resize Logic
    const snapToQuarterHour = useCallback((minutes: number) => {
        return Math.round(minutes / 15) * 15;
    }, []);

    const getTimeFromY = useCallback((yPos: number, day: Date, startHour: number, totalMinutes: number) => {
        if (!timelineRef.current) return null;
        const rect = timelineRef.current.getBoundingClientRect();
        const relativeY = yPos - rect.top;
        const percentage = Math.max(0, Math.min(1, relativeY / rect.height));
        const minutesFromStart = percentage * totalMinutes;

        const snappedMinutes = snapToQuarterHour(minutesFromStart);
        return addMinutes(setHours(setMinutes(day, 0), startHour), snappedMinutes);
    }, [snapToQuarterHour]);

    const handleResizeStart = useCallback((item: DataItem, edge: 'top' | 'bottom', e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!item.start_time || !item.end_time) return;

        setResizing({
            itemId: item.id,
            edge,
            initialY: e.clientY,
            originalStart: new Date(item.start_time),
            originalEnd: new Date(item.end_time)
        });
    }, []);

    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!resizing) return;

        const item = items.find(i => i.id === resizing.itemId);
        if (!item || !item.do_date) return;

        const currentDay = new Date(item.do_date);
        const startHour = 8;
        const endHour = 21;
        const totalMinutes = (endHour - startHour) * 60;

        const newTime = getTimeFromY(e.clientY, currentDay, startHour, totalMinutes);
        if (!newTime) return;

        // Clamp to timeline bounds
        const minTime = setHours(setMinutes(currentDay, 0), startHour);
        const maxTime = setHours(setMinutes(currentDay, 0), endHour);
        const clampedTime = newTime < minTime ? minTime : newTime > maxTime ? maxTime : newTime;

        if (resizing.edge === 'top') {
            // Adjust start_time, keep end_time, enforce min 15-min duration
            const newEnd = new Date(item.end_time!);
            if (differenceInMinutes(newEnd, clampedTime) >= 15) {
                item.patch({ start_time: clampedTime.toISOString() });
            }
        } else {
            // Adjust end_time, keep start_time, enforce min 15-min duration
            const newStart = new Date(item.start_time!);
            if (differenceInMinutes(clampedTime, newStart) >= 15) {
                item.patch({ end_time: clampedTime.toISOString() });
            }
        }
    }, [resizing, items, getTimeFromY]);

    const handleResizeEnd = useCallback(() => {
        setResizing(null);
    }, []);

    useEffect(() => {
        if (!resizing) return;

        window.addEventListener('mousemove', handleResizeMove);
        window.addEventListener('mouseup', handleResizeEnd);

        return () => {
            window.removeEventListener('mousemove', handleResizeMove);
            window.removeEventListener('mouseup', handleResizeEnd);
        };
    }, [resizing, handleResizeMove, handleResizeEnd]);

    useEffect(() => {
        if (viewMode !== 'week') return;
        const node = timelineRef.current;
        if (node) {
            const resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    setTimelineHeight(entry.contentRect.height);
                }
            });
            resizeObserver.observe(node);
            return () => resizeObserver.disconnect();
        }
    }, [viewMode]);

    const renderMonthView = () => (
        <>
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
                                "text-[10px] w-5 h-5 flex items-center justify-center rounded-full leading-none pt-[1px]",
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
                                        {item.recurrence_rule && (
                                            <span className="ml-1 text-gray-500" title="Recurring">↻</span>
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
        </>
    );

    const renderWeekView = () => {
        // Time slots: 08:00 to 21:00
        const startHour = 8;
        const endHour = 21;
        const totalHours = endHour - startHour;
        const totalMinutes = totalHours * 60;

        // Dynamic label density
        const labelInterval = timelineHeight < 300 ? 4 : timelineHeight < 600 ? 2 : 1;

        return (
            <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
                {/* Header */}
                <div className="grid grid-cols-8 border-b bg-gray-50 flex-shrink-0 shadow-sm z-20">
                    <div className="p-2 border-r text-xs text-gray-400 font-medium flex items-end justify-center bg-gray-50">
                        Time
                    </div>
                    {weekDays.map(day => {
                        const isToday = isSameDay(day, new Date());
                        const isSelected = selectedDate && isSameDay(day, selectedDate);

                        return (
                            <div
                                key={day.toISOString()}
                                className={clsx(
                                    "py-2 text-center border-r last:border-r-0 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors",
                                    isToday && "bg-gray-100",
                                    isSelected && !isToday && "bg-blue-50"
                                )}
                                onClick={(e) => handleDayClick(day, e)}
                            >
                                <div className="text-xs text-gray-500 uppercase">{format(day, 'EEE')}</div>
                                <div className={clsx(
                                    "text-sm font-bold w-6 h-6 mx-auto flex items-center justify-center rounded-full mt-1 leading-none pt-[1px]",
                                    isToday ? "bg-blue-500 text-white" : "text-gray-700",
                                    isSelected && !isToday && "bg-blue-200 text-blue-800"
                                )}>
                                    {format(day, 'd')}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Main Content Area (Timeline + Unscheduled) */}
                <div className="flex-1 flex flex-col overflow-hidden relative">

                    {/* Timeline Area (Fills remaining space) */}
                    <div className="flex-1 relative w-full overflow-hidden" ref={timelineRef}>
                        <div className="absolute inset-0 flex">
                            {/* Time Labels Column */}
                            <div className="w-[12.5%] border-r bg-gray-50 flex-shrink-0 relative z-10 h-full">
                                {Array.from({ length: totalHours + 1 }).map((_, i) => {
                                    if (i % labelInterval !== 0) return null;
                                    // Don't show last label if it's too close to bottom
                                    if (i === totalHours) return null;

                                    return (
                                        <div
                                            key={i}
                                            className="absolute w-full text-right pr-2 text-xs text-gray-400 -mt-2"
                                            style={{ top: `${(i / totalHours) * 100}%` }}
                                        >
                                            {`${(startHour + i).toString().padStart(2, '0')}:00`}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Days Columns */}
                            <div className="flex-1 grid grid-cols-7 relative h-full">
                                {/* Grid Lines */}
                                <div className="absolute inset-0 pointer-events-none">
                                    {Array.from({ length: totalHours * 4 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={clsx(
                                                "absolute w-full border-b",
                                                i % 4 === 0 ? "border-gray-200" : "border-gray-100"
                                            )}
                                            style={{ top: `${(i / (totalHours * 4)) * 100}%` }}
                                        />
                                    ))}
                                </div>

                                {/* Day Columns & Tasks */}
                                {weekDays.map(day => {
                                    const dayItems = getItemsForDay(day);
                                    const timedItems = dayItems.filter(item => item.start_time && item.end_time);
                                    const isToday = isSameDay(day, new Date());

                                    return (
                                        <DroppableTimelineDay
                                            key={day.toISOString()}
                                            day={day}
                                            startHour={startHour}
                                            totalMinutes={totalMinutes}
                                            isToday={isToday}
                                        >
                                            {timedItems.map(item => {
                                                const start = new Date(item.start_time!);
                                                const end = new Date(item.end_time!);

                                                // Calculate position
                                                const startMinutes = start.getHours() * 60 + start.getMinutes();
                                                const endMinutes = end.getHours() * 60 + end.getMinutes();
                                                const duration = endMinutes - startMinutes;

                                                // Offset from startHour
                                                const offsetMinutes = startMinutes - (startHour * 60);

                                                const top = (offsetMinutes / totalMinutes) * 100;
                                                const height = (duration / totalMinutes) * 100;

                                                return (
                                                    <div
                                                        key={item.id}
                                                        className={clsx(
                                                            "absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[10px] overflow-hidden border shadow-sm cursor-pointer hover:z-10 hover:ring-1 hover:ring-blue-400",
                                                            item.entity_type === 'event'
                                                                ? "bg-purple-100 border-purple-200 text-purple-800"
                                                                : "bg-blue-100 border-blue-200 text-blue-800"
                                                        )}
                                                        style={{ top: `${top}%`, height: `${height}%` }}
                                                        title={`${format(start, 'HH:mm')} - ${format(end, 'HH:mm')} ${item.title}`}
                                                        onClick={(e) => handleItemClick(item, e)}
                                                    >
                                                        {/* Top Resize Handle */}
                                                        <div
                                                            className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity z-20"
                                                            onMouseDown={(e) => handleResizeStart(item, 'top', e)}
                                                        />

                                                        <div className="truncate leading-tight font-medium">
                                                            {item.title}
                                                            {item.recurrence_rule && <span className="ml-1 text-[8px]" title="Recurring">↻</span>}
                                                        </div>
                                                        <div className="text-[9px] leading-tight opacity-75">
                                                            {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                                                        </div>

                                                        {/* Bottom Resize Handle */}
                                                        <div
                                                            className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-400 opacity-0 hover:opacity-100 transition-opacity z-20"
                                                            onMouseDown={(e) => handleResizeStart(item, 'bottom', e)}
                                                        />
                                                    </div>
                                                );
                                            })}

                                            {/* Ghost Block */}
                                            {draggedOverItem && isSameDay(day, draggedOverItem.day) && (
                                                <div
                                                    className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[10px] overflow-hidden border border-dashed border-blue-400 bg-blue-50/50 z-20 pointer-events-none"
                                                    style={{
                                                        top: `${((draggedOverItem.start.getHours() * 60 + draggedOverItem.start.getMinutes() - startHour * 60) / totalMinutes) * 100}%`,
                                                        height: `${((differenceInMinutes(draggedOverItem.end, draggedOverItem.start)) / totalMinutes) * 100}%`
                                                    }}
                                                >
                                                    <div className="text-blue-600 font-medium">
                                                        {format(draggedOverItem.start, 'HH:mm')} - {format(draggedOverItem.end, 'HH:mm')}
                                                    </div>
                                                </div>
                                            )}
                                        </DroppableTimelineDay>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Unscheduled Area (Fixed at bottom) */}
                    <div className="flex-shrink-0 border-t-4 border-gray-200 bg-gray-50 p-2 z-20 max-h-[40%] overflow-y-auto">
                        <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Unscheduled Tasks</div>
                        <div className="grid grid-cols-8 gap-2">
                            <div className="text-xs text-gray-400 text-right pt-1">All Day</div>
                            <div className="col-span-7 grid grid-cols-7 gap-2">
                                {weekDays.map(day => {
                                    const dayItems = getItemsForDay(day);
                                    const unscheduledItems = dayItems.filter(item => !item.start_time || !item.end_time);

                                    return (
                                        <div key={day.toISOString()} className="flex flex-col gap-1 min-h-[50px] bg-white rounded border border-dashed border-gray-300 p-1">
                                            {unscheduledItems.map(item => (
                                                <div
                                                    key={item.id}
                                                    className={clsx(
                                                        "text-[10px] px-1 py-0.5 rounded border truncate cursor-pointer hover:ring-1 hover:ring-blue-400",
                                                        item.entity_type === 'event'
                                                            ? "bg-purple-50 text-purple-700 border-purple-100"
                                                            : "bg-blue-50 text-blue-700 border-blue-100",
                                                        item.system_status === 'completed' && "opacity-50 line-through"
                                                    )}
                                                    title={item.title}
                                                    onClick={(e) => handleItemClick(item, e)}
                                                >
                                                    {item.title}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            className="flex flex-col h-full bg-white"
            onClick={handleBackgroundClick}
        >
            <div className="flex items-center justify-between p-2 border-b bg-gray-50">
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (viewMode === 'month') handleMonthChange(subMonths(currentDate, 1));
                            else handleWeekChange(subWeeks(currentDate, 1));
                        }}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span
                        onClick={(e) => {
                            e.stopPropagation();
                            if (viewMode === 'month') {
                                handleMonthChange(currentDate);
                            }
                        }}
                        className={clsx(
                            "font-semibold text-gray-700 text-sm w-32 text-center transition-colors select-none",
                            viewMode === 'month' && "cursor-pointer hover:text-blue-600"
                        )}
                        title={viewMode === 'month' ? "Click to broadcast month signal" : ""}
                    >
                        {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : "'Week of' MMM d")}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (viewMode === 'month') handleMonthChange(addMonths(currentDate, 1));
                            else handleWeekChange(addWeeks(currentDate, 1));
                        }}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className="flex bg-gray-200 rounded p-0.5">
                    <button
                        onClick={(e) => { e.stopPropagation(); setViewMode('month'); }}
                        className={clsx(
                            "px-3 py-1 text-xs rounded font-medium transition-colors",
                            viewMode === 'month' ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
                        )}
                    >
                        Month
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setViewMode('week'); }}
                        className={clsx(
                            "px-3 py-1 text-xs rounded font-medium transition-colors",
                            viewMode === 'week' ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
                        )}
                    >
                        Week
                    </button>
                </div>
            </div>

            {viewMode === 'month' ? renderMonthView() : renderWeekView()}
        </div>
    );
};
