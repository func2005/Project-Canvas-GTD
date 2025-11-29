import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { DataItem } from '../../database/entities/data-item.entity';

@Injectable()
export class ZombieService {
    constructor(@InjectDataSource() private dataSource: DataSource) { }

    // 每天凌晨 3 点执行
    @Cron('0 0 3 * * *')
    async detectZombies() {
        const zombieQuery = `
      SELECT P.id, P.user_id 
      FROM data_items P
      WHERE P.entity_type = 'project' 
        AND P.system_status = 'active'
        AND P.deleted = FALSE
        -- 核心逻辑：不存在 Active 或 Waiting 的子任务
        AND NOT EXISTS (
          SELECT 1 FROM data_items T 
          WHERE T.parent_id = P.id 
            AND T.system_status IN ('active', 'waiting')
            AND T.deleted = FALSE
        )
    `;

        const zombies = await this.dataSource.query(zombieQuery);

        // 批量更新：给这些项目打上 "Zombie" 标记
        if (zombies.length > 0) {
            const ids = zombies.map(z => z.id);
            await this.dataSource.getRepository(DataItem).update(
                { id: In(ids) },
                {
                    // 我们利用 properties 字段存储系统提示
                    properties: () => `jsonb_set(properties, '{system_alert}', '"zombie_state"')`,
                    updated_at: new Date()
                }
            );
        }
    }
}
