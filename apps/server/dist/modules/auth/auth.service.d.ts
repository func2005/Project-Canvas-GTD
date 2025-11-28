import { OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService implements OnModuleInit {
    private usersRepository;
    private jwtService;
    private dataSource;
    constructor(usersRepository: Repository<User>, jwtService: JwtService, dataSource: DataSource);
    onModuleInit(): Promise<void>;
    register(registerDto: RegisterDto): Promise<{
        access_token: string;
        user: {
            id: string;
            username: string;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: string;
            username: string;
        };
    }>;
}
