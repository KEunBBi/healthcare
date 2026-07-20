import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn({ name: 'user_id', type: 'varchar', length: 20 })
  userId: string;

  @Column({ name: 'password', type: 'varchar', length: 200 })
  password: string;

  @Column({ name: 'name', type: 'varchar', length: 50 })
  name: string;

  @Column({ name: 'gender', type: 'varchar', length: 1 })
  gender: string;

  @Column({ name: 'birth_date', type: 'varchar', length: 8 })
  birthDate: string;

  @Column({ name: 'user_type', type: 'varchar', length: 4 })
  userType: string;

  @Column({ name: 'api_key', type: 'varchar', length: 50, nullable: true })
  apiKey: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
