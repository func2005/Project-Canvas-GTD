import { DataSource } from 'typeorm';
export declare class ZombieService {
    private dataSource;
    constructor(dataSource: DataSource);
    detectZombies(): Promise<void>;
}
