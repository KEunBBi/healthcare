import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DiseaseCodeEntity } from './disease-code.entity';

@Entity({ name: 'user_diseases' })
export class UserDiseaseEntity {
  @PrimaryGeneratedColumn({ name: 'diagnosis_seq', type: 'bigint' })
  diagnosisSeq: string;

  @Column({ name: 'user_id', type: 'varchar', length: 20 })
  userId: string;

  @Column({ name: 'disease_id', type: 'varchar', length: 20 })
  diseaseId: string;

  @ManyToOne(() => DiseaseCodeEntity)
  @JoinColumn({ name: 'disease_id' })
  disease: DiseaseCodeEntity;

  @Column({ name: 'diagnosis_detail', type: 'varchar', length: 512, nullable: true })
  diagnosisDetail: string | null;

  @Column({ name: 'diagnosed_at', type: 'timestamptz' })
  diagnosedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
