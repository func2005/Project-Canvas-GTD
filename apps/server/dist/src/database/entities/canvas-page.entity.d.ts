import { User } from './user.entity';
export declare class CanvasPage {
    id: string;
    user_id: string;
    user: User;
    is_default: boolean;
    viewport_config: Record<string, any>;
    created_at: Date;
    updated_at: Date;
    deleted: boolean;
}
