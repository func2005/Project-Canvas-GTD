import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataItem } from './entities/data-item.entity';
import { SyncController } from './controllers/sync.controller';
import { SyncService } from './services/sync.service';
import { ZombieKillerService } from './services/zombie-killer.service';
import { ArchiveController } from './controllers/archive.controller';
import { ArchiveService } from './services/archive.service';

import { CanvasWidget } from '../canvas-engine/entities/canvas-widget.entity';

@Module({
    imports: [TypeOrmModule.forFeature([DataItem, CanvasWidget])],
    controllers: [SyncController, ArchiveController],
    providers: [SyncService, ZombieKillerService, ArchiveService],
    exports: [TypeOrmModule]
})
export class BusinessCoreModule { }
