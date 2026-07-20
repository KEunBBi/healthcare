import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'user_glucoses' })
@Index(['userId', 'measuredAt'])
export class UserGlucoseEntity {
  @PrimaryGeneratedColumn({ name: 'seq', type: 'bigint' })
  seq: string;

  @Column({ name: 'user_id', type: 'varchar', length: 20 })
  userId: string;

  @Column({ name: 'glucose_mg_dl', type: 'integer' })
  glucoseMgDl: number;

  @Column({ name: 'status', type: 'varchar', length: 100, nullable: true })
  status: string | null;

  @Column({ name: 'note', type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @Column({ name: 'measured_at', type: 'timestamptz' })
  measuredAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
