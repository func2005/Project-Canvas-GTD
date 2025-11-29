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
exports.ArchiveService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const data_item_entity_1 = require("../entities/data-item.entity");
let ArchiveService = class ArchiveService {
    constructor(itemsRepository) {
        this.itemsRepository = itemsRepository;
    }
    async getArchivedItems(page = 1, limit = 20, search) {
        const skip = (page - 1) * limit;
        const whereClause = {
            system_status: (0, typeorm_2.In)(['completed', 'dropped']),
            deleted: false
        };
        if (search) {
            whereClause.title = (0, typeorm_2.Like)(`%${search}%`);
        }
        const [items, total] = await this.itemsRepository.findAndCount({
            where: whereClause,
            order: { updated_at: 'DESC' },
            take: limit,
            skip: skip
        });
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }
};
exports.ArchiveService = ArchiveService;
exports.ArchiveService = ArchiveService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(data_item_entity_1.DataItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ArchiveService);
//# sourceMappingURL=archive.service.js.map