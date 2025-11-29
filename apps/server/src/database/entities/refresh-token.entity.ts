import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    @Index()
    user_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    @Index()
    token_hash: string;

    @Column()
    expires_at: Date;

    @Column({ default: false })
    is_revoked: boolean;

    @Column({ nullable: true })
    device_info: string;

    @Column({ nullable: true })
    created_ip: string;

    @CreateDateColumn()
    created_at: Date;
}
