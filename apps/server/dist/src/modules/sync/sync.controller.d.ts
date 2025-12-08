import { SyncService } from './sync.service';
import { SyncCheckpoint } from '../../common/interfaces/sync-checkpoint.interface';
export declare class SyncController {
    private syncService;
    constructor(syncService: SyncService);
    pull(req: any, collection: string, checkpointTime: string, checkpointId: string, limit: number): Promise<{
        documents: any[];
        checkpoint: SyncCheckpoint;
        hasMore: boolean;
    }>;
    pushBatch(req: any, body: any): Promise<{
        pages: any[];
        widgets: any[];
        links: any[];
        items: any[];
    }>;
    push(req: any, collection: string, changes: any[]): Promise<any[]>;
}
