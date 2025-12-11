import { Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { ConfigService } from '@nestjs/config';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithoutRequest] | [opt: import("passport-jwt").StrategyOptionsWithRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private userRepository;
    private configService;
    constructor(userRepository: Repository<User>, configService: ConfigService);
    validate(payload: any): Promise<{
        id: any;
        email: any;
    }>;
}
export {};
