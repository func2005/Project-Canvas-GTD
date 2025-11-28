import { SyncService } from '../services/sync.service';
export declare class SyncController {
    private readonly syncService;
    constructor(syncService: SyncService);
    pullItems(checkpoint: number, limit: number, req: any): Promise<{
        documents: import("../entities/data-item.entity").DataItem[];
        checkpoint: number;
    }>;
    pushItems(body: {
        changeRows: any[];
    }, req: any): Promise<{
        written: any[];
        conflicts: any[];
    }>;
    pullWidgets(checkpoint: number, limit: number, req: any): Promise<{
        documents: import("../../canvas-engine/entities/canvas-widget.entity").CanvasWidget[];
        checkpoint: number;
    }>;
    pushWidgets(body: {
        changeRows: any[];
    }, req: any): Promise<{
        written: any[];
        conflicts: any[];
    }>;
}
