import { IsArray, IsOptional } from 'class-validator';

export class BatchPushDto {
    @IsOptional()
    @IsArray()
    pages?: any[];

    @IsOptional()
    @IsArray()
    widgets?: any[];

    @IsOptional()
    @IsArray()
    links?: any[];

    @IsOptional()
    @IsArray()
    items?: any[];
}
