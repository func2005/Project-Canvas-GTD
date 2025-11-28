import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('data_items')
export class DataItem {
    @PrimaryColumn('uuid')
    id: string;

    @Index()
    @Column({ type: 'bigint', nullable: true })
    user_id: string;

    @Index()
    @Column()
    entity_type: string;

    @Column()
    title: string;

    @Column({ default: 'active' })
    system_status: string;

    @Column({ nullable: true })
    do_date: string;

    @Column({ nullable: true })
    due_date: string;

    @Column('jsonb', { default: {} })
    properties: any;

    @Index()
    @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date;

    @Column({ default: false })
    deleted: boolean;
}
