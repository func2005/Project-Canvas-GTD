import { Repository } from 'typeorm';
import { DataItem } from '../entities/data-item.entity';
export declare class ArchiveService {
    private itemsRepository;
    constructor(itemsRepository: Repository<DataItem>);
    getArchivedItems(page?: number, limit?: number, search?: string): Promise<{
        items: DataItem[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
