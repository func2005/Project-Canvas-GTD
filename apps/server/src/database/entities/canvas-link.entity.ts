import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('canvas_links')
@Index('idx_links_sync', ['user_id', 'updated_at', 'id'])
@Index('idx_links_source', ['source_widget_id'])
@Index('idx_links_target', ['target_widget_id'])
export class CanvasLink {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    user_id: string;

    @Column('uuid')
    source_widget_id: string;

    @Column('uuid')
    target_widget_id: string;

    @Column({ length: 20, default: 'context' })
    link_type: string;

    @Column({ type: 'timestamp', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)' })
    updated_at: Date;

    @Column({ default: false })
    deleted: boolean;
}
