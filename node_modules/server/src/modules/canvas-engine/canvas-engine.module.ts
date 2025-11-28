import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CanvasWidget } from './entities/canvas-widget.entity';
import { CanvasLink } from './entities/canvas-link.entity';

@Module({
    imports: [TypeOrmModule.forFeature([CanvasWidget, CanvasLink])],
    exports: [TypeOrmModule]
})
export class CanvasEngineModule { }
