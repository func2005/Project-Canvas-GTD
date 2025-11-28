import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BusinessCoreModule } from './modules/business-core/business-core.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppController } from './app.controller';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            password: 'heshuhan123',
            database: 'project_canvas_gtd',
            autoLoadEntities: true,
            synchronize: true,
        }),
        BusinessCoreModule,
        AuthModule,
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule { }
