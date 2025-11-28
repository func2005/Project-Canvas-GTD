import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('increment', { type: 'bigint' })
    id: string;

    @Index({ unique: true })
    @Column()
    username: string;

    @Column()
    password_hash: string;

    @CreateDateColumn()
    created_at: Date;
}
