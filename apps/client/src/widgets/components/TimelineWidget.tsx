import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { format, addDays, startOfDay, differenceInMinutes, setHours, setMinutes, addMinutes } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { RxDocument } from 'rxdb';
import type { CanvasWidget, DataItem } from '@/shared/api/db';
import { useRxQuery } from '@/shared/api/hooks/useRxDB';
import { propagateSignal } from '@/shared/api/services/SignalController';

interface TimelineWidgetProps {
    widget: RxDocument<CanvasWidget>;
}

export const TimelineWidget: React.FC<TimelineWidgetProps> = ({ widget }) => {
    const [currentDate, setCurrentDate] = useState(() => {
        if (widget.data_source_config?.selected_date) {
            return new Date(widget.data_source_config.selected_date);
        }
        return new Date();
    });
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync state with widget config changes (signal reception)
    useEffect(() => {
        if (widget.data_source_config?.selected_date) {
            setCurrentDate(new Date(widget.data_source_config.selected_date));
        }
    }, [widget.data_source_config?.selected_date]);

    const [timelineHeight, setTimelineHeight] = useState(0);
    const [resizing, setResizing] = useState<{
        itemId: string;
        edge: 'top' | 'bottom';
        initialY: number;
        originalStart: Date;
        originalEnd: Date;
        proposedStart: Date;
        proposedEnd: Date;
    } | null>(null);

    // 8:00 AM to 9:00 PM (13 hours)
    const startHour = 8;
    const endHour = 21;
    const totalMinutes = (endHour - startHour) * 60;

    // Resize Observer to get container height for dynamic labels
    useEffect(() => {
        const node = containerRef.current;
        if (node) {
            const resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    setTimelineHeight(entry.contentRect.height);
                }
            });
            resizeObserver.observe(node);
            return () => resizeObserver.disconnect();
        }
    }, []);

    // Query items for the current day
    const query = useMemo(() => {
        const start = setHours(startOfDay(currentDate), startHour);
        const end = setHours(startOfDay(currentDate), endHour);

        return {
            selector: {
                entity_type: { $in: ['task', 'event'] },
                is_deleted: false,
                system_status: { $ne: 'archived' },
                // Only show items with start AND end time
                start_time: {
                    $gte: start.toISOString(),
                    $lt: end.toISOString()
                },
                end_time: {
                    $gt: start.toISOString(),
                    $lte: end.toISOString()
                }
            }
        };
    }, [currentDate]);

    const items = useRxQuery<DataItem>('items', query);

    const getItemPosition = (item: DataItem) => {
        if (!item.start_time || !item.end_time) return null;

        let start = new Date(item.start_time);
        let end = new Date(item.end_time);

        // If this item is being resized, use the proposed times
        if (resizing && resizing.itemId === item.id) {
            start = resizing.proposedStart;
            end = resizing.proposedEnd;
        }

        const dayStart = setHours(startOfDay(currentDate), startHour);
        const dayEnd = setHours(startOfDay(currentDate), endHour);

        // Clamp to view bounds
        if (start < dayStart) start = dayStart;
        if (end > dayEnd) end = dayEnd;

        const startOffset = differenceInMinutes(start, dayStart);
        const duration = differenceInMinutes(end, start);

        const top = (startOffset / totalMinutes) * 100;
        const height = (duration / totalMinutes) * 100;

        return { top: `${Math.max(0, top)}%`, height: `${Math.min(100, height)}%` };
    };

    // Resize Logic
    const getTimeFromY = useCallback((yPos: number) => {
        if (!containerRef.current) return null;
        const rect = containerRef.current.getBoundingClientRect();
        const relativeY = yPos - rect.top;
        const percentage = Math.max(0, Math.min(1, relativeY / rect.height));
        const minutesFromStart = percentage * totalMinutes;

        const snappedMinutes = Math.round(minutesFromStart / 15) * 15;
        return addMinutes(setHours(setMinutes(currentDate, 0), startHour), snappedMinutes);
    }, [currentDate, totalMinutes]);

    const handleResizeStart = useCallback((item: DataItem, edge: 'top' | 'bottom', e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!item.start_time || !item.end_time) return;

        const start = new Date(item.start_time);
        const end = new Date(item.end_time);

        setResizing({
            itemId: item.id,
            edge,
            initialY: e.clientY,
            originalStart: start,
            originalEnd: end,
            proposedStart: start,
            proposedEnd: end
        });
    }, []);

    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!resizing) return;

        const newTime = getTimeFromY(e.clientY);
        if (!newTime) return;

        // Clamp to timeline bounds
        const minTime = setHours(setMinutes(currentDate, 0), startHour);
        const maxTime = setHours(setMinutes(currentDate, 0), endHour);
        const clampedTime = newTime < minTime ? minTime : newTime > maxTime ? maxTime : newTime;

        setResizing(prev => {
            if (!prev) return null;

            let newStart = prev.proposedStart;
            let newEnd = prev.proposedEnd;

            if (prev.edge === 'top') {
                // Ensure end time is at least 15 mins after start
                if (differenceInMinutes(prev.originalEnd, clampedTime) >= 15) {
                    newStart = clampedTime;
                    newEnd = prev.originalEnd; // Keep end fixed
                }
            } else {
                // Ensure start time is at least 15 mins before end
                if (differenceInMinutes(clampedTime, prev.originalStart) >= 15) {
                    newEnd = clampedTime;
                    newStart = prev.originalStart; // Keep start fixed
                }
            }

            return {
                ...prev,
                proposedStart: newStart,
                proposedEnd: newEnd
            };
        });
    }, [resizing, getTimeFromY, currentDate]);

    const handleResizeEndCommit = useCallback(() => {
        if (resizing) {
            const item = items.find(i => i.id === resizing.itemId);
            if (item) {
                if (resizing.proposedStart.getTime() !== resizing.originalStart.getTime() ||
                    resizing.proposedEnd.getTime() !== resizing.originalEnd.getTime()) {

                    item.patch({
                        start_time: resizing.proposedStart.toISOString(),
                        end_time: resizing.proposedEnd.toISOString()
                    }).catch(err => console.error("Resize patch failed:", err));
                }
            }
            setResizing(null);
        }
    }, [resizing, items]);

    useEffect(() => {
        if (!resizing) return;
        window.addEventListener('mousemove', handleResizeMove);
        window.addEventListener('mouseup', handleResizeEndCommit);
        return () => {
            window.removeEventListener('mousemove', handleResizeMove);
            window.removeEventListener('mouseup', handleResizeEndCommit);
        };
    }, [resizing, handleResizeMove, handleResizeEndCommit]);

    // Dynamic label density
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
    const labelInterval = timelineHeight < 300 ? 4 : timelineHeight < 600 ? 2 : 1;

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b bg-gray-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentDate(addDays(currentDate, -1))}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="font-semibold text-gray-700 text-sm">
                        {format(currentDate, 'MMMM d, yyyy')}
                    </span>
                    <button
                        onClick={() => setCurrentDate(addDays(currentDate, 1))}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Timeline Body */}
            <div className="flex-1 relative overflow-hidden" ref={containerRef}>
                {/* 15-minute grid lines */}
                {Array.from({ length: totalMinutes / 15 }).map((_, i) => (
                    <div
                        key={`grid-${i}`}
                        className={clsx(
                            "absolute left-12 right-0 border-t",
                            i % 4 === 0 ? "border-gray-200" : "border-gray-50 border-dashed"
                        )}
                        style={{ top: `${(i * 15 / totalMinutes) * 100}%` }}
                    />
                ))}

                {/* Hour Labels */}
                {hours.map((hour, i) => {
                    // Skip labels based on density
                    if (i % labelInterval !== 0) return null;
                    // Don't show last label if it's too close to bottom
                    if (hour === endHour) return null;

                    return (
                        <div
                            key={hour}
                            className="absolute left-0 w-12 text-right pr-2 text-[10px] text-gray-400 -mt-2 bg-white z-10"
                            style={{ top: `${((hour - startHour) / (endHour - startHour)) * 100}%` }}
                        >
                            {hour}:00
                        </div>
                    );
                })}

                {/* Tasks */}
                <div className="absolute top-0 bottom-0 left-12 right-0">
                    {items.map(item => {
                        const pos = getItemPosition(item);
                        if (!pos) return null;

                        return (
                            <div
                                key={item.id}
                                className={clsx(
                                    "absolute left-1 right-1 rounded px-2 py-1 text-xs overflow-hidden border shadow-sm cursor-pointer hover:z-20 hover:ring-1 hover:ring-blue-400 transition-all group",
                                    item.entity_type === 'event'
                                        ? "bg-purple-100 text-purple-700 border-purple-200"
                                        : "bg-blue-100 text-blue-700 border-blue-200",
                                    item.system_status === 'completed' && "opacity-50 grayscale",
                                    resizing?.itemId === item.id && "z-30 ring-2 ring-blue-500 shadow-md"
                                )}
                                style={{
                                    top: pos.top,
                                    height: pos.height
                                }}
                                title={`${item.title} (${item.start_time ? format(new Date(item.start_time), 'HH:mm') : 'All Day'})`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    propagateSignal(widget.id, {
                                        type: 'item',
                                        id: item.id
                                    });
                                }}
                            >
                                {/* Top Resize Handle */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-2 -mt-1 cursor-ns-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                    onMouseDown={(e) => handleResizeStart(item, 'top', e)}
                                />

                                <div className="font-medium leading-tight truncate">{item.title}</div>
                                <div className="text-[10px] opacity-75 truncate">
                                    {item.start_time && format(new Date(item.start_time), 'HH:mm')} - {item.end_time && format(new Date(item.end_time), 'HH:mm')}
                                </div>

                                {/* Bottom Resize Handle */}
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-2 -mb-1 cursor-ns-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                    onMouseDown={(e) => handleResizeStart(item, 'bottom', e)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
