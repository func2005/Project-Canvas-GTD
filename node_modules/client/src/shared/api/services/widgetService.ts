import { v4 as uuidv4 } from 'uuid';
import { dbService, CanvasWidget } from '../db';

/**
 * Service for managing canvas widgets
 */
export class WidgetService {
    /**
     * Create a new widget
     */
    static async createWidget(
        type: CanvasWidget['widget_type'],
        x: number,
        y: number,
        w = 400,
        h = 300,
        canvasId = 'default_canvas'
    ): Promise<CanvasWidget> {
        const db = dbService.getDatabase();

        const newWidget: CanvasWidget = {
            id: uuidv4(),
            canvas_id: canvasId,
            widget_type: type,
            geometry: { x, y, w, h, z: 0 },
            data_source_config: {},
            view_state: {
                is_pinned: false,
                is_collapsed: false,
                view_mode: 'default'
            },
            updated_at: new Date().toISOString(),
            is_deleted: false,
        };

        const insertedDoc = await db.widgets.insert(newWidget);
        return insertedDoc.toJSON() as CanvasWidget;
    }

    /**
     * Get all widgets for a canvas
     */
    static async getWidgetsByCanvas(canvasId: string): Promise<CanvasWidget[]> {
        const db = dbService.getDatabase();

        const widgets = await db.widgets.find({
            selector: {
                canvas_id: canvasId,
                is_deleted: false
            }
        }).exec();

        return widgets.map(doc => doc.toJSON() as CanvasWidget);
    }

    /**
     * Update widget geometry
     */
    static async updateWidgetGeometry(
        id: string,
        geometry: Partial<CanvasWidget['geometry']>
    ): Promise<CanvasWidget | null> {
        const db = dbService.getDatabase();

        const doc = await db.widgets.findOne(id).exec();
        if (!doc) {
            return null;
        }

        const currentGeometry = doc.geometry;
        await doc.update({
            $set: {
                geometry: { ...currentGeometry, ...geometry },
                updated_at: new Date().toISOString()
            }
        });

        return doc.toJSON() as CanvasWidget;
    }

    /**
     * Update widget data source config
     */
    static async updateWidgetDataSource(
        id: string,
        dataSourceConfig: Record<string, any>
    ): Promise<CanvasWidget | null> {
        const db = dbService.getDatabase();

        const doc = await db.widgets.findOne(id).exec();
        if (!doc) {
            return null;
        }

        await doc.update({
            $set: {
                data_source_config: dataSourceConfig,
                updated_at: new Date().toISOString()
            }
        });

        return doc.toJSON() as CanvasWidget;
    }

    /**
     * Update widget view state
     */
    static async updateWidgetViewState(
        id: string,
        viewState: Partial<CanvasWidget['view_state']>
    ): Promise<CanvasWidget | null> {
        const db = dbService.getDatabase();

        const doc = await db.widgets.findOne(id).exec();
        if (!doc) {
            return null;
        }

        const currentViewState = doc.view_state || {};
        await doc.update({
            $set: {
                view_state: { ...currentViewState, ...viewState },
                updated_at: new Date().toISOString()
            }
        });

        return doc.toJSON() as CanvasWidget;
    }

    /**
     * Delete a widget
     */
    static async deleteWidget(id: string): Promise<boolean> {
        const db = dbService.getDatabase();

        const doc = await db.widgets.findOne(id).exec();
        if (!doc) {
            return false;
        }

        await doc.update({
            $set: {
                is_deleted: true,
                updated_at: new Date().toISOString()
            }
        });

        return true;
    }
}
