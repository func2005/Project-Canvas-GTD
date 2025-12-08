import { Controller, Get, Post, Body, Query, Param, UseGuards, Req, Request } from '@nestjs/common';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SyncCheckpoint } from '../../common/interfaces/sync-checkpoint.interface';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
    constructor(private syncService: SyncService) { }

    @Get(':collection/pull')
    async pull(
        @Req() req,
        @Param('collection') collection: string,
        @Query('checkpoint_time') checkpointTime: string,
        @Query('checkpoint_id') checkpointId: string,
        @Query('limit') limit: number
    ) {
        const checkpoint: SyncCheckpoint = {
            updatedAt: checkpointTime,
            lastId: checkpointId
        };
        return this.syncService.pullChanges(req.user.id, collection, checkpoint, limit || 100);
    }

    @Post('batch/push')
    async pushBatch(@Request() req, @Body() body: any) {
        return this.syncService.pushBatchChanges(req.user.id, body);
    }

    @Post(':collection/push')
    async push(
        @Req() req,
        @Param('collection') collection: string,
        @Body() changes: any[]
    ) {
        return this.syncService.pushChanges(req.user.id, collection, changes);
    }
}
