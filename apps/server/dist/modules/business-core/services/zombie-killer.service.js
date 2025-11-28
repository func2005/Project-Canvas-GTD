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
var ZombieKillerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZombieKillerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let ZombieKillerService = ZombieKillerService_1 = class ZombieKillerService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(ZombieKillerService_1.name);
    }
    async handleCron() {
        this.logger.debug('Running Zombie Project detection...');
        const query = `
            UPDATE data_items
            SET properties = properties || '{"system_tag": "zombie_review"}',
                updated_at = CURRENT_TIMESTAMP
            WHERE entity_type = 'project' 
            AND system_status = 'active'
            AND id NOT IN (
                SELECT DISTINCT parent_id 
                FROM data_items 
                WHERE entity_type = 'task' 
                AND system_status IN ('active', 'waiting')
                AND parent_id IS NOT NULL
            )
        `;
        try {
            const result = await this.dataSource.query(query);
            this.logger.debug('Zombie detection complete.');
        }
        catch (error) {
            this.logger.error('Error running Zombie detection', error);
        }
    }
};
exports.ZombieKillerService = ZombieKillerService;
__decorate([
    (0, schedule_1.Cron)('0 0 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ZombieKillerService.prototype, "handleCron", null);
exports.ZombieKillerService = ZombieKillerService = ZombieKillerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], ZombieKillerService);
//# sourceMappingURL=zombie-killer.service.js.map