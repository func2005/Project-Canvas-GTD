import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { SyncModule } from './modules/sync/sync.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { User } from './database/entities/user.entity';
import { CanvasPage } from './database/entities/canvas-page.entity';
import { DataItem } from './database/entities/data-item.entity';
import { CanvasWidget } from './database/entities/canvas-widget.entity';
import { CanvasLink } from './database/entities/canvas-link.entity';
import { RefreshToken } from './database/entities/refresh-token.entity';
import { Device } from './database/entities/device.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const host = configService.get<string>('DB_HOST') || 'localhost';
                console.log(`[Database] Connecting to host: ${host}`); // Debug log
                return {
                    type: 'postgres',
                    host: host,
                    port: parseInt(configService.get<string>('DB_PORT') || '5432'),
                    username: configService.get<string>('DB_USERNAME') || 'postgres',
                    password: configService.get<string>('DB_PASSWORD') || 'heshuhan123',
                    database: configService.get<string>('DB_DATABASE') || 'project_canvas_gtd',
                    entities: [User, CanvasPage, DataItem, CanvasWidget, CanvasLink, RefreshToken, Device],
                    synchronize: true, // TODO: Set to false in production
                };
            },
        }),
        AuthModule,
        SyncModule,
        TasksModule,
    ],
})
export class AppModule { }
