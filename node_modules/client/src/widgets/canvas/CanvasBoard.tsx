import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { debounce } from 'lodash';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { handleGlobalDragEnd } from '@/shared/api/services/DragLogic';
import { LinkLayer } from './LinkLayer';
import { dbService } from '@/shared/api/db';
import { WidgetWrapper } from './WidgetWrapper';
import { AppHeader } from '@/widgets/components/AppHeader';
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
                backgroundColor: '#f8fafc', // slate-50 to ensure dots are visible
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

        </div>
    );
};

export const CanvasBoard: React.FC<CanvasBoardProps> = ({ canvasId = 'default_canvas' }) => {
    const { isDbReady, isAuthenticated } = useAuth();
    const [widgets, setWidgets] = useState<RxDocument<CanvasWidget>[]>([]);
    const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
    const [currentCanvasId, setCurrentCanvasId] = useState<string | null>(canvasId === 'default_canvas' ? null : canvasId);

    const [initialState] = useState(() => {
        try {
            const saved = localStorage.getItem('canvas_transform_state_v3');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load canvas state', e);
        }

        const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const viewportH = typeof window !== 'undefined' ? window.innerHeight : 1080;

        const centerX = CANVAS_SIZE / 2;
        const centerY = CANVAS_SIZE / 2;

        return {
            scale: 1,
            positionX: (viewportW / 2) - centerX,
            positionY: (viewportH / 2) - centerY
        };
    });

    const [scale, setScale] = useState(initialState.scale);

    const handleTransform = debounce((ref: any) => {
        if (!ref.state) return;
        const { scale, positionX, positionY } = ref.state;
        setScale(scale);
        localStorage.setItem('canvas_transform_state_v3', JSON.stringify({ scale, positionX, positionY }));
    }, 500);

    const handleInit = (ref: any) => {
        if (ref.state) {
            setScale(ref.state.scale);
        }
    };

    // Effect to resolve default canvas ID
    useEffect(() => {
        if (!isDbReady) return;

        if (canvasId !== 'default_canvas') {
            setCurrentCanvasId(canvasId);
            return;
        }

        const fetchDefaultPage = async () => {
            try {
                const db = dbService.getDatabase();
                const page = await db.pages.findOne({
                    selector: { is_default: true }
                }).exec();

                if (page) {
                    console.log('CanvasBoard: Using default page', page.id);
                    setCurrentCanvasId(page.id);
                } else {
                    console.warn('CanvasBoard: No default page found yet');
                }
            } catch (err) {
                console.error('CanvasBoard: Failed to fetch default page', err);
            }
        };

        fetchDefaultPage();
    }, [isDbReady, canvasId]);

    useEffect(() => {
        if (!isDbReady || !currentCanvasId) return;

        try {
            const db = dbService.getDatabase();
            const query = db.widgets.find({
                selector: {
                    canvas_id: currentCanvasId,
                    is_deleted: false
                }
            });

            const sub = query.$.subscribe({
                next: (docs) => {
                    console.log('CanvasBoard: Loaded widgets:', docs.length, docs.map(w => ({ id: w.id, x: w.geometry.x, y: w.geometry.y })));
                    setWidgets(docs);
                }
            });

            return () => sub.unsubscribe();
        } catch (error) {
            console.error('Failed to subscribe to widgets:', error);
        }
    }, [isDbReady, currentCanvasId]);

    const handleBringToFront = (widgetId: string) => {
        const widget = widgets.find(w => w.id === widgetId);
        if (!widget) return;

        const currentZ = widget.geometry?.z || 0;
        const max = Math.max(...widgets.map(w => w.geometry?.z || 0));

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

    return (
        <div className="w-screen h-screen overflow-hidden bg-gray-50 flex flex-col">
            <AppHeader
                title="Project Canvas GTD"

                canvasId={currentCanvasId || undefined}
            />

            <div className="flex-1 relative overflow-hidden">
                {!isAuthenticated ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-700 mb-2">Welcome</h2>
                            <p className="text-gray-500">Please login or register to access your canvas.</p>
                        </div>
                    </div>
                ) : !isDbReady ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-gray-600 text-lg">Initializing database...</div>
                    </div>
                ) : (
                    <>
                        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                            <TransformWrapper
                                initialScale={initialState.scale}
                                initialPositionX={initialState.positionX}
                                initialPositionY={initialState.positionY}
                                minScale={0.1}
                                maxScale={4}
                                limitToBounds={true}
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
                        <div className="fixed bottom-4 right-4 bg-white/95 backdrop-blur-sm border-2 border-gray-300 shadow-lg px-3 py-2 rounded-lg font-mono text-xs font-bold text-gray-600 uppercase tracking-wider pointer-events-none z-50">
                            Scale: {scale.toFixed(3)}
                        </div>
                    </>
                )}
            </div >
        </div >
    );
};
