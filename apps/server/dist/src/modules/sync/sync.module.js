"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncModule = void 0;
const common_1 = require("@nestjs/common");
const sync_service_1 = require("./sync.service");
const sync_controller_1 = require("./sync.controller");
const typeorm_1 = require("@nestjs/typeorm");
const data_item_entity_1 = require("../../database/entities/data-item.entity");
const canvas_widget_entity_1 = require("../../database/entities/canvas-widget.entity");
const canvas_link_entity_1 = require("../../database/entities/canvas-link.entity");
let SyncModule = class SyncModule {
};
exports.SyncModule = SyncModule;
exports.SyncModule = SyncModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([data_item_entity_1.DataItem, canvas_widget_entity_1.CanvasWidget, canvas_link_entity_1.CanvasLink]),
        ],
        providers: [sync_service_1.SyncService],
        controllers: [sync_controller_1.SyncController],
    })
], SyncModule);
//# sourceMappingURL=sync.module.js.map