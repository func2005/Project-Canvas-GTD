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
const data_item_entity_1 = require("../entities/data-item.entity");
const canvas_widget_entity_1 = require("../../canvas-engine/entities/canvas-widget.entity");
let SyncService = class SyncService {
    constructor(itemsRepository, widgetsRepository) {
        this.itemsRepository = itemsRepository;
        this.widgetsRepository = widgetsRepository;
    }
    async pullItems(checkpoint, limit, userId) {
        console.log(`[SyncService] Pulling items for user ${userId}. Checkpoint: ${checkpoint}, Limit: ${limit}`);
        const minTimestamp = new Date(checkpoint || 0);
        const documents = await this.itemsRepository.find({
            where: {
                updated_at: (0, typeorm_2.MoreThan)(minTimestamp),
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
    async pushItems(changeRows, userId) {
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
            doc.user_id = userId;
            console.log(`[SyncService] Processing doc: ${doc.id}, Title: ${doc.title}`);
            try {
                const saved = await this.itemsRepository.save(doc);
                written.push(saved);
            }
            catch (e) {
                console.error('Push error for doc:', doc.id, e);
                conflicts.push(doc);
            }
        }
        console.log(`[SyncService] Push complete. Written: ${written.length}, Conflicts: ${conflicts.length}`);
        return { written, conflicts };
    }
    async pullWidgets(checkpoint, limit, userId) {
        console.log(`[SyncService] Pulling widgets for user ${userId}. Checkpoint: ${checkpoint}, Limit: ${limit}`);
        const minTimestamp = new Date(checkpoint || 0);
        const documents = await this.widgetsRepository.find({
            where: {
                updated_at: (0, typeorm_2.MoreThan)(minTimestamp),
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
    async pushWidgets(changeRows, userId) {
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
            doc.user_id = userId;
            console.log(`[SyncService] Processing widget: ${doc.id}, Type: ${doc.widget_type}`);
            try {
                const saved = await this.widgetsRepository.save(doc);
                written.push(saved);
            }
            catch (e) {
                console.error('Push error for widget:', doc.id, e);
                conflicts.push(doc);
            }
        }
        console.log(`[SyncService] Widget push complete. Written: ${written.length}, Conflicts: ${conflicts.length}`);
        return { written, conflicts };
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(data_item_entity_1.DataItem)),
    __param(1, (0, typeorm_1.InjectRepository)(canvas_widget_entity_1.CanvasWidget)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SyncService);
//# sourceMappingURL=sync.service.js.map