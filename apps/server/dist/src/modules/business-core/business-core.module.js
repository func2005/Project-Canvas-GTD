"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessCoreModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const data_item_entity_1 = require("./entities/data-item.entity");
const sync_controller_1 = require("./controllers/sync.controller");
const sync_service_1 = require("./services/sync.service");
const zombie_killer_service_1 = require("./services/zombie-killer.service");
const archive_controller_1 = require("./controllers/archive.controller");
const archive_service_1 = require("./services/archive.service");
const canvas_widget_entity_1 = require("../canvas-engine/entities/canvas-widget.entity");
let BusinessCoreModule = class BusinessCoreModule {
};
exports.BusinessCoreModule = BusinessCoreModule;
exports.BusinessCoreModule = BusinessCoreModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([data_item_entity_1.DataItem, canvas_widget_entity_1.CanvasWidget])],
        controllers: [sync_controller_1.SyncController, archive_controller_1.ArchiveController],
        providers: [sync_service_1.SyncService, zombie_killer_service_1.ZombieKillerService, archive_service_1.ArchiveService],
        exports: [typeorm_1.TypeOrmModule]
    })
], BusinessCoreModule);
//# sourceMappingURL=business-core.module.js.map