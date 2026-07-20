import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'user_step_counts' })
@Index(['userId', 'measuredAt'])
export class UserStepCountEntity {
  @PrimaryGeneratedColumn({ name: 'seq', type: 'bigint' })
  seq: string;

  @Column({ name: 'user_id', type: 'varchar', length: 20 })
  userId: string;

  @Column({ name: 'step_count', type: 'integer' })
  stepCount: number;

  @Column({ name: 'measured_at', type: 'timestamptz' })
  measuredAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
