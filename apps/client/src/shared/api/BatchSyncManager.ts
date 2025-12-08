
interface PendingChange {
    collection: 'pages' | 'widgets' | 'items' | 'links';
    rows: any[];
    resolve: (value: any) => void;
    reject: (reason: any) => void;
}

export class BatchSyncManager {
    private queue: PendingChange[] = [];
    private debounceTimer: any = null;
    private readonly DEBOUNCE_MS = 50; // Buffer window
    private readonly API_URL = 'http://localhost:3000/sync/batch/push';

    constructor(private getToken: () => string | null) { }

    /**
     * Called by RxDB. We return a promise that resolves when the batch is flushed.
     */
    public async addToQueue(collection: string, rows: any[]): Promise<any[]> {
        return new Promise((resolve, reject) => {
            // 1. Enqueue
            this.queue.push({
                collection: collection as any,
                rows,
                resolve,
                reject,
            });

            // 2. Debounce
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }
            this.debounceTimer = setTimeout(() => this.flush(), this.DEBOUNCE_MS);
        });
    }

    private async flush() {
        if (this.queue.length === 0) return;

        // 1. Snapshot
        const currentBatch = [...this.queue];
        this.queue = [];
        this.debounceTimer = null;

        // 2. Build Payload
        const payload = {
            pages: [] as any[],
            widgets: [] as any[],
            links: [] as any[],
            items: [] as any[],
        };

        currentBatch.forEach(item => {
            if (payload[item.collection]) {
                payload[item.collection].push(...item.rows);
            }
        });

        try {
            // 3. Send Request
            const token = this.getToken();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            console.log('[BatchSync] Flushing:', {
                pages: payload.pages.length,
                widgets: payload.widgets.length,
                links: payload.links.length,
                items: payload.items.length
            });

            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                }
                throw new Error(`Batch Push failed: ${response.status}`);
            }

            // 4. Success: Resolve all promises
            // RxDB expects empty array for success (no conflicts)
            currentBatch.forEach(item => {
                item.resolve([]);
            });

        } catch (error) {
            // 5. Failure: Reject all promises
            console.error('[BatchSync] Failed:', error);
            currentBatch.forEach(item => {
                item.reject(error);
            });
        }
    }
}
