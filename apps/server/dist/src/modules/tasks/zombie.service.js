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
exports.ZombieService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const data_item_entity_1 = require("../../database/entities/data-item.entity");
let ZombieService = class ZombieService {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async detectZombies() {
        const zombieQuery = `
      SELECT P.id, P.user_id 
      FROM data_items P
      WHERE P.entity_type = 'project' 
        AND P.system_status = 'active'
        AND P.deleted = FALSE
        -- 核心逻辑：不存在 Active 或 Waiting 的子任务
        AND NOT EXISTS (
          SELECT 1 FROM data_items T 
          WHERE T.parent_id = P.id 
            AND T.system_status IN ('active', 'waiting')
            AND T.deleted = FALSE
        )
    `;
        const zombies = await this.dataSource.query(zombieQuery);
        if (zombies.length > 0) {
            const ids = zombies.map(z => z.id);
            await this.dataSource.getRepository(data_item_entity_1.DataItem).update({ id: (0, typeorm_2.In)(ids) }, {
                properties: () => `jsonb_set(properties, '{system_alert}', '"zombie_state"')`,
                updated_at: new Date()
            });
        }
    }
};
exports.ZombieService = ZombieService;
__decorate([
    (0, schedule_1.Cron)('0 0 3 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ZombieService.prototype, "detectZombies", null);
exports.ZombieService = ZombieService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], ZombieService);
//# sourceMappingURL=zombie.service.js.map