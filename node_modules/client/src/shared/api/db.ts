import { createRxDatabase, RxDatabase, RxCollection, addRxPlugin, removeRxDatabase } from 'rxdb';
import { v5 as uuidv5 } from 'uuid';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { replicateRxCollection } from 'rxdb/plugins/replication';
import { BatchSyncManager } from './BatchSyncManager';
import { itemSchema } from './schemas/item.schema';
import { widgetSchema } from './schemas/widget.schema';
import { linkSchema } from './schemas/link.schema';
import { pageSchema } from './schemas/page.schema';

const API_URL = 'http://localhost:3000';
const DB_NAME_PREFIX = 'project_canvas_gtd_';

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

export type CanvasLink = {
    id: string;
    source_widget_id: string;
    target_widget_id: string;
    link_type: string;
    updated_at: string;
    is_deleted: boolean;
    created_at: number;
};

export type CanvasPage = {
    id: string;
    user_id: string;
    is_default: boolean;
    viewport_config: Record<string, any>;
    updated_at: string;
    is_deleted: boolean;
};

export type DataItemCollection = RxCollection<DataItem>;
export type CanvasWidgetCollection = RxCollection<CanvasWidget>;
export type CanvasLinkCollection = RxCollection<CanvasLink>;
export type CanvasPageCollection = RxCollection<CanvasPage>;

export type DatabaseCollections = {
    items: DataItemCollection;
    widgets: CanvasWidgetCollection;
    links: CanvasLinkCollection;
    pages: CanvasPageCollection;
};

export type ProjectCanvasDatabase = RxDatabase<DatabaseCollections>;

/**
 * Destroy database for user (Cleanup)
 */
export async function destroyDatabaseForUser(userId: string) {
    const dbName = `${DB_NAME_PREFIX}${userId}`;
    try {
        await removeRxDatabase(dbName, getRxStorageDexie());
        console.log(`Database ${dbName} deleted.`);
    } catch (err) {
        console.error('Failed to remove database:', err);
    }
}

/**
 * Singleton DatabaseService for managing RxDB instance
 */
export class DatabaseService {
    private static instance: DatabaseService;
    private db: ProjectCanvasDatabase | null = null;
    private initializationPromise: Promise<ProjectCanvasDatabase> | null = null;
    private batchManager: BatchSyncManager;

    private constructor() {
        this.batchManager = new BatchSyncManager(() => localStorage.getItem('auth_token'));
    }

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
        if (this.db && this.db.name === `${DB_NAME_PREFIX}${userId}`) {
            return this.db;
        }

        // If initialized with different user, close it first
        if (this.db) {
            await this.destroy();
        }

        // If initialization is in progress, wait for it
        if (this.initializationPromise) {
            await this.initializationPromise;
            if (this.db && this.db.name === `${DB_NAME_PREFIX}${userId}`) {
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

            const dbName = `${DB_NAME_PREFIX}${userId}`;
            console.log(`Initializing database: ${dbName}`);

            const db = await createRxDatabase<DatabaseCollections>({
                name: dbName,
                storage: storage,
                ignoreDuplicate: true, // Allow re-using existing database
            });

            await db.addCollections({
                items: {
                    schema: itemSchema,
                },
                widgets: {
                    schema: widgetSchema,
                    migrationStrategies: {
                        1: (oldDoc) => {
                            return oldDoc;
                        },
                        2: (oldDoc) => {
                            return oldDoc;
                        },
                        3: (oldDoc) => {
                            return { ...oldDoc, user_id: userId };
                        }
                    }
                },
                links: {
                    schema: linkSchema,
                },
                pages: {
                    schema: pageSchema,
                }
            });

            // Add Middleware: Auto-update updated_at
            db.collections.items.preSave((plainData: any) => {
                plainData.updated_at = new Date().toISOString();
                return plainData;
            }, false);

            db.collections.widgets.preSave((data: any) => {
                data.updated_at = new Date().toISOString();
                return data;
            }, false);

            db.collections.links.preSave((data: any) => {
                data.updated_at = new Date().toISOString();
                return data;
            }, false);

            db.collections.pages.preSave((data: any) => {
                data.updated_at = new Date().toISOString();
                return data;
            }, false);

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
            const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

            // 4. Configure Replication for Pages
            console.log('Starting replication...');

            // 1. Sync Pages FIRST to ensure FK constraints
            const syncStatePages = await replicateRxCollection({
                collection: db.pages,
                replicationIdentifier: 'sync-pages-v1',
                pull: {
                    handler: async (checkpoint: any, batchSize: number) => {
                        const url = new URL(`${API_URL}/sync/canvas_pages/pull`);
                        url.searchParams.set('limit', batchSize.toString());
                        if (checkpoint && checkpoint.updated_at) {
                            url.searchParams.set('checkpoint_time', checkpoint.updated_at);
                            url.searchParams.set('checkpoint_id', checkpoint.id);
                        } else {
                            url.searchParams.set('checkpoint_time', new Date(0).toISOString());
                            url.searchParams.set('checkpoint_id', '00000000-0000-0000-0000-000000000000');
                        }
                        try {
                            const response = await fetch(url.toString(), { headers: headers as any });
                            if (!response.ok) {
                                if (response.status === 401) window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                                throw new Error(`Page Pull failed: ${response.status}`);
                            }
                            const data = await response.json();

                            const documents = data.documents.map((doc: any) => {
                                const { deleted, ...rest } = doc;
                                return { ...rest, is_deleted: deleted };
                            });

                            return { documents, checkpoint: data.checkpoint };
                        } catch (err) {
                            console.error('[RxDB] Page Pull error:', err);
                            throw err;
                        }
                    }
                },
                push: {
                    handler: async (rows: any[]) => {
                        const payload = rows.map(row => {
                            const doc = row.newDocumentState;
                            const { is_deleted, ...rest } = doc;
                            return { ...rest, deleted: is_deleted };
                        });
                        return await this.batchManager.addToQueue('pages', payload);
                    }
                },
                live: true,
                autoStart: true,
                retryTime: 5000,
                waitForLeadership: false, // Start immediately
            });

            // Wait for initial page sync to complete
            await syncStatePages.awaitInitialReplication();
            console.log('Initial page sync completed');

            // 2. Sync Items
            const syncStateItems = await replicateRxCollection({
                collection: db.items,
                replicationIdentifier: 'sync-items-v1',
                pull: {
                    handler: async (checkpoint: any, batchSize: number) => {
                        const url = new URL(`${API_URL}/sync/data_items/pull`);
                        url.searchParams.set('limit', batchSize.toString());
                        if (checkpoint && checkpoint.updated_at) {
                            url.searchParams.set('checkpoint_time', checkpoint.updated_at);
                            url.searchParams.set('checkpoint_id', checkpoint.id);
                        } else {
                            url.searchParams.set('checkpoint_time', new Date(0).toISOString());
                            url.searchParams.set('checkpoint_id', '00000000-0000-0000-0000-000000000000');
                        }
                        try {
                            const response = await fetch(url.toString(), { headers: headers as any });
                            if (!response.ok) {
                                if (response.status === 401) window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                                throw new Error(`Item Pull failed: ${response.status}`);
                            }
                            const data = await response.json();
                            console.log('[RxDB] Item Pull success:', data.documents.length, 'docs'); // DEBUG LOG
                            const documents = data.documents.map((doc: any) => {
                                const { deleted, ...rest } = doc;
                                return { ...rest, is_deleted: deleted };
                            });
                            return { documents, checkpoint: data.checkpoint };
                        } catch (err) {
                            console.error('[RxDB] Item Pull error:', err);
                            throw err;
                        }
                    }
                },
                push: {
                    handler: async (rows: any[]) => {
                        const payload = rows.map(row => {
                            const doc = row.newDocumentState;
                            const { is_deleted, ...rest } = doc;
                            return { ...rest, deleted: is_deleted };
                        });
                        console.log('[RxDB] Pushing items to batch:', payload.length);
                        return await this.batchManager.addToQueue('items', payload);
                    }
                },
                live: true,
                autoStart: true,
                retryTime: 5000,
            });

            // 3. Sync Widgets (After Pages)
            const syncStateWidgets = await replicateRxCollection({
                collection: db.widgets,
                replicationIdentifier: 'sync-widgets-v1',
                pull: {
                    handler: async (checkpoint: any, batchSize: number) => {
                        const url = new URL(`${API_URL}/sync/canvas_widgets/pull`);
                        url.searchParams.set('limit', batchSize.toString());
                        if (checkpoint && checkpoint.updated_at) {
                            url.searchParams.set('checkpoint_time', checkpoint.updated_at);
                            url.searchParams.set('checkpoint_id', checkpoint.id);
                        } else {
                            url.searchParams.set('checkpoint_time', new Date(0).toISOString());
                            url.searchParams.set('checkpoint_id', '00000000-0000-0000-0000-000000000000');
                        }
                        try {
                            const response = await fetch(url.toString(), { headers: headers as any });
                            if (!response.ok) {
                                if (response.status === 401) window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                                throw new Error(`Widget Pull failed: ${response.status}`);
                            }
                            const data = await response.json();
                            console.log('[RxDB] Widget Pull success:', data.documents.length, 'docs');
                            const documents = data.documents.map((doc: any) => {
                                const { deleted, ...rest } = doc;
                                return { ...rest, is_deleted: deleted };
                            });
                            return { documents, checkpoint: data.checkpoint };
                        } catch (err) {
                            console.error('[RxDB] Widget Pull error:', err);
                            throw err;
                        }
                    }
                },
                push: {
                    handler: async (rows: any[]) => {
                        const payload = rows.map(row => {
                            const doc = row.newDocumentState;
                            const { is_deleted, ...rest } = doc;
                            return { ...rest, deleted: is_deleted };
                        });
                        console.log('[RxDB] Pushing WIDGETS to batch:', payload.length);
                        return await this.batchManager.addToQueue('widgets', payload);
                    }
                },
                live: true,
                autoStart: true,
                retryTime: 5000,
            });

            // Expose sync state for debugging
            (window as any).syncStateItems = syncStateItems;
            (window as any).syncStateWidgets = syncStateWidgets;
            (window as any).syncStatePages = syncStatePages;

            console.log('Database initialized successfully');

            return db;
        } catch (error) {
            console.error('Database initialization error:', error);
            throw new Error(`Failed to initialize database: ${error}`);
        }
    }

    public async seedDefaultData(db: ProjectCanvasDatabase): Promise<void> {
        try {
            console.log('Checking default data...');
            const now = new Date().toISOString();
            const userId = db.name.replace('project_canvas_gtd_', '');

            // Namespace for deterministic IDs (UUID v5)
            const NAMESPACE_DEFAULT_PAGE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

            // 1. Get or Create Default Page
            const canvasId = uuidv5(userId, NAMESPACE_DEFAULT_PAGE);

            // Check if it exists by ID (Primary Key is faster/safer)
            const existingPage = await db.pages.findOne(canvasId).exec();

            if (existingPage) {
                console.log('Found existing default page:', canvasId);
            } else {
                console.log('Creating deterministic default page:', canvasId);
                try {
                    await db.pages.insert({
                        id: canvasId,
                        user_id: userId,
                        is_default: true,
                        viewport_config: {},
                        updated_at: now,
                        is_deleted: false
                    });
                } catch (err: any) {
                    if (err?.code === 'CONFLICT' || err?.status === 409) {
                        console.log('Default page already exists (race condition handled).');
                    } else {
                        throw err;
                    }
                }
            }

            // --- RECOVERY MIGRATION ---
            // Move any widgets that belong to this user but have a different canvas_id (orphaned from random UUIDs)
            // to this new deterministic default page.
            const orphanedWidgets = await db.widgets.find({
                selector: {
                    user_id: userId,
                    canvas_id: { $ne: canvasId },
                    is_deleted: false
                }
            }).exec();

            if (orphanedWidgets.length > 0) {
                console.log(`Migrating ${orphanedWidgets.length} orphaned widgets to deterministic page ${canvasId}...`);
                await Promise.all(orphanedWidgets.map(w => w.patch({
                    canvas_id: canvasId,
                    updated_at: new Date().toISOString()
                })));
                console.log('Migration complete.');
            }
            // --------------------------

            // --- CANVAS RESIZE MIGRATION ---
            // Move widgets that are out of bounds (old 50k canvas) to new 5k canvas center
            const outOfBoundsWidgets = await db.widgets.find({
                selector: {
                    user_id: userId,
                    'geometry.x': { $gt: 5000 },
                    is_deleted: false
                }
            }).exec();

            if (outOfBoundsWidgets.length > 0) {
                console.log(`Migrating ${outOfBoundsWidgets.length} out-of-bounds widgets to new center...`);
                await Promise.all(outOfBoundsWidgets.map(w => {
                    // Old center ~24415, New ~2100. Delta approx -22315
                    // Or just clamp/reset to center area.
                    // Let's bring them to 2100 + offset relative to old start
                    const oldBaseX = 24415;
                    const oldBaseY = 24700;
                    const newBaseX = 2100;
                    const newBaseY = 2200;

                    const offsetX = w.geometry.x - oldBaseX;
                    const offsetY = w.geometry.y - oldBaseY;

                    return w.patch({
                        geometry: {
                            ...w.geometry,
                            x: newBaseX + offsetX,
                            y: newBaseY + offsetY
                        },
                        updated_at: new Date().toISOString()
                    });
                }));
                console.log('Resize migration complete.');
            }
            // --------------------------

            const widgetCount = await db.widgets.count().exec();
            if (widgetCount > 0) {
                console.log('Widgets already exist, skipping widget seeding.');
                return;
            }

            // Ensure only registered users trigger cold start seeding.
            // (Assuming valid UUIDs are registered users and ignoring potential 'guest' prefixes if any exist in future)
            if (userId && userId.startsWith('guest_')) {
                console.log('Skipping default data seeding for guest user:', userId);
                return;
            }

            console.log('Seeding default widgets for user:', userId);
            const defaultGroupId = self.crypto.randomUUID(); // Deterministic group ID

            // Center of 5000x5000 is 2500, 2500.
            // Master Calendar is 800x600.
            // Center X = 2500 - (800/2) = 2100
            // Center Y = 2500 - (600/2) = 2200
            const startX = 2100;
            const startY = 2200;

            await db.widgets.bulkInsert([
                // 1. Master Calendar
                {
                    id: self.crypto.randomUUID(),
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
                    id: self.crypto.randomUUID(),
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
                    id: self.crypto.randomUUID(),
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
            try {
                // Try destroy (standard RxDB close)
                if (typeof (this.db as any).destroy === 'function') {
                    await (this.db as any).destroy();
                } else if (typeof (this.db as any).close === 'function') {
                    // Fallback to close if destroy is missing
                    await (this.db as any).close();
                } else {
                    console.warn('Database instance does not have destroy or close method');
                }
            } catch (e) {
                console.error('Error closing database:', e);
            }
            this.db = null;
            this.initializationPromise = null;
        }
    }
}

// Export singleton instance
export const dbService = DatabaseService.getInstance();
