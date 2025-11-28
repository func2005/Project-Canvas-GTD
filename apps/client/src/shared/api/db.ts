import { createRxDatabase, RxDatabase, RxCollection, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { dataItemsSchema, canvasWidgetsSchema } from './schema';
import { canvasLinksSchema, CanvasLink } from './schemas/canvasLinks';
import { v4 as uuidv4 } from 'uuid';

// Enable dev-mode for better error messages (only in development)
if (process.env.NODE_ENV !== 'production') {
    addRxPlugin(RxDBDevModePlugin);
}

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
    user_id: string;
    canvas_id: string;
    group_id?: string;
    widget_type: 'calendar_master' | 'smart_list' | 'matrix' | 'detail' | 'project_header' | 'archive_bin' | 'timeline';
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
    public async initialize(userId: string): Promise<ProjectCanvasDatabase> {
        // If already initialized with same user, return existing database
        if (this.db && this.db.name === `project_canvas_gtd_${userId}`) {
            return this.db;
        }

        // If initialized with different user, close it first
        if (this.db) {
            await this.destroy();
        }

        // If initialization is in progress, wait for it
        if (this.initializationPromise) {
            await this.initializationPromise;
            if (this.db && this.db.name === `project_canvas_gtd_${userId}`) {
                return this.db;
            }
        }

        // Start initialization
        this.initializationPromise = this.initializeDatabase(userId);

        try {
            this.db = await this.initializationPromise;
            return this.db;
        } catch (error) {
            console.error('Failed to initialize database:', error);
            this.initializationPromise = null;
            throw error;
        }
    }

    private async initializeDatabase(userId: string): Promise<ProjectCanvasDatabase> {
        try {
            // Wrap storage with validator for dev-mode
            const storage = process.env.NODE_ENV !== 'production'
                ? wrappedValidateAjvStorage({ storage: getRxStorageDexie() })
                : getRxStorageDexie();

            const dbName = `project_canvas_gtd_${userId}`;
            console.log(`Initializing database: ${dbName}`);

            const db = await createRxDatabase<DatabaseCollections>({
                name: dbName,
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
                        },
                        2: (oldDoc) => {
                            return oldDoc;
                        },
                        3: (oldDoc) => {
                            // Migration to add user_id
                            // Since we don't know the user_id here easily without context, 
                            // and this is client-side where DB is per-user (db name has user_id),
                            // we can try to infer or leave it empty/default.
                            // However, for strict schema, it might need a value.
                            // But since the DB is partitioned by user, we can assume the current user owns it.
                            // For now, let's just return oldDoc and let the application handle missing fields if possible,
                            // or set a placeholder.
                            return { ...oldDoc, user_id: userId };
                        }
                    }
                },
                links: {
                    schema: canvasLinksSchema,
                }
            });

            // Add hook for project auto-completion and auto-active
            db.items.postSave(async (doc, _oldDoc) => {
                // 1. Check if updated item is a task and belongs to a project
                if (doc.entity_type === 'task' && doc.properties?.project_id) {
                    const projectId = doc.properties.project_id;

                    // 2. Find the project
                    const project = await db.items.findOne(projectId).exec();

                    // Skip if project not found
                    if (!project) return;

                    // 3. Find all active tasks for this project
                    const projectTasks = await db.items.find({
                        selector: {
                            entity_type: 'task',
                            'properties.project_id': projectId,
                            is_deleted: false
                        }
                    }).exec();

                    // Ensure there is at least one task
                    if (projectTasks.length === 0) return;

                    const anyActive = projectTasks.some(t => t.system_status === 'active');
                    const allCompleted = projectTasks.every(t => t.system_status === 'completed');

                    // Case 1: Auto-Active (Re-open project if any task is active)
                    if (anyActive && project.system_status === 'completed') {
                        console.log(`Auto-activating project ${project.title} (${projectId})`);
                        await project.incrementalPatch({
                            system_status: 'active'
                        });
                    }
                    // Case 2: Auto-Complete (Complete project if all tasks are done)
                    else if (allCompleted && project.system_status !== 'completed') {
                        console.log(`Auto-completing project ${project.title} (${projectId})`);
                        await project.incrementalPatch({
                            system_status: 'completed'
                        });
                    }
                }
            }, false);

            // Get token for sync
            const token = localStorage.getItem('auth_token');
            console.log('[RxDB] Retrieved token from localStorage:', token ? token.substring(0, 20) + '...' : 'null');
            const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
            console.log('[RxDB] Sync headers:', headers);

            // 4. Configure Replication for Items
            const syncStateItems = await replicateRxCollection({
                collection: db.items,
                replicationIdentifier: 'items-sync',
                push: {
                    handler: async (changeRows) => {
                        const logMsg = `[RxDB] Pushing items: ${changeRows.length} rows`;
                        console.log(logMsg);
                        (window as any).logs = (window as any).logs || [];
                        (window as any).logs.push(logMsg);

                        try {
                            const rawResponse = await fetch('http://localhost:3002/sync/items/push', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    ...headers
                                } as any,
                                body: JSON.stringify({ changeRows })
                            });
                            if (!rawResponse.ok) {
                                console.error('[RxDB] Item Push failed:', rawResponse.status, rawResponse.statusText);
                                if (rawResponse.status === 401) {
                                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                                }
                                throw new Error(`Push failed: ${rawResponse.status} ${rawResponse.statusText}`);
                            }
                            const response = await rawResponse.json();
                            console.log('[RxDB] Item Push success:', response);
                            return response.conflicts || [];
                        } catch (err) {
                            console.error('[RxDB] Item Push error:', err);
                            throw err;
                        }
                    }
                },
                pull: {
                    handler: async (checkpoint, limit) => {
                        const url = new URL('http://localhost:3002/sync/items/pull');
                        url.searchParams.set('checkpoint', checkpoint ? checkpoint.toString() : '0');
                        url.searchParams.set('limit', limit.toString());
                        console.log('[RxDB] Pulling items:', url.toString());

                        try {
                            const response = await fetch(url.toString(), { headers: headers as any });
                            if (!response.ok) {
                                console.error('[RxDB] Item Pull failed:', response.status, response.statusText);
                                if (response.status === 401) {
                                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                                }
                                throw new Error(`Pull failed: ${response.status} ${response.statusText}`);
                            }
                            const data = await response.json();
                            console.log('[RxDB] Item Pull success:', data.documents.length, 'docs');
                            return {
                                documents: data.documents,
                                checkpoint: data.checkpoint
                            };
                        } catch (err) {
                            console.error('[RxDB] Item Pull error:', err);
                            throw err;
                        }
                    }
                },
                live: true,
                autoStart: true,
                retryTime: 5000,
            });

            // 5. Configure Replication for Widgets
            const syncStateWidgets = await replicateRxCollection({
                collection: db.widgets,
                replicationIdentifier: 'widgets-sync',
                push: {
                    handler: async (changeRows) => {
                        const logMsg = `[RxDB] Pushing widgets: ${changeRows.length} rows`;
                        console.log(logMsg);
                        (window as any).logs = (window as any).logs || [];
                        (window as any).logs.push(logMsg);

                        try {
                            const rawResponse = await fetch('http://localhost:3002/sync/widgets/push', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    ...headers
                                } as any,
                                body: JSON.stringify({ changeRows })
                            });
                            if (!rawResponse.ok) {
                                const errorMsg = `[RxDB] Widget Push failed: ${rawResponse.status} ${rawResponse.statusText}`;
                                console.error(errorMsg);
                                (window as any).logs = (window as any).logs || [];
                                (window as any).logs.push(errorMsg);

                                if (rawResponse.status === 401) {
                                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                                }
                                throw new Error(errorMsg);
                            }
                            const response = await rawResponse.json();
                            const successMsg = `[RxDB] Widget Push success: ${JSON.stringify(response)}`;
                            console.log(successMsg);
                            (window as any).logs = (window as any).logs || [];
                            (window as any).logs.push(successMsg);

                            return response.conflicts || [];
                        } catch (err) {
                            const errorMsg = `[RxDB] Widget Push error: ${err}`;
                            console.error(errorMsg);
                            (window as any).logs = (window as any).logs || [];
                            (window as any).logs.push(errorMsg);
                            throw err;
                        }
                    }
                },
                pull: {
                    handler: async (checkpoint, limit) => {
                        const url = new URL('http://localhost:3002/sync/widgets/pull');
                        url.searchParams.set('checkpoint', checkpoint ? checkpoint.toString() : '0');
                        url.searchParams.set('limit', limit.toString());
                        console.log('[RxDB] Pulling widgets:', url.toString());

                        try {
                            const response = await fetch(url.toString(), { headers: headers as any });
                            if (!response.ok) {
                                console.error('[RxDB] Widget Pull failed:', response.status, response.statusText);
                                if (response.status === 401) {
                                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                                }
                                throw new Error(`Widget Pull failed: ${response.status} ${response.statusText}`);
                            }
                            const data = await response.json();
                            console.log('[RxDB] Widget Pull success:', data.documents.length, 'docs');
                            return {
                                documents: data.documents,
                                checkpoint: data.checkpoint
                            };
                        } catch (err) {
                            console.error('[RxDB] Widget Pull error:', err);
                            throw err;
                        }
                    }
                },
                live: true,
                autoStart: true,
                retryTime: 5000,
            });

            // Expose sync state for debugging
            (window as any).syncStateItems = syncStateItems;
            (window as any).syncStateWidgets = syncStateWidgets;

            console.log('Database initialized successfully');

            return db;
        } catch (error) {
            console.error('Database initialization error:', error);
            throw new Error(`Failed to initialize database: ${error}`);
        }
    }

    public async seedDefaultData(db: ProjectCanvasDatabase): Promise<void> {
        try {
            const widgetCount = await db.widgets.count().exec();

            if (widgetCount > 0) {
                return;
            }

            console.log('Seeding default widgets...');
            const now = new Date().toISOString();
            const canvasId = 'default_canvas'; // Match CanvasBoard default
            const defaultGroupId = 'group_default_main'; // Deterministic group ID

            // Center calculation for 50000x50000 canvas
            // Total width: 800 (Calendar) + 20 (Gap) + 350 (Sidebar) = 1170
            // Total height: 600 (Calendar)
            // Center X: 25000 - 1170/2 = 24415
            // Center Y: 25000 - 600/2 = 24700

            const startX = 24415;
            const startY = 24700;
            const userId = db.name.replace('project_canvas_gtd_', '');

            await db.widgets.bulkInsert([
                // 1. Master Calendar
                {
                    id: 'widget_default_calendar',
                    canvas_id: canvasId,
                    group_id: defaultGroupId,
                    widget_type: 'calendar_master',
                    geometry: { x: startX, y: startY, w: 800, h: 600 },
                    data_source_config: {},
                    updated_at: now,
                    is_deleted: false,
                    user_id: userId
                },
                // 2. Inbox (Smart List)
                {
                    id: 'widget_default_inbox',
                    canvas_id: canvasId,
                    // group_id: defaultGroupId, // Inbox should be independent
                    widget_type: 'smart_list',
                    geometry: { x: startX + 820, y: startY, w: 350, h: 400 },
                    data_source_config: {
                        title: 'Inbox',
                        criteria: {
                            do_date: null,
                            system_status: 'active'
                        }
                    },
                    updated_at: now,
                    is_deleted: false,
                    user_id: userId
                },
                // 3. Archive Bin (The Shredder)
                {
                    id: 'widget_default_archive',
                    canvas_id: canvasId,
                    group_id: defaultGroupId,
                    widget_type: 'archive_bin',
                    geometry: { x: startX + 820, y: startY + 420, w: 350, h: 180 },
                    data_source_config: {},
                    view_state: {
                        is_collapsed: true
                    },
                    updated_at: now,
                    is_deleted: false,
                    user_id: userId
                }
            ]);
            console.log('Default widgets seeded successfully');
        } catch (error) {
            console.error('Failed to seed default data:', error);
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
