import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
