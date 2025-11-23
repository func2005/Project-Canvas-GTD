import { v4 as uuidv4 } from 'uuid';
import { dbService, DataItem } from '../db';

/**
 * Service for managing data items (tasks, events, projects)
 */
export class ItemService {
    /**
     * Create a new task
     */
    static async createNewTask(title: string, doDate?: string): Promise<DataItem> {
        const db = dbService.getDatabase();

        const newTask: DataItem = {
            id: uuidv4(),
            user_id: 'default_user', // TODO: Replace with actual user ID from auth
            entity_type: 'task',
            system_status: 'active',
            title,
            do_date: doDate || null,
            properties: {},
            updated_at: new Date().toISOString(),
            is_deleted: false,
            created_at: Date.now(),
        };

        const insertedDoc = await db.items.insert(newTask);
        return insertedDoc.toJSON() as DataItem;
    }

    /**
     * Create a new event
     */
    static async createNewEvent(
        title: string,
        startTime: string,
        endTime: string,
        isAllDay = false
    ): Promise<DataItem> {
        const db = dbService.getDatabase();

        const newEvent: DataItem = {
            id: uuidv4(),
            user_id: 'default_user',
            entity_type: 'event',
            system_status: 'active',
            title,
            start_time: startTime,
            end_time: endTime,
            is_all_day: isAllDay,
            properties: {},
            updated_at: new Date().toISOString(),
            is_deleted: false,
            created_at: Date.now(),
        };

        const insertedDoc = await db.items.insert(newEvent);
        return insertedDoc.toJSON() as DataItem;
    }

    /**
     * Create a new project
     */
    static async createNewProject(title: string): Promise<DataItem> {
        const db = dbService.getDatabase();

        const newProject: DataItem = {
            id: uuidv4(),
            user_id: 'default_user',
            entity_type: 'project',
            system_status: 'active',
            title,
            properties: {},
            updated_at: new Date().toISOString(),
            is_deleted: false,
            created_at: Date.now(),
        };

        const insertedDoc = await db.items.insert(newProject);
        return insertedDoc.toJSON() as DataItem;
    }

    /**
     * Get tasks by date
     */
    static async getTasksByDate(dateString: string): Promise<DataItem[]> {
        const db = dbService.getDatabase();

        const tasks = await db.items.find({
            selector: {
                entity_type: 'task',
                system_status: 'active',
                do_date: dateString,
                is_deleted: false
            }
        }).exec();

        return tasks.map(doc => doc.toJSON() as DataItem);
    }

    /**
     * Get all active items
     */
    static async getAllActiveItems(): Promise<DataItem[]> {
        const db = dbService.getDatabase();

        const items = await db.items.find({
            selector: {
                system_status: 'active',
                is_deleted: false
            }
        }).exec();

        return items.map(doc => doc.toJSON() as DataItem);
    }

    /**
     * Update an item
     */
    static async updateItem(id: string, updates: Partial<DataItem>): Promise<DataItem | null> {
        const db = dbService.getDatabase();

        const doc = await db.items.findOne(id).exec();
        if (!doc) {
            return null;
        }

        await doc.update({
            $set: {
                ...updates,
                updated_at: new Date().toISOString()
            }
        });

        return doc.toJSON() as DataItem;
    }

    /**
     * Soft delete an item
     */
    static async deleteItem(id: string): Promise<boolean> {
        const db = dbService.getDatabase();

        const doc = await db.items.findOne(id).exec();
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

    /**
     * Mark task as completed
     */
    static async completeTask(id: string): Promise<DataItem | null> {
        const db = dbService.getDatabase();

        const doc = await db.items.findOne(id).exec();
        if (!doc || doc.entity_type !== 'task') {
            return null;
        }

        await doc.update({
            $set: {
                system_status: 'completed',
                completed_at: Date.now(),
                updated_at: new Date().toISOString()
            }
        });

        return doc.toJSON() as DataItem;
    }
}
