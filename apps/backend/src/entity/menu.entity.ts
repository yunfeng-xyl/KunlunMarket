import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Menu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 64 })
  menuName: string;

  @Column({ type: "varchar", default: null, length: 100, nullable: true })
  menu_code: string;

  @PrimaryColumn({ type: "varchar", length: 100 })
  path: string;

  @Column({ type: "varchar", default: "", length: 100, nullable: true })
  description: string;

  @Column({ type: "smallint", default: 0, nullable: true })
  parent_id?: number;

  @Column({ type: "smallint", default: 1, nullable: true })
  node_type?: number;

  @Column({ type: "smallint", default: 1, nullable: true })
  sort?: number;

  @Column({ type: "boolean", default: false, nullable: true })
  hideMenu: string;

  @Column({ type: "varchar", default: "", length: 255, nullable: true })
  icon: string;

  @Column({ type: "smallint", default: 1, nullable: true })
  status?: number;

  @Column({ type: "int", default: 0 })
  createBy?: number;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}
