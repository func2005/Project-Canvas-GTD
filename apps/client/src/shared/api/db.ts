import { createRxDatabase, RxDatabase, RxCollection, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { dataItemsSchema, canvasWidgetsSchema } from './schema';
import { canvasLinksSchema, CanvasLink } from './schemas/canvasLinks';

// Enable dev-mode for better error messages (only in development)
if (process.env.NODE_ENV !== 'production') {
    addRxPlugin(RxDBDevModePlugin);
}

// Enable update plugin
// Enable update plugin
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);

// Type definitions for collections
export type DataItem = {
    id: string;
    user_id: string;
    entity_type: 'task' | 'event' | 'project';
    system_status: 'active' | 'completed' | 'dropped' | 'archived' | 'waiting';
    title: string;
    parent_id?: string | null;
    sort_order?: number;
    do_date?: string | null;
    due_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    is_all_day?: boolean;
    recurrence_rule?: string | null;
    original_event_id?: string | null;
    properties: {
        priority?: 'high' | 'normal' | 'low';
        energy_level?: 'high' | 'medium' | 'low';
        tags?: string[];
        content?: string;
        project_id?: string;
    };
    updated_at: string;
    is_deleted: boolean;
    created_at: number;
    completed_at?: number | null;
};

export type CanvasWidget = {
    id: string;
    canvas_id: string;
    group_id?: string;
    widget_type: 'calendar_master' | 'smart_list' | 'matrix' | 'detail' | 'project_header' | 'archive_bin';
    geometry: {
        x: number;
        y: number;
        w: number;
        h: number;
        z?: number;
    };
    data_source_config: Record<string, any>;
    view_state?: {
        is_pinned?: boolean;
        is_collapsed?: boolean;
        view_mode?: string;
    };
    updated_at: string;
    is_deleted: boolean;
};

export type { CanvasLink };

export type DataItemCollection = RxCollection<DataItem>;
export type CanvasWidgetCollection = RxCollection<CanvasWidget>;
export type CanvasLinkCollection = RxCollection<CanvasLink>;

export type DatabaseCollections = {
    items: DataItemCollection;
    widgets: CanvasWidgetCollection;
    links: CanvasLinkCollection;
};

export type ProjectCanvasDatabase = RxDatabase<DatabaseCollections>;

/**
 * Singleton DatabaseService for managing RxDB instance
 */
export class DatabaseService {
    private static instance: DatabaseService;
    private db: ProjectCanvasDatabase | null = null;
    private initializationPromise: Promise<ProjectCanvasDatabase> | null = null;

    private constructor() { }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    /**
     * Initialize the database (singleton pattern)
     */
    public async initialize(): Promise<ProjectCanvasDatabase> {
        // If already initialized, return existing database
        if (this.db) {
            return this.db;
        }

        // If initialization is in progress, wait for it
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        // Start initialization
        this.initializationPromise = this.initializeDatabase();

        try {
            this.db = await this.initializationPromise;
            return this.db;
        } catch (error) {
            console.error('Failed to initialize database:', error);
            this.initializationPromise = null;
            throw error;
        }
    }

    private async initializeDatabase(): Promise<ProjectCanvasDatabase> {
        try {
            // Wrap storage with validator for dev-mode
            const storage = process.env.NODE_ENV !== 'production'
                ? wrappedValidateAjvStorage({ storage: getRxStorageDexie() })
                : getRxStorageDexie();

            const db = await createRxDatabase<DatabaseCollections>({
                name: 'project_canvas_gtd',
                storage: storage,
                ignoreDuplicate: true, // Allow re-using existing database
            });

            await db.addCollections({
                items: {
                    schema: dataItemsSchema,
                },
                widgets: {
                    schema: canvasWidgetsSchema,
                    migrationStrategies: {
                        1: (oldDoc) => {
                            return oldDoc;
                        }
                    }
                },
                links: {
                    schema: canvasLinksSchema,
                }
            });

            console.log('Database initialized successfully');
            return db;
        } catch (error) {
            console.error('Database initialization error:', error);
            throw new Error(`Failed to initialize database: ${error}`);
        }
    }

    /**
     * Get the database instance
     */
    public getDatabase(): ProjectCanvasDatabase {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    /**
     * Destroy the database (for testing purposes)
     */
    public async destroy(): Promise<void> {
        if (this.db) {
            await this.db.remove();
            this.db = null;
            this.initializationPromise = null;
        }
    }
}

// Export singleton instance
export const dbService = DatabaseService.getInstance();
