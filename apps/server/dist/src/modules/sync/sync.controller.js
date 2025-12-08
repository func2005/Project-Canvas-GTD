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
exports.SyncController = void 0;
const common_1 = require("@nestjs/common");
const sync_service_1 = require("./sync.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
let SyncController = class SyncController {
    constructor(syncService) {
        this.syncService = syncService;
    }
    async pull(req, collection, checkpointTime, checkpointId, limit) {
        const checkpoint = {
            updatedAt: checkpointTime,
            lastId: checkpointId
        };
        return this.syncService.pullChanges(req.user.id, collection, checkpoint, limit || 100);
    }
    async pushBatch(req, body) {
        return this.syncService.pushBatchChanges(req.user.id, body);
    }
    async push(req, collection, changes) {
        return this.syncService.pushChanges(req.user.id, collection, changes);
    }
};
exports.SyncController = SyncController;
__decorate([
    (0, common_1.Get)(':collection/pull'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('collection')),
    __param(2, (0, common_1.Query)('checkpoint_time')),
    __param(3, (0, common_1.Query)('checkpoint_id')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Number]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "pull", null);
__decorate([
    (0, common_1.Post)('batch/push'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "pushBatch", null);
__decorate([
    (0, common_1.Post)(':collection/push'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('collection')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Array]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "push", null);
exports.SyncController = SyncController = __decorate([
    (0, common_1.Controller)('sync'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [sync_service_1.SyncService])
], SyncController);
//# sourceMappingURL=sync.controller.js.map