import { Controller, Get, Query } from '@nestjs/common';
import { ArchiveService } from '../services/archive.service';

@Controller('items')
export class ArchiveController {
    constructor(private readonly archiveService: ArchiveService) { }

    @Get('archive')
    async getArchivedItems(
        @Query('page') page: number,
        @Query('limit') limit: number,
        @Query('q') q: string
    ) {
        return this.archiveService.getArchivedItems(
            page ? Number(page) : 1,
            limit ? Number(limit) : 20,
            q
        );
    }
}
