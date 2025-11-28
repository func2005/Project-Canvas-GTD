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
const sync_service_1 = require("../services/sync.service");
const jwt_auth_guard_1 = require("../../auth/jwt-auth.guard");
let SyncController = class SyncController {
    constructor(syncService) {
        this.syncService = syncService;
    }
    async pullItems(checkpoint, limit, req) {
        return this.syncService.pullItems(Number(checkpoint), Number(limit) || 100, req.user.userId);
    }
    async pushItems(body, req) {
        console.log('[SyncController] Raw body:', JSON.stringify(body));
        return this.syncService.pushItems(body.changeRows, req.user.userId);
    }
    async pullWidgets(checkpoint, limit, req) {
        return this.syncService.pullWidgets(Number(checkpoint), Number(limit) || 100, req.user.userId);
    }
    async pushWidgets(body, req) {
        console.log('[SyncController] Widgets Raw body:', JSON.stringify(body));
        return this.syncService.pushWidgets(body.changeRows, req.user.userId);
    }
};
exports.SyncController = SyncController;
__decorate([
    (0, common_1.Get)('items/pull'),
    __param(0, (0, common_1.Query)('checkpoint')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "pullItems", null);
__decorate([
    (0, common_1.Post)('items/push'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "pushItems", null);
__decorate([
    (0, common_1.Get)('widgets/pull'),
    __param(0, (0, common_1.Query)('checkpoint')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "pullWidgets", null);
__decorate([
    (0, common_1.Post)('widgets/push'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "pushWidgets", null);
exports.SyncController = SyncController = __decorate([
    (0, common_1.Controller)('sync'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [sync_service_1.SyncService])
], SyncController);
//# sourceMappingURL=sync.controller.js.map