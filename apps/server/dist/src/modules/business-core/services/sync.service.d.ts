import { Repository } from 'typeorm';
import { DataItem } from '../entities/data-item.entity';
import { CanvasWidget } from '../../canvas-engine/entities/canvas-widget.entity';
export declare class SyncService {
    private itemsRepository;
    private widgetsRepository;
    constructor(itemsRepository: Repository<DataItem>, widgetsRepository: Repository<CanvasWidget>);
    pullItems(checkpoint: number, limit: number, userId: string): Promise<{
        documents: DataItem[];
        checkpoint: number;
    }>;
    pushItems(changeRows: any[], userId: string): Promise<{
        written: any[];
        conflicts: any[];
    }>;
    pullWidgets(checkpoint: number, limit: number, userId: string): Promise<{
        documents: CanvasWidget[];
        checkpoint: number;
    }>;
    pushWidgets(changeRows: any[], userId: string): Promise<{
        written: any[];
        conflicts: any[];
    }>;
}
