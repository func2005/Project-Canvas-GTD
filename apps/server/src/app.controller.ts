import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    getHello(): string {
        return 'Project Canvas Backend is Running';
    }
}
