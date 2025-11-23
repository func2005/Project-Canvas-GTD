import { WidgetType } from '@project-canvas/shared-types';
export declare class CanvasWidget {
    id: string;
    canvas_id: string;
    updated_at: Date;
    deleted: boolean;
    widget_type: WidgetType;
    geometry: {
        x: number;
        y: number;
        w: number;
        h: number;
        z: number;
    };
    data_source_config: Record<string, any>;
    view_state: Record<string, any>;
}
