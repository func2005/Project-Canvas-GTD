import { User } from './user.entity';
export declare class RefreshToken {
    id: string;
    user_id: string;
    user: User;
    token_hash: string;
    expires_at: Date;
    is_revoked: boolean;
    device_info: string;
    created_ip: string;
    created_at: Date;
}
