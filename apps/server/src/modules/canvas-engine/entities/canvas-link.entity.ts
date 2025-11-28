import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('canvas_links')
export class CanvasLink {
    @PrimaryColumn('uuid')
    id: string;

    @Column('uuid')
    source_widget_id: string;

    @Column('uuid')
    target_widget_id: string;

    @Column()
    type: string;

    @Index()
    @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date;

    @Column({ default: false })
    deleted: boolean;
}
