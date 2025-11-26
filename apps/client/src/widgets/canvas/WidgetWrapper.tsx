import { useState, useCallback, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Pin, X, LayoutTemplate, Eye, Pencil } from 'lucide-react';
import clsx from 'clsx';
import type { RxDocument } from 'rxdb';
import type { CanvasWidget } from '@/shared/api/db';
import { dbService } from '@/shared/api/db';
import { v4 as uuidv4 } from 'uuid';
import { WidgetFactory } from '../registry';
import { propagateSignal } from '@/shared/api/services/SignalController';

interface WidgetWrapperProps {
    widget: RxDocument<CanvasWidget>;
    isActive: boolean;
    onSetActive: () => void;
    onBringToFront: () => void;
    scale: number;
}

const GRID_SIZE = 50;

const snapToGrid = (value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

export const WidgetWrapper: React.FC<WidgetWrapperProps> = ({ widget, isActive, onSetActive, onBringToFront, scale }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragPreview, setDragPreview] = useState<{ x: number; y: number; w?: number; h?: number } | null>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const rndRef = useRef<Rnd>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const filterMenuRef = useRef<HTMLDivElement>(null);
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    const geometry = widget.geometry;
    const viewState = widget.view_state || {};
    const isPinned = viewState.is_pinned || false;

    // Local state for smooth dragging/resizing
    const [localGeometry, setLocalGeometry] = useState({
        x: geometry.x,
        y: geometry.y,
        w: geometry.w,
        h: geometry.h
    });

    // Sync local state with DB when not dragging
    useEffect(() => {
        if (!isDragging) {
            setLocalGeometry({
                x: geometry.x,
                y: geometry.y,
                w: geometry.w,
                h: geometry.h
            });
        }
    }, [geometry.x, geometry.y, geometry.w, geometry.h]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowAddMenu(false);
            }
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
                setShowFilterMenu(false);
            }
        };

        if (showAddMenu || showFilterMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showAddMenu, showFilterMenu]);

    const handleDragStart = useCallback(() => {
        setIsDragging(true);
    }, []);

    const handleDrag = useCallback((_e: any, d: { x: number; y: number; deltaX: number; deltaY: number }) => {
        setLocalGeometry(prev => ({
            ...prev,
            x: d.x,
            y: d.y
        }));

        setDragPreview({
            x: snapToGrid(d.x),
            y: snapToGrid(d.y)
        });
    }, []);

    const handleDragStop = useCallback((_e: any, d: { x: number; y: number }) => {
        setIsDragging(false);
        setDragPreview(null);

        const snappedX = snapToGrid(d.x);
        const snappedY = snapToGrid(d.y);

        setLocalGeometry(prev => ({
            ...prev,
            x: snappedX,
            y: snappedY
        }));

        widget.patch({
            geometry: {
                ...geometry,
                x: snappedX,
                y: snappedY,
            }
        });
    }, [widget, geometry]);

    const handleResizeStart = useCallback(() => {
        setIsDragging(true);
    }, []);

    const handleResize = useCallback((
        _e: any,
        _direction: any,
        ref: HTMLElement,
        _delta: any,
        position: { x: number; y: number }
    ) => {
        setLocalGeometry({
            x: position.x,
            y: position.y,
            w: ref.offsetWidth,
            h: ref.offsetHeight
        });

        setDragPreview({
            x: snapToGrid(position.x),
            y: snapToGrid(position.y),
            w: snapToGrid(ref.offsetWidth),
            h: snapToGrid(ref.offsetHeight)
        });
    }, []);

    const handleResizeStop = useCallback((
        _e: any,
        _direction: any,
        ref: HTMLElement,
        _delta: any,
        position: { x: number; y: number }
    ) => {
        setIsDragging(false);
        setDragPreview(null);

        const snappedX = snapToGrid(position.x);
        const snappedY = snapToGrid(position.y);
        const snappedW = snapToGrid(ref.offsetWidth);
        const snappedH = snapToGrid(ref.offsetHeight);

        setLocalGeometry({
            x: snappedX,
            y: snappedY,
            w: snappedW,
            h: snappedH
        });

        widget.patch({
            geometry: {
                ...geometry,
                x: snappedX,
                y: snappedY,
                w: snappedW,
                h: snappedH,
            }
        });
    }, [widget, geometry]);

    const handleMouseDown = useCallback((e: MouseEvent) => {
        e.stopPropagation();
        onSetActive();
        onBringToFront();

        // Send appropriate signal based on widget type and mode
        if (widget.widget_type === 'project_header') {
            const selectedDate = widget.data_source_config?.selected_date;
            const dateGranularity = widget.data_source_config?.date_granularity;
            const projectId = widget.data_source_config?.project_id;

            // Date mode: send date signal
            if (selectedDate) {
                propagateSignal(widget.id, {
                    type: 'date',
                    val: selectedDate,
                    granularity: dateGranularity
                });
            }
            // Project mode: send project signal (SignalController will handle toggle)
            else if (projectId) {
                propagateSignal(widget.id, { type: 'item', id: projectId });
            }
        }
    }, [onSetActive, onBringToFront, widget]);

    const handleTogglePin = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        await widget.patch({
            view_state: {
                ...viewState,
                is_pinned: !isPinned,
            }
        });
    }, [widget, viewState, isPinned]);

    const handleAddWidget = useCallback(async (e: React.MouseEvent, widgetType: string) => {
        e.stopPropagation();
        e.preventDefault();

        try {
            const db = dbService.getDatabase();

            // Ensure widget has a group_id, create one if needed
            let currentGroupId = widget.group_id;
            if (!currentGroupId) {
                currentGroupId = uuidv4();
                await widget.patch({
                    group_id: currentGroupId
                });
            }

            // Calculate position: offset from current widget
            const offsetX = 350;
            const offsetY = 50;
            const newX = geometry.x + offsetX;
            const newY = geometry.y + offsetY;

            // Default sizes based on widget type
            const sizes: Record<string, { w: number; h: number }> = {
                smart_list: { w: 300, h: 400 },
                matrix: { w: 500, h: 500 },
                project_header: { w: 400, h: 300 },
                detail: { w: 400, h: 500 },
                timeline: { w: 800, h: 400 }
            };


            const size = sizes[widgetType] || { w: 300, h: 400 };

            // Special handling for Project Hub
            if (widgetType === 'project_header') {
                // Create a new project item
                const projectId = uuidv4();
                await db.items.insert({
                    id: projectId,
                    user_id: 'local',
                    entity_type: 'project',
                    system_status: 'active',
                    title: 'New Project',
                    properties: {
                        content: ''
                    },
                    updated_at: new Date().toISOString(),
                    is_deleted: false,
                    created_at: Date.now()
                });

                // Create Project Header widget
                await db.widgets.insert({
                    id: uuidv4(),
                    canvas_id: widget.canvas_id,
                    widget_type: 'project_header',
                    geometry: {
                        x: newX,
                        y: newY,
                        w: 400,
                        h: 300,
                        z: (geometry.z || 0) + 1
                    },
                    data_source_config: {
                        project_id: projectId
                    },
                    group_id: currentGroupId,
                    view_state: {
                        // group_id moved to top level
                    },
                    updated_at: new Date().toISOString(),
                    is_deleted: false
                });

                console.log(`Created Project Hub (${projectId}) with header in group ${currentGroupId}`);
                return;


            }

            // Prepare data_source_config with smart defaults
            let dataSourceConfig: Record<string, any> = {};

            if (widgetType === 'smart_list') {
                // Default to current month's tasks
                const now = new Date();
                const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const monthName = now.toLocaleString('default', { month: 'long' });

                dataSourceConfig = {
                    title: monthName,
                    criteria: {
                        do_date: currentMonth,
                        entity_type: 'task'
                    }
                };
            }

            // Create new widget in the same group
            await db.widgets.insert({
                id: uuidv4(),
                canvas_id: widget.canvas_id,
                widget_type: widgetType as any,
                geometry: {
                    x: newX,
                    y: newY,
                    w: size.w,
                    h: size.h,
                    z: (geometry.z || 0) + 1
                },
                data_source_config: dataSourceConfig,
                group_id: currentGroupId,
                view_state: {
                    // group_id moved to top level
                },
                updated_at: new Date().toISOString(),
                is_deleted: false
            });

            console.log(`Created ${widgetType} in group ${currentGroupId}`);
        } catch (error) {
            console.error('Failed to create widget:', error);
        }
    }, [widget, geometry, viewState]);

    const handleClose = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        await widget.patch({
            is_deleted: true,
        });
    }, [widget]);

    return (
        <>
            {dragPreview && (
                <div
                    style={{
                        position: 'absolute',
                        left: dragPreview.x,
                        top: dragPreview.y,
                        width: dragPreview.w || geometry.w,
                        height: dragPreview.h || geometry.h,
                        border: '2px dashed #10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '0.5rem',
                        pointerEvents: 'none',
                        zIndex: (geometry.z || 0) - 1,
                    }}
                />
            )}

            <Rnd
                ref={rndRef}
                position={{ x: localGeometry.x, y: localGeometry.y }}
                size={{ width: localGeometry.w, height: localGeometry.h }}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragStop={handleDragStop}
                onResizeStart={handleResizeStart}
                onResize={handleResize}
                onResizeStop={handleResizeStop}
                onMouseDown={handleMouseDown}
                dragHandleClassName="widget-header"
                dragGrid={[1, 1]}
                resizeGrid={[1, 1]}
                scale={scale}
                enableUserSelectHack={false}
                style={{
                    zIndex: geometry.z || 0,
                }}
                className={clsx(
                    'rounded-lg border-2',
                    !isDragging && 'shadow-lg backdrop-blur-sm transition-shadow',
                    isDragging && 'shadow-md',
                    isActive ? 'border-blue-500' : 'border-gray-300'
                )}
            >
                <div
                    className={clsx(
                        'w-full h-full flex flex-col rounded-lg overflow-hidden',
                        isDragging ? 'bg-white' : 'bg-white bg-opacity-95'
                    )}
                    style={{ willChange: isDragging ? 'transform' : 'auto' }}
                >
                    <div className="widget-header flex items-center justify-between bg-gray-100 px-3 py-2 cursor-move border-b border-gray-200 rounded-t-lg">
                        <span className="font-bold text-xs text-gray-600 uppercase tracking-wider">
                            {widget.data_source_config?.title || widget.widget_type.replace('_', ' ')}
                        </span>

                        {widget.widget_type === 'smart_list' && (
                            <div className="relative ml-2" ref={filterMenuRef}>
                                <button
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowFilterMenu(!showFilterMenu);
                                    }}
                                    className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors px-1 py-0.5 rounded hover:bg-gray-200"
                                >
                                    <span className="capitalize">{widget.data_source_config?.criteria?.entity_type || 'All'}</span>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </button>

                                {showFilterMenu && (
                                    <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-[100px]">
                                        {['task', 'event', 'project', 'all'].map((type) => (
                                            <button
                                                key={type}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const newType = type === 'all' ? undefined : type;
                                                    await widget.patch({
                                                        data_source_config: {
                                                            ...widget.data_source_config,
                                                            criteria: {
                                                                ...widget.data_source_config?.criteria,
                                                                entity_type: newType
                                                            }
                                                        }
                                                    });
                                                    setShowFilterMenu(false);
                                                }}
                                                className={clsx(
                                                    "w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors capitalize",
                                                    (widget.data_source_config?.criteria?.entity_type || 'all') === type && "text-blue-600 font-medium bg-blue-50"
                                                )}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex space-x-1" onMouseDown={(e) => e.stopPropagation()}>
                            {/* Add Widget Button - context based on widget type */}
                            {(widget.widget_type === 'calendar_master' || widget.widget_type === 'smart_list') && (
                                <div className="relative" ref={menuRef}>
                                    <button
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowAddMenu(!showAddMenu);
                                        }}
                                        className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-blue-600"
                                        title="Add Widget to Group"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                    {/* Dropdown Menu */}
                                    {showAddMenu && (
                                        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-[120px]">
                                            {widget.widget_type === 'calendar_master' && (
                                                <>
                                                    <button
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            handleAddWidget(e, 'smart_list');
                                                            setShowAddMenu(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                                                    >
                                                        Smart List
                                                    </button>
                                                    <button
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            handleAddWidget(e, 'matrix');
                                                            setShowAddMenu(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                                                    >
                                                        Matrix
                                                    </button>
                                                    <button
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            handleAddWidget(e, 'project_header');
                                                            setShowAddMenu(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                                                    >
                                                        Project Header
                                                    </button>
                                                    <button
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => {
                                                            handleAddWidget(e, 'timeline');
                                                            setShowAddMenu(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                                                    >
                                                        Timeline
                                                    </button>
                                                </>
                                            )}
                                            {widget.widget_type === 'smart_list' && (
                                                <button
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={(e) => {
                                                        handleAddWidget(e, 'detail');
                                                        setShowAddMenu(false);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors"
                                                >
                                                    Detail
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={handleTogglePin}
                                className={clsx(
                                    'p-1 rounded hover:bg-gray-200 transition-colors',
                                    isPinned ? 'text-blue-600' : 'text-gray-400'
                                )}
                                title={isPinned ? 'Unpin Data' : 'Pin Data'}
                            >
                                <Pin size={14} fill={isPinned ? 'currentColor' : 'none'} />
                            </button>
                            <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={handleClose}
                                className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-red-600"
                                title="Close"
                            >
                                <X size={14} />
                            </button>
                            {widget.widget_type !== 'smart_list' && widget.widget_type !== 'calendar_master' && (
                                <button
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await widget.patch({
                                            view_state: {
                                                ...viewState,
                                                // @ts-ignore
                                                is_flipped: !(viewState as any).is_flipped
                                            }
                                        });
                                    }}
                                    className={clsx(
                                        "p-1 rounded hover:bg-gray-200 transition-colors",
                                        (viewState as any).is_flipped ? "text-blue-600" : "text-gray-400 hover:text-blue-600"
                                    )}
                                    title={
                                        ['detail', 'project_detail', 'project_header', 'smart_list'].includes(widget.widget_type)
                                            ? ((viewState as any).is_flipped ? "View Mode" : "Edit Mode")
                                            : "Switch View"
                                    }
                                >
                                    {['detail', 'project_detail', 'project_header', 'smart_list'].includes(widget.widget_type) ? (
                                        (viewState as any).is_flipped ? <Eye size={14} /> : <Pencil size={14} />
                                    ) : (
                                        <LayoutTemplate size={14} />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative" onMouseDown={(e) => e.stopPropagation()}>
                        <WidgetFactory widget={widget} />
                    </div>
                </div>
            </Rnd >
        </>
    );
};
