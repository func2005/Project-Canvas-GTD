import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { DataItem } from '../entities/data-item.entity';
import { CanvasWidget } from '../../canvas-engine/entities/canvas-widget.entity';

@Injectable()
export class SyncService {
    constructor(
        @InjectRepository(DataItem)
        private itemsRepository: Repository<DataItem>,
        @InjectRepository(CanvasWidget)
        private widgetsRepository: Repository<CanvasWidget>,
    ) { }

    async pullItems(checkpoint: number, limit: number, userId: string) {
        console.log(`[SyncService] Pulling items for user ${userId}. Checkpoint: ${checkpoint}, Limit: ${limit}`);
        const minTimestamp = new Date(checkpoint || 0);

        const documents = await this.itemsRepository.find({
            where: {
                updated_at: MoreThan(minTimestamp),
                user_id: userId
            },
            order: { updated_at: 'ASC' },
            take: limit,
        });

        console.log(`[SyncService] Found ${documents.length} documents to pull.`);

        if (documents.length === 0) {
            return { documents: [], checkpoint: checkpoint };
        }

        const lastDoc = documents[documents.length - 1];
        const newCheckpoint = lastDoc.updated_at.getTime();

        return {
            documents,
            checkpoint: newCheckpoint
        };
    }

    async pushItems(changeRows: any[], userId: string) {
        console.log(`[SyncService] Pushing ${changeRows?.length} items for user ${userId}.`);
        if (!changeRows || !Array.isArray(changeRows)) {
            console.warn('[SyncService] Invalid changeRows:', changeRows);
            return { written: [], conflicts: [] };
        }

        const conflicts = [];
        const written = [];

        for (const row of changeRows) {
            const doc = row.newDocument;
            if (!doc) {
                console.warn('[SyncService] Row missing newDocument:', row);
                continue;
            }

            // Force user_id to match the authenticated user
            doc.user_id = userId;

            console.log(`[SyncService] Processing doc: ${doc.id}, Title: ${doc.title}`);
            try {
                // We use save() which handles upsert if the entity has an ID
                const saved = await this.itemsRepository.save(doc);
                written.push(saved);
            } catch (e) {
                console.error('Push error for doc:', doc.id, e);
                conflicts.push(doc);
            }
        }

        console.log(`[SyncService] Push complete. Written: ${written.length}, Conflicts: ${conflicts.length}`);
        return { written, conflicts };
    }

    async pullWidgets(checkpoint: number, limit: number, userId: string) {
        console.log(`[SyncService] Pulling widgets for user ${userId}. Checkpoint: ${checkpoint}, Limit: ${limit}`);
        const minTimestamp = new Date(checkpoint || 0);

        const documents = await this.widgetsRepository.find({
            where: {
                updated_at: MoreThan(minTimestamp),
                user_id: userId
            },
            order: { updated_at: 'ASC' },
            take: limit,
        });

        console.log(`[SyncService] Found ${documents.length} widgets to pull.`);

        if (documents.length === 0) {
            return { documents: [], checkpoint: checkpoint };
        }

        const lastDoc = documents[documents.length - 1];
        const newCheckpoint = lastDoc.updated_at.getTime();

        return {
            documents,
            checkpoint: newCheckpoint
        };
    }

    async pushWidgets(changeRows: any[], userId: string) {
        console.log(`[SyncService] Pushing ${changeRows?.length} widgets for user ${userId}.`);
        if (!changeRows || !Array.isArray(changeRows)) {
            console.warn('[SyncService] Invalid changeRows:', changeRows);
            return { written: [], conflicts: [] };
        }

        const conflicts = [];
        const written = [];

        for (const row of changeRows) {
            const doc = row.newDocument;
            if (!doc) {
                console.warn('[SyncService] Row missing newDocument:', row);
                continue;
            }

            // Force user_id to match the authenticated user
            doc.user_id = userId;

            console.log(`[SyncService] Processing widget: ${doc.id}, Type: ${doc.widget_type}`);
            try {
                const saved = await this.widgetsRepository.save(doc);
                written.push(saved);
            } catch (e) {
                console.error('Push error for widget:', doc.id, e);
                conflicts.push(doc);
            }
        }

        return { written, conflicts };
    }
}
