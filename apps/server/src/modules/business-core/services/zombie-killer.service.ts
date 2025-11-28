import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ZombieKillerService {
    private readonly logger = new Logger(ZombieKillerService.name);

    constructor(
        @InjectDataSource()
        private dataSource: DataSource
    ) { }

    @Cron('0 0 * * *') // Run every day at midnight
    async handleCron() {
        this.logger.debug('Running Zombie Project detection...');

        // SQL to find active projects with no active/waiting tasks
        // and append "zombie_review" to system_tag in properties
        const query = `
            UPDATE data_items
            SET properties = properties || '{"system_tag": "zombie_review"}',
                updated_at = CURRENT_TIMESTAMP
            WHERE entity_type = 'project' 
            AND system_status = 'active'
            AND id NOT IN (
                SELECT DISTINCT parent_id 
                FROM data_items 
                WHERE entity_type = 'task' 
                AND system_status IN ('active', 'waiting')
                AND parent_id IS NOT NULL
            )
        `;

        try {
            const result = await this.dataSource.query(query);
            // Result format depends on driver, but usually contains rowCount or similar
            this.logger.debug('Zombie detection complete.');
        } catch (error) {
            this.logger.error('Error running Zombie detection', error);
        }
    }
}
