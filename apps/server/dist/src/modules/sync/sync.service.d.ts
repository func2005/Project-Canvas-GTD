import { DataSource } from 'typeorm';
import { SyncCheckpoint } from '../../common/interfaces/sync-checkpoint.interface';
export declare class SyncService {
    private dataSource;
    constructor(dataSource: DataSource);
    private getRepo;
    pullChanges(userId: string, collection: string, checkpoint: SyncCheckpoint, limit?: number): Promise<{
        documents: any[];
        checkpoint: SyncCheckpoint;
        hasMore: boolean;
    }>;
    pushChanges(userId: string, collection: string, changes: any[]): Promise<any[]>;
    pushBatchChanges(userId: string, batchDto: any): Promise<{
        pages: any[];
        widgets: any[];
        links: any[];
        items: any[];
    }>;
    private processChanges;
}
