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
exports.DataItem = void 0;
const typeorm_1 = require("typeorm");
let DataItem = class DataItem {
};
exports.DataItem = DataItem;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], DataItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true }),
    __metadata("design:type", String)
], DataItem.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DataItem.prototype, "entity_type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DataItem.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'active' }),
    __metadata("design:type", String)
], DataItem.prototype, "system_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DataItem.prototype, "do_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DataItem.prototype, "due_date", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb', { default: {} }),
    __metadata("design:type", Object)
], DataItem.prototype, "properties", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)('timestamp', { default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], DataItem.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], DataItem.prototype, "deleted", void 0);
exports.DataItem = DataItem = __decorate([
    (0, typeorm_1.Entity)('data_items')
], DataItem);
//# sourceMappingURL=data-item.entity.js.map