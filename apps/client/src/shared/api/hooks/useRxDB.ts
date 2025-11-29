import { useState, useEffect } from 'react';
import { RxDocument } from 'rxdb';
import { dbService, CanvasWidget, DataItem } from '../db';

/**
 * Subscribe to all widgets in a canvas
 * NOTE: Database must be initialized before calling this hook
 */
export function useCanvasWidgets(canvasId: string = 'default_canvas'): RxDocument<CanvasWidget>[] {
    const [widgets, setWidgets] = useState<RxDocument<CanvasWidget>[]>([]);

    useEffect(() => {
        try {
            const db = dbService.getDatabase();

            const query = db.widgets.find({
                selector: {
                    canvas_id: canvasId,
                    is_deleted: false
                }
            });

            // Subscribe to query results
            const sub = query.$.subscribe({
                next: (docs) => setWidgets(docs)
            });

            return () => sub.unsubscribe();
        } catch (error) {
            console.error('useCanvasWidgets error:', error);
            return () => { };
        }
    }, [canvasId]);

    return widgets;
}

/**
 * Subscribe to all active items
 * NOTE: Database must be initialized before calling this hook
 */
export function useActiveItems(): RxDocument<DataItem>[] {
    const [items, setItems] = useState<RxDocument<DataItem>[]>([]);

    useEffect(() => {
        try {
            const db = dbService.getDatabase();

            const query = db.items.find({
                selector: {
                    is_deleted: false,
                    system_status: 'active'
                }
            });

            const sub = query.$.subscribe({
                next: (docs) => setItems(docs)
            });

            return () => sub.unsubscribe();
        } catch (error) {
            console.error('useActiveItems error:', error);
            return () => { };
        }
    }, []);

    return items;
}

/**
 * Generic hook to query a collection
 */
export function useRxQuery<T>(collectionName: 'items' | 'widgets' | 'links', queryObj: any): RxDocument<T>[] {
    const [data, setData] = useState<RxDocument<T>[]>([]);

    useEffect(() => {
        try {
            const db = dbService.getDatabase();
            const collection = db[collectionName];
            if (!collection) return;

            // RxDB find() takes the selector directly or a query object?
            // It takes a MangoQuery object which has selector, sort, limit etc.
            const query = collection.find(queryObj);

            const sub = (query.$ as any).subscribe({
                next: (docs: any) => setData(docs)
            });

            return () => sub.unsubscribe();
        } catch (error) {
            console.error('useRxQuery error:', error);
            return () => { };
        }
    }, [collectionName, JSON.stringify(queryObj)]);

    return data;
}

/**
 * Get the database instance
 */
export function useRxDB() {
    const [db, setDb] = useState<any>(null);

    useEffect(() => {
        try {
            const database = dbService.getDatabase();
            setDb(database);
        } catch (error) {
            // Database might not be ready yet
        }
    }, []);

    return db;
}
