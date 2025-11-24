import type { CanvasWidget } from '@/shared/api/db';
import type { RxDocument } from 'rxdb';

interface LinkLayerProps {
    widgets: RxDocument<CanvasWidget>[];
}

export const LinkLayer: React.FC<LinkLayerProps> = ({ widgets }) => {
    // Group widgets by group_id
    const groups = widgets.reduce((acc, widget) => {
        const groupId = widget.group_id;
        if (groupId) {
            if (!acc[groupId]) acc[groupId] = [];
            acc[groupId].push(widget);
        }
        return acc;
    }, {} as Record<string, RxDocument<CanvasWidget>[]>);

    // Generate connections based on group rules
    const renderConnections = () => {
        const connections: JSX.Element[] = [];

        Object.entries(groups).forEach(([groupId, groupWidgets]) => {
            const calendars = groupWidgets.filter(w => w.widget_type === 'calendar_master');
            const smartLists = groupWidgets.filter(w => w.widget_type === 'smart_list');
            const details = groupWidgets.filter(w => w.widget_type === 'detail');

            // Flow 1: Calendar → Smart List
            calendars.forEach(cal => {
                smartLists.forEach(list => {
                    connections.push(renderConnection(cal, list, `${groupId}-cal-list`));
                });
            });

            // Flow 2: Smart List → Detail
            smartLists.forEach(list => {
                details.forEach(detail => {
                    connections.push(renderConnection(list, detail, `${groupId}-list-detail`));
                });
            });
        });

        return connections;
    };

    const renderConnection = (
        source: RxDocument<CanvasWidget>,
        target: RxDocument<CanvasWidget>,
        keyPrefix: string
    ) => {
        const sourceGeo = source.geometry;
        const targetGeo = target.geometry;
        const isPinned = target.view_state?.is_pinned || false;

        return (
            <path
                key={`${keyPrefix}-${source.id}-${target.id}`}
                d={calculatePath(sourceGeo, targetGeo)}
                stroke={isPinned ? '#cbd5e1' : '#94a3b8'}
                strokeWidth="2"
                fill="none"
                strokeDasharray={isPinned ? '5,5' : 'none'}
                markerEnd={isPinned ? 'url(#arrowhead-dashed)' : 'url(#arrowhead)'}
            />
        );
    };

    const calculatePath = (sourceGeo: any, targetGeo: any) => {
        if (!sourceGeo || !targetGeo) return '';

        const startX = sourceGeo.x + sourceGeo.w / 2;
        const startY = sourceGeo.y + sourceGeo.h / 2;
        const endX = targetGeo.x + targetGeo.w / 2;
        const endY = targetGeo.y + targetGeo.h / 2;

        const deltaX = Math.abs(endX - startX);
        const cp1x = startX + deltaX * 0.5;
        const cp1y = startY;
        const cp2x = endX - deltaX * 0.5;
        const cp2y = endY;

        return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
    };

    return (
        <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible"
            style={{ zIndex: 0 }}
        >
            <defs>
                <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                </marker>
                <marker
                    id="arrowhead-dashed"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                </marker>
            </defs>
            {renderConnections()}
        </svg>
    );
};
