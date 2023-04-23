import { genPostgresAPI } from "../index";

export type Col = "id" | "created" | "name" | "blogs";

export interface Row {
  id?:      number;
  created?: Date;
  name?:    string;
  blogs?:   string[]
}

export const queries = {
  up: /*sql*/`CREATE`,
  down: /*sql*/`DROP`,
};

export const db = genPostgresAPI<Col, Row>("test");