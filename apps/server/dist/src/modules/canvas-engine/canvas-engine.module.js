"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvasEngineModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const canvas_widget_entity_1 = require("./entities/canvas-widget.entity");
const canvas_link_entity_1 = require("./entities/canvas-link.entity");
let CanvasEngineModule = class CanvasEngineModule {
};
exports.CanvasEngineModule = CanvasEngineModule;
exports.CanvasEngineModule = CanvasEngineModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([canvas_widget_entity_1.CanvasWidget, canvas_link_entity_1.CanvasLink])],
        exports: [typeorm_1.TypeOrmModule]
    })
], CanvasEngineModule);
//# sourceMappingURL=canvas-engine.module.js.map