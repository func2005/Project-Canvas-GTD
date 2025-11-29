import { CanvasPage } from './canvas-page.entity';
export declare class CanvasWidget {
    id: string;
    user_id: string;
    canvas_id: string;
    canvas_page: CanvasPage;
    group_id: string;
    widget_type: string;
    geometry: {
        x: number;
        y: number;
        w: number;
        h: number;
        z: number;
    };
    data_source_config: Record<string, any>;
    view_state: Record<string, any>;
    updated_at: Date;
    deleted: boolean;
}
