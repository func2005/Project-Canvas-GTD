import { ArchiveService } from '../services/archive.service';
export declare class ArchiveController {
    private readonly archiveService;
    constructor(archiveService: ArchiveService);
    getArchivedItems(page: number, limit: number, q: string): Promise<{
        items: import("../entities/data-item.entity").DataItem[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
