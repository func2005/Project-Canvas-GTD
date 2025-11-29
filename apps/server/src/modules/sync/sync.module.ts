import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataItem } from '../../database/entities/data-item.entity';
import { CanvasWidget } from '../../database/entities/canvas-widget.entity';
import { CanvasLink } from '../../database/entities/canvas-link.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([DataItem, CanvasWidget, CanvasLink]),
    ],
    providers: [SyncService],
    controllers: [SyncController],
})
export class SyncModule { }
