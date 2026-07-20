import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'user_body_records' })
@Index(['userId', 'measuredAt'])
export class UserBodyRecordEntity {
  @PrimaryGeneratedColumn({ name: 'seq', type: 'bigint' })
  seq: string;

  @Column({ name: 'user_id', type: 'varchar', length: 20 })
  userId: string;

  @Column({ name: 'weight_kg', type: 'numeric', precision: 5, scale: 2 })
  weightKg: string;

  @Column({ name: 'bmi', type: 'numeric', precision: 4, scale: 1 })
  bmi: string;

  @Column({ name: 'skeletal_muscle_mass_kg', type: 'numeric', precision: 5, scale: 2, nullable: true })
  skeletalMuscleMassKg: string | null;

  @Column({ name: 'body_fat_percentage', type: 'numeric', precision: 4, scale: 1, nullable: true })
  bodyFatPercentage: string | null;

  @Column({ name: 'status', type: 'varchar', length: 100, nullable: true })
  status: string | null;

  @Column({ name: 'note', type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @Column({ name: 'measured_at', type: 'timestamptz' })
  measuredAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
