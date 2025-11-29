import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Brackets, Repository } from 'typeorm';
import { SyncCheckpoint } from '../../common/interfaces/sync-checkpoint.interface';
import { DataItem } from '../../database/entities/data-item.entity';
import { CanvasWidget } from '../../database/entities/canvas-widget.entity';
import { CanvasLink } from '../../database/entities/canvas-link.entity';
import { CanvasPage } from '../../database/entities/canvas-page.entity';

@Injectable()
export class SyncService {
    constructor(@InjectDataSource() private dataSource: DataSource) { }

    private getRepo(collection: string): Repository<any> {
        switch (collection) {
            case 'data_items': return this.dataSource.getRepository(DataItem);
            case 'canvas_widgets': return this.dataSource.getRepository(CanvasWidget);
            case 'canvas_links': return this.dataSource.getRepository(CanvasLink);
            case 'canvas_pages': return this.dataSource.getRepository(CanvasPage);
            default: throw new BadRequestException(`Unknown collection: ${collection}`);
        }
    }

    async pullChanges(userId: string, collection: string, checkpoint: SyncCheckpoint, limit = 100) {
        const repo = this.getRepo(collection);
        const qb = repo.createQueryBuilder('entity');

        qb.where('entity.user_id = :userId', { userId });

        if (checkpoint && checkpoint.updatedAt) {
            const time = new Date(checkpoint.updatedAt);
            qb.andWhere(
                new Brackets((qb) => {
                    qb.where('entity.updated_at > :time', { time })
                        .orWhere('(entity.updated_at = :time AND entity.id > :lastId)', {
                            time,
                            lastId: checkpoint.lastId
                        });
                })
            );
        }

        qb.orderBy('entity.updated_at', 'ASC')
            .addOrderBy('entity.id', 'ASC')
            .take(limit);

        const documents = await qb.getMany();

        const lastDoc = documents[documents.length - 1];
        const newCheckpoint: SyncCheckpoint = lastDoc
            ? { updatedAt: lastDoc.updated_at.toISOString(), lastId: lastDoc.id }
            : checkpoint;

        return {
            documents,
            checkpoint: newCheckpoint,
            hasMore: documents.length === limit
        };
    }

    async pushChanges(userId: string, collection: string, changes: any[]) {
        const repo = this.getRepo(collection);
        const conflicts = [];
        const written = [];

        for (const change of changes) {
            // 1. Validation
            if (change.properties && JSON.stringify(change.properties).length > 50000) {
                throw new BadRequestException(`Properties too large for item ${change.id}`);
            }
            if (change.data_source_config && JSON.stringify(change.data_source_config).length > 50000) {
                throw new BadRequestException(`DataSourceConfig too large for item ${change.id}`);
            }

            // 2. Force User ID
            change.user_id = userId;

            // 3. LWW Logic
            const existing = await repo.findOne({ where: { id: change.id } });

            if (existing) {
                const clientTime = new Date(change.updated_at).getTime();
                const serverTime = existing.updated_at.getTime();

                if (clientTime < serverTime) {
                    conflicts.push(existing);
                    continue;
                }
            }

            // 4. Save
            await repo.save(change);
            written.push(change);
        }

        return conflicts;
    }
}
