export declare class User {
    id: string;
    email: string;
    password_hash: string;
    nickname: string;
    avatar_url: string;
    settings: Record<string, any>;
    is_active: boolean;
    last_login_at: Date;
    created_at: Date;
    updated_at: Date;
}
