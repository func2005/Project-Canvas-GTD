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
}
