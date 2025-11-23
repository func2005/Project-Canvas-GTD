import { Entity, Column, PrimaryGeneratedColumn, Index, UpdateDateColumn } from 'typeorm';
import { WidgetType } from '@project-canvas/shared-types';

@Entity('canvas_widgets')
@Index(['canvas_id'])
export class CanvasWidget {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    canvas_id: string;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    @Column({ default: false })
    deleted: boolean;

    @Column()
    widget_type: WidgetType;

    @Column('jsonb')
    geometry: {
        x: number;
        y: number;
        w: number;
        h: number;
        z: number;
    };

    @Column('jsonb')
    data_source_config: Record<string, any>;

    @Column('jsonb', { default: {} })
    view_state: Record<string, any>;
}
