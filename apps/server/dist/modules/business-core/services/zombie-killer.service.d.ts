import { DataSource } from 'typeorm';
export declare class ZombieKillerService {
    private dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    handleCron(): Promise<void>;
}
