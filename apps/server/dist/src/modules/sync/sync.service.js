"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const data_item_entity_1 = require("../../database/entities/data-item.entity");
const canvas_widget_entity_1 = require("../../database/entities/canvas-widget.entity");
const canvas_link_entity_1 = require("../../database/entities/canvas-link.entity");
const canvas_page_entity_1 = require("../../database/entities/canvas-page.entity");
let SyncService = class SyncService {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    getRepo(collection) {
        switch (collection) {
            case 'data_items': return this.dataSource.getRepository(data_item_entity_1.DataItem);
            case 'canvas_widgets': return this.dataSource.getRepository(canvas_widget_entity_1.CanvasWidget);
            case 'canvas_links': return this.dataSource.getRepository(canvas_link_entity_1.CanvasLink);
            case 'canvas_pages': return this.dataSource.getRepository(canvas_page_entity_1.CanvasPage);
            default: throw new common_1.BadRequestException(`Unknown collection: ${collection}`);
        }
    }
    async pullChanges(userId, collection, checkpoint, limit = 100) {
        const repo = this.getRepo(collection);
        const qb = repo.createQueryBuilder('entity');
        qb.where('entity.user_id = :userId', { userId });
        if (checkpoint && checkpoint.updatedAt) {
            const time = new Date(checkpoint.updatedAt);
            qb.andWhere(new typeorm_2.Brackets((qb) => {
                qb.where('entity.updated_at > :time', { time })
                    .orWhere('(entity.updated_at = :time AND entity.id > :lastId)', {
                    time,
                    lastId: checkpoint.lastId
                });
            }));
        }
        qb.orderBy('entity.updated_at', 'ASC')
            .addOrderBy('entity.id', 'ASC')
            .take(limit);
        const documents = await qb.getMany();
        const lastDoc = documents[documents.length - 1];
        const newCheckpoint = lastDoc
            ? { updatedAt: lastDoc.updated_at.toISOString(), lastId: lastDoc.id }
            : checkpoint;
        return {
            documents,
            checkpoint: newCheckpoint,
            hasMore: documents.length === limit
        };
    }
    async pushChanges(userId, collection, changes) {
        const repo = this.getRepo(collection);
        const conflicts = [];
        const written = [];
        for (const change of changes) {
            if (change.properties && JSON.stringify(change.properties).length > 50000) {
                throw new common_1.BadRequestException(`Properties too large for item ${change.id}`);
            }
            if (change.data_source_config && JSON.stringify(change.data_source_config).length > 50000) {
                throw new common_1.BadRequestException(`DataSourceConfig too large for item ${change.id}`);
            }
            change.user_id = userId;
            const existing = await repo.findOne({ where: { id: change.id } });
            if (existing) {
                const clientTime = new Date(change.updated_at).getTime();
                const serverTime = existing.updated_at.getTime();
                if (clientTime < serverTime) {
                    conflicts.push(existing);
                    continue;
                }
            }
            await repo.save(change);
            written.push(change);
        }
        return conflicts;
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], SyncService);
//# sourceMappingURL=sync.service.js.map