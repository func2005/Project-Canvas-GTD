import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index({ unique: true })
    @Column()
    email: string;

    @Column({ select: false })
    password_hash: string;

    @Column({ nullable: true })
    nickname: string;

    @Column({ nullable: true })
    avatar_url: string;

    @Column({ type: 'jsonb', default: {} })
    settings: Record<string, any>;

    @Column({ default: true })
    is_active: boolean;

    @Column({ type: 'timestamp', nullable: true })
    last_login_at: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
