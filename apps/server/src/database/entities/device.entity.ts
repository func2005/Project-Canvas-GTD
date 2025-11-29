import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('devices')
@Index(['user_id', 'client_id'], { unique: true })
export class Device {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    user_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    client_id: string;

    @Column({ type: 'text', nullable: true })
    user_agent: string;

    @Column({ nullable: true })
    platform: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    last_seen_at: Date;

    @Column({ nullable: true })
    last_sync_ip: string;

    @CreateDateColumn()
    created_at: Date;
}
