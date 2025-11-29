import { User } from './user.entity';
export declare class Device {
    id: string;
    user_id: string;
    user: User;
    client_id: string;
    user_agent: string;
    platform: string;
    last_seen_at: Date;
    last_sync_ip: string;
    created_at: Date;
}
