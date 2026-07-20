import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'disease_codes' })
export class DiseaseCodeEntity {
  @PrimaryColumn({ name: 'disease_id', type: 'varchar', length: 20 })
  diseaseId: string;

  @Column({ name: 'name_en', type: 'varchar', length: 100 })
  nameEn: string;

  @Column({ name: 'name_kr', type: 'varchar', length: 100 })
  nameKr: string;

  @Column({ name: 'category', type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @Column({ name: 'severity', type: 'varchar', length: 20, nullable: true })
  severity: string | null;

  @Column({ name: 'description', type: 'varchar', length: 512, nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
