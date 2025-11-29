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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const uuid_1 = require("uuid");
const user_entity_1 = require("../../database/entities/user.entity");
const canvas_page_entity_1 = require("../../database/entities/canvas-page.entity");
const canvas_widget_entity_1 = require("../../database/entities/canvas-widget.entity");
let AuthService = class AuthService {
    constructor(dataSource, jwtService) {
        this.dataSource = dataSource;
        this.jwtService = jwtService;
    }
    async register(dto) {
        return await this.dataSource.transaction(async (manager) => {
            const existing = await manager.findOne(user_entity_1.User, { where: { email: dto.email } });
            if (existing) {
                throw new common_1.ConflictException('User already exists');
            }
            const salt = await bcrypt.genSalt();
            const password_hash = await bcrypt.hash(dto.password, salt);
            const user = manager.create(user_entity_1.User, {
                email: dto.email,
                password_hash,
            });
            const savedUser = await manager.save(user_entity_1.User, user);
            const page = manager.create(canvas_page_entity_1.CanvasPage, {
                user_id: savedUser.id,
            });
            const savedPage = await manager.save(canvas_page_entity_1.CanvasPage, page);
            const widgets = [
                {
                    id: (0, uuid_1.v4)(),
                    user_id: savedUser.id,
                    widget_type: 'calendar_master',
                    geometry: { x: 40, y: 40, w: 800, h: 600, z: 1 },
                    data_source_config: { source_type: 'static', criteria: {} },
                    canvas_id: savedPage.id,
                    updated_at: new Date(),
                },
                {
                    id: (0, uuid_1.v4)(),
                    user_id: savedUser.id,
                    widget_type: 'smart_list',
                    geometry: { x: 860, y: 40, w: 350, h: 400, z: 1 },
                    data_source_config: {
                        source_type: 'filter',
                        criteria: { do_date: null, system_status: 'active' }
                    },
                    canvas_id: savedPage.id,
                    updated_at: new Date(),
                },
                {
                    id: (0, uuid_1.v4)(),
                    user_id: savedUser.id,
                    widget_type: 'archive_bin',
                    geometry: { x: 860, y: 460, w: 350, h: 180, z: 1 },
                    data_source_config: { source_type: 'static' },
                    canvas_id: savedPage.id,
                    updated_at: new Date(),
                }
            ];
            await manager.save(canvas_widget_entity_1.CanvasWidget, widgets);
            const tokens = this.generateTokens(savedUser);
            return {
                user: {
                    id: savedUser.id,
                    email: savedUser.email,
                    nickname: savedUser.nickname,
                    avatar_url: savedUser.avatar_url,
                    settings: savedUser.settings
                },
                ...tokens
            };
        });
    }
    async validateUser(email, pass) {
        const user = await this.dataSource.getRepository(user_entity_1.User).createQueryBuilder('user')
            .addSelect('user.password_hash')
            .where('user.email = :email', { email })
            .getOne();
        if (user && await bcrypt.compare(pass, user.password_hash)) {
            const { password_hash, ...result } = user;
            return result;
        }
        return null;
    }
    async login(user) {
        const tokens = this.generateTokens(user);
        return {
            user: {
                id: user.id,
                email: user.email,
                nickname: user.nickname,
                avatar_url: user.avatar_url,
                settings: user.settings
            },
            ...tokens
        };
    }
    generateTokens(user) {
        const payload = { email: user.email, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map