import { Module } from '@nestjs/common';
import { BusinessCoreModule } from './modules/business-core/business-core.module';
import { CanvasEngineModule } from './modules/canvas-engine/canvas-engine.module';

@Module({
    imports: [BusinessCoreModule, CanvasEngineModule],
    controllers: [],
    providers: [],
})
export class AppModule { }
