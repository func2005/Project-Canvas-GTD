import { useState, useEffect } from 'react';
import { debounce } from 'lodash';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { handleGlobalDragEnd } from '@/shared/api/services/DragLogic';
import { LinkLayer } from './LinkLayer';
import { dbService } from '@/shared/api/db';
import { WidgetWrapper } from './WidgetWrapper';
import type { RxDocument } from 'rxdb';
import type { CanvasWidget } from '@/shared/api/db';

interface CanvasBoardProps {
    canvasId?: string;
}

const CANVAS_SIZE = 5000;

const WidgetsLayer = ({
    widgets,
    activeWidgetId,
    setActiveWidgetId,
    onBringToFront,
    scale
}: {
    widgets: RxDocument<CanvasWidget>[],
    activeWidgetId: string | null,
    setActiveWidgetId: (id: string | null) => void,
    onBringToFront: (id: string) => void,
    scale: number
}) => {
    return (
        <div
            className="relative"
            style={{
                width: CANVAS_SIZE,
                height: CANVAS_SIZE,
                backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                backgroundSize: '20px 20px',
            }}
            onMouseDown={() => setActiveWidgetId(null)}
        >
            <LinkLayer widgets={widgets} />
            {widgets.map((widget) => (
                <WidgetWrapper
                    key={widget.id}
                    widget={widget}
                    isActive={activeWidgetId === widget.id}
                    onSetActive={() => setActiveWidgetId(widget.id)}
                    onBringToFront={() => onBringToFront(widget.id)}
                    scale={scale}
                />
            ))}
            <div className="absolute bottom-10 right-10 bg-black/75 text-white px-3 py-1 rounded font-mono text-sm pointer-events-none z-50">
                Scale: {scale.toFixed(3)}
            </div>
        </div>
    );
};

export const CanvasBoard: React.FC<CanvasBoardProps> = ({ canvasId = 'default_canvas' }) => {
    const [isDbReady, setIsDbReady] = useState(false);
    const [widgets, setWidgets] = useState<RxDocument<CanvasWidget>[]>([]);
    const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);

    const [initialState] = useState(() => {
        try {
            const saved = localStorage.getItem('canvas_transform_state');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load canvas state', e);
        }
        return { scale: 1, positionX: 0, positionY: 0 };
    });

    const [scale, setScale] = useState(initialState.scale);

    const handleTransform = debounce((ref: any) => {
        if (!ref.state) return;
        const { scale, positionX, positionY } = ref.state;
        setScale(scale);
        localStorage.setItem('canvas_transform_state', JSON.stringify({ scale, positionX, positionY }));
    }, 500);

    const handleInit = (ref: any) => {
        if (ref.state) {
            setScale(ref.state.scale);
        }
    };

    useEffect(() => {
        dbService.initialize()
            .then(() => {
                console.log('Database initialized successfully');
                setIsDbReady(true);
            })
            .catch(err => console.error('Failed to initialize database:', err));
    }, []);

    useEffect(() => {
        if (!isDbReady) return;

        try {
            const db = dbService.getDatabase();
            const query = db.widgets.find({
                selector: {
                    canvas_id: canvasId,
                    is_deleted: false
                }
            });

            const sub = query.$.subscribe({
                next: (docs) => setWidgets(docs)
            });

            return () => sub.unsubscribe();
        } catch (error) {
            console.error('Failed to subscribe to widgets:', error);
        }
    }, [isDbReady, canvasId]);

    const handleBringToFront = (widgetId: string) => {
        const widget = widgets.find(w => w.id === widgetId);
        if (!widget) return;

        const currentZ = widget.geometry?.z || 0;
        const max = Math.max(...widgets.map(w => w.geometry?.z || 0));

        // Check if already at top and unique
        const isAtTop = currentZ === max;
        const isUniqueTop = widgets.filter(w => (w.geometry?.z || 0) === max).length === 1;

        if (!isAtTop || !isUniqueTop) {
            widget.patch({
                geometry: {
                    ...widget.geometry,
                    z: max + 1
                }
            });
        }
    };

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const [activeDragItem, setActiveDragItem] = useState<any>(null);

    const handleDragStart = (event: any) => {
        if (event.active.data.current) {
            setActiveDragItem(event.active.data.current);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveDragItem(null);
        const db = dbService.getDatabase();
        await handleGlobalDragEnd(event, db);
    };

    if (!isDbReady) {
        return (
            <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-600 text-lg">Initializing database...</div>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen overflow-hidden bg-gray-50">
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <TransformWrapper
                    initialScale={initialState.scale}
                    initialPositionX={initialState.positionX}
                    initialPositionY={initialState.positionY}
                    minScale={0.1}
                    maxScale={4}
                    limitToBounds={false}
                    centerOnInit={false}
                    wheel={{ step: 0.1 }}
                    panning={{
                        velocityDisabled: true,
                        excluded: ['react-draggable', 'widget-header', 'dnd-draggable']
                    }}
                    onTransformed={handleTransform}
                    onInit={handleInit}
                >
                    <TransformComponent
                        wrapperClass="w-full h-full"
                        contentClass=""
                        contentStyle={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
                    >
                        <WidgetsLayer
                            widgets={widgets}
                            activeWidgetId={activeWidgetId}
                            setActiveWidgetId={setActiveWidgetId}
                            onBringToFront={handleBringToFront}
                            scale={scale}
                        />
                    </TransformComponent>
                </TransformWrapper>
                <DragOverlay>
                    {activeDragItem ? (
                        <div
                            className="bg-white p-2 rounded shadow-lg border border-blue-200 w-48 opacity-90 cursor-grabbing origin-top-left"
                            style={{
                                transform: `scale(${scale})`
                            }}
                        >
                            <div className="text-sm font-medium text-gray-700 truncate">
                                {activeDragItem.title || 'Task'}
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
};
