import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('canvas_widgets')
export class CanvasWidget {
    @PrimaryColumn('uuid')
    id: string;

    @Index()
    @Column()
    canvas_id: string;

    @Index()
    @Column({ nullable: true })
    user_id: string;

    @Column()
    widget_type: string;

    @Column('jsonb', { default: {} })
    geometry: any;

    @Column('jsonb', { default: {} })
    data_source_config: any;

    @Column('jsonb', { default: {} })
    view_state: any;

    @Index()
    @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date;

    @Column({ default: false })
    deleted: boolean;
}
