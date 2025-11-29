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
exports.CanvasLink = void 0;
const typeorm_1 = require("typeorm");
let CanvasLink = class CanvasLink {
};
exports.CanvasLink = CanvasLink;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CanvasLink.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], CanvasLink.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], CanvasLink.prototype, "source_widget_id", void 0);
__decorate([
    (0, typeorm_1.Column)('uuid'),
    __metadata("design:type", String)
], CanvasLink.prototype, "target_widget_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'context' }),
    __metadata("design:type", String)
], CanvasLink.prototype, "link_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)' }),
    __metadata("design:type", Date)
], CanvasLink.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], CanvasLink.prototype, "deleted", void 0);
exports.CanvasLink = CanvasLink = __decorate([
    (0, typeorm_1.Entity)('canvas_links'),
    (0, typeorm_1.Index)('idx_links_sync', ['user_id', 'updated_at', 'id']),
    (0, typeorm_1.Index)('idx_links_source', ['source_widget_id']),
    (0, typeorm_1.Index)('idx_links_target', ['target_widget_id'])
], CanvasLink);
//# sourceMappingURL=canvas-link.entity.js.map