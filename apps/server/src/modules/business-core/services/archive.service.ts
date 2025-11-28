import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { DataItem } from '../entities/data-item.entity';

@Injectable()
export class ArchiveService {
    constructor(
        @InjectRepository(DataItem)
        private itemsRepository: Repository<DataItem>,
    ) { }

    async getArchivedItems(page: number = 1, limit: number = 20, search?: string) {
        const skip = (page - 1) * limit;

        const whereClause: any = {
            system_status: In(['completed', 'dropped']),
            deleted: false
        };

        if (search) {
            whereClause.title = Like(`%${search}%`);
        }

        const [items, total] = await this.itemsRepository.findAndCount({
            where: whereClause,
            order: { updated_at: 'DESC' },
            take: limit,
            skip: skip
        });

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }
}
