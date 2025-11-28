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
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const user_entity_1 = require("./entities/user.entity");
let AuthService = class AuthService {
    constructor(usersRepository, jwtService, dataSource) {
        this.usersRepository = usersRepository;
        this.jwtService = jwtService;
        this.dataSource = dataSource;
    }
    async onModuleInit() {
        try {
            if (this.dataSource.options.type === 'postgres') {
                await this.dataSource.query(`ALTER SEQUENCE users_id_seq RESTART WITH 1000000000;`);
                console.log('User ID sequence initialized to 1000000000');
            }
        }
        catch (e) {
            console.warn('Failed to initialize user ID sequence (might already be set or different DB):', e.message);
        }
    }
    async register(registerDto) {
        const { username, password } = registerDto;
        const existingUser = await this.usersRepository.findOne({ where: { username } });
        if (existingUser) {
            throw new common_1.ConflictException('Username already exists');
        }
        const salt = await bcrypt.genSalt();
        const password_hash = await bcrypt.hash(password, salt);
        const user = this.usersRepository.create({
            username,
            password_hash,
        });
        await this.usersRepository.save(user);
        const payload = { username: user.username, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                username: user.username
            }
        };
    }
    async login(loginDto) {
        const { username, password } = loginDto;
        const user = await this.usersRepository.findOne({ where: { username } });
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const payload = { username: user.username, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                username: user.username
            }
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService,
        typeorm_2.DataSource])
], AuthService);
//# sourceMappingURL=auth.service.js.map