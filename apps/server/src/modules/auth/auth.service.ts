import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../database/entities/user.entity';
import { CanvasPage } from '../../database/entities/canvas-page.entity';
import { CanvasWidget } from '../../database/entities/canvas-widget.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectDataSource() private dataSource: DataSource,
        private jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        return await this.dataSource.transaction(async (manager) => {
            // Check if user exists
            const existing = await manager.findOne(User, { where: { email: dto.email } });
            if (existing) {
                throw new ConflictException('User already exists');
            }

            // 1. Create User
            const salt = await bcrypt.genSalt();
            const password_hash = await bcrypt.hash(dto.password, salt);

            const user = manager.create(User, {
                email: dto.email,
                password_hash,
            });
            const savedUser = await manager.save(User, user);

            // 2. Create CanvasPage
            const page = manager.create(CanvasPage, {
                user_id: savedUser.id,
            });
            const savedPage = await manager.save(CanvasPage, page);

            // 3. Create Default Widgets
            const widgets = [
                // Widget A: Master Calendar
                {
                    id: uuidv4(),
                    user_id: savedUser.id,
                    widget_type: 'calendar_master',
                    geometry: { x: 40, y: 40, w: 800, h: 600, z: 1 },
                    data_source_config: { source_type: 'static', criteria: {} },
                    canvas_id: savedPage.id,
                    updated_at: new Date(),
                },
                // Widget B: Inbox
                {
                    id: uuidv4(),
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
                // Widget C: Archive Bin
                {
                    id: uuidv4(),
                    user_id: savedUser.id,
                    widget_type: 'archive_bin',
                    geometry: { x: 860, y: 460, w: 350, h: 180, z: 1 },
                    data_source_config: { source_type: 'static' },
                    canvas_id: savedPage.id,
                    updated_at: new Date(),
                }
            ];

            await manager.save(CanvasWidget, widgets);

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

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.dataSource.getRepository(User).createQueryBuilder('user')
            .addSelect('user.password_hash')
            .where('user.email = :email', { email })
            .getOne();
        if (user && await bcrypt.compare(pass, user.password_hash)) {
            const { password_hash, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
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

    private generateTokens(user: User) {
        const payload = { email: user.email, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
