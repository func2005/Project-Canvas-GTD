import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { EntityType, SystemStatus } from '@project-canvas/shared-types';

@Entity('data_items')
@Index(['user_id', 'updated_at']) // Sync cursor
@Index(['user_id', 'start_time', 'end_time'], { where: 'deleted = false' }) // Calendar range
@Index(['user_id', 'system_status', 'do_date', 'sort_order'], { where: 'deleted = false' }) // Smart list
export class DataItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    user_id: string;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    @Column({ default: false })
    deleted: boolean;

    @Column()
    entity_type: EntityType;

    @Column('text')
    title: string;

    @Column({ default: 'active' })
    system_status: SystemStatus;

    // Time Dimensions
    @Column({ type: 'date', nullable: true })
    do_date: string;

    @Column({ type: 'timestamptz', nullable: true })
    due_date: Date;

    @Column({ type: 'timestamptz', nullable: true })
    start_time: Date;

    @Column({ type: 'timestamptz', nullable: true })
    end_time: Date;

    @Column({ default: false })
    is_all_day: boolean;

    // Structure
    @Column({ type: 'uuid', nullable: true })
    parent_id: string;

    @Column({ type: 'numeric', nullable: true })
    sort_order: number;

    // Recurrence
    @Column({ type: 'text', nullable: true })
    recurrence_rule: string;

    @Column({ type: 'uuid', nullable: true })
    original_event_id: string;

    // Properties
    @Column({ type: 'jsonb', default: {} })
    properties: Record<string, any>;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    completed_at: Date;
}
