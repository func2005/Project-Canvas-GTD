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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvasWidget = void 0;
const typeorm_1 = require("typeorm");
const canvas_page_entity_1 = require("./canvas-page.entity");
let CanvasWidget = class CanvasWidget {
};
exports.CanvasWidget = CanvasWidget;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CanvasWidget.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], CanvasWidget.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], CanvasWidget.prototype, "canvas_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => canvas_page_entity_1.CanvasPage, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'canvas_id' }),
    __metadata("design:type", canvas_page_entity_1.CanvasPage)
], CanvasWidget.prototype, "canvas_page", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid', { nullable: true }),
    __metadata("design:type", String)
], CanvasWidget.prototype, "group_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 30 }),
    __metadata("design:type", String)
], CanvasWidget.prototype, "widget_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], CanvasWidget.prototype, "geometry", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb' }),
    __metadata("design:type", Object)
], CanvasWidget.prototype, "data_source_config", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], CanvasWidget.prototype, "view_state", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)' }),
    __metadata("design:type", Date)
], CanvasWidget.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], CanvasWidget.prototype, "deleted", void 0);
exports.CanvasWidget = CanvasWidget = __decorate([
    (0, typeorm_1.Entity)('canvas_widgets'),
    (0, typeorm_1.Index)('idx_widgets_sync', ['user_id', 'updated_at', 'id'])
], CanvasWidget);
//# sourceMappingURL=canvas-widget.entity.js.map