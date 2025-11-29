import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { CanvasPage } from './canvas-page.entity';

@Entity('canvas_widgets')
@Index('idx_widgets_sync', ['user_id', 'updated_at', 'id'])
export class CanvasWidget {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    user_id: string;

    @Column('uuid')
    canvas_id: string;

    @ManyToOne(() => CanvasPage, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'canvas_id' })
    canvas_page: CanvasPage;

    @Column('uuid', { nullable: true })
    group_id: string;

    @Column({ length: 30 })
    widget_type: string;

    @Column({ type: 'jsonb' })
    geometry: { x: number; y: number; w: number; h: number; z: number };

    @Column({ type: 'jsonb' })
    data_source_config: Record<string, any>;

    @Column({ type: 'jsonb', default: {} })
    view_state: Record<string, any>;

    @Column({ type: 'timestamp', precision: 3, default: () => 'CURRENT_TIMESTAMP(3)' })
    updated_at: Date;

    @Column({ default: false })
    deleted: boolean;
}
