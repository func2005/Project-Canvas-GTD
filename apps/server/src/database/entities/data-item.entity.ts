import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('data_items')
@Index('idx_data_items_sync', ['user_id', 'updated_at', 'id'])
@Index('idx_data_items_parent', ['parent_id'])
@Index('idx_data_items_status', ['system_status'])
export class DataItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    user_id: string;

    @Column({ length: 20 })
    entity_type: string; // 'task', 'event', 'project'

    @Column({ type: 'text', nullable: true })
    title: string;

    @Column({ length: 20, default: 'active' })
    system_status: string;

    @Column({ type: 'date', nullable: true })
    do_date: string;

    @Column({ type: 'timestamp', nullable: true })
    due_date: Date;

    @Column({ type: 'timestamp', nullable: true })
    start_time: Date;

    @Column({ type: 'timestamp', nullable: true })
    end_time: Date;

    @Column('uuid', { nullable: true })
    parent_id: string;

    @Column({ type: 'jsonb', default: {} })
    properties: Record<string, any>;

    @Column({ type: 'numeric', nullable: true })
    sort_order: number;

    @Column({ type: 'timestamp', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)' })
    updated_at: Date;

    @Column({ default: false })
    deleted: boolean;
}
