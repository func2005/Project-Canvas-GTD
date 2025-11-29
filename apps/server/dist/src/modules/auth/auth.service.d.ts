import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private dataSource;
    private jwtService;
    constructor(dataSource: DataSource, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string;
            nickname: string;
            avatar_url: string;
            settings: Record<string, any>;
        };
    }>;
    validateUser(email: string, pass: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            nickname: any;
            avatar_url: any;
            settings: any;
        };
    }>;
    private generateTokens;
}
