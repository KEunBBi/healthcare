import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'user_blood_pressures' })
@Index(['userId', 'measuredAt'])
export class UserBloodPressureEntity {
  @PrimaryGeneratedColumn({ name: 'seq', type: 'bigint' })
  seq: string;

  @Column({ name: 'user_id', type: 'varchar', length: 20 })
  userId: string;

  @Column({ name: 'systolic', type: 'integer' })
  systolic: number;

  @Column({ name: 'diastolic', type: 'integer' })
  diastolic: number;

  @Column({ name: 'status', type: 'varchar', length: 200, nullable: true })
  status: string | null;

  @Column({ name: 'note', type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @Column({ name: 'measured_at', type: 'timestamptz' })
  measuredAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
