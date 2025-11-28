import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { SyncService } from '../services/sync.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
    constructor(private readonly syncService: SyncService) { }

    @Get('items/pull')
    async pullItems(@Query('checkpoint') checkpoint: number, @Query('limit') limit: number, @Request() req) {
        return this.syncService.pullItems(Number(checkpoint), Number(limit) || 100, req.user.userId);
    }

    @Post('items/push')
    async pushItems(@Body() body: { changeRows: any[] }, @Request() req) {
        console.log('[SyncController] Raw body:', JSON.stringify(body));
        return this.syncService.pushItems(body.changeRows, req.user.userId);
    }

    @Get('widgets/pull')
    async pullWidgets(@Query('checkpoint') checkpoint: number, @Query('limit') limit: number, @Request() req) {
        return this.syncService.pullWidgets(Number(checkpoint), Number(limit) || 100, req.user.userId);
    }

    @Post('widgets/push')
    async pushWidgets(@Body() body: { changeRows: any[] }, @Request() req) {
        console.log('[SyncController] Widgets Raw body:', JSON.stringify(body));
        return this.syncService.pushWidgets(body.changeRows, req.user.userId);
    }
}
