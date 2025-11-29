import { Module } from '@nestjs/common';
import { ZombieService } from './zombie.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
    imports: [ScheduleModule.forRoot()],
    providers: [ZombieService],
})
export class TasksModule { }
