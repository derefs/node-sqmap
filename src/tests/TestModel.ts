import { genPostgresAPI } from "../index.js";

export type Col = "id" | "created" | "status" | "name" | "username" | "email" | "info";

export interface Row {
  id?:       number;
  created?:  Date;
  status?:   "active" | "banned";
  name?:     string;
  username?: string;
  email?:    string;
  info?:     Info;
}

export interface Info {
  subscription_plan: "basic" | "premium";
}

export const queries = {
  up: /*sql*/ `CREATE TABLE IF NOT EXISTS "users" (
    "id"       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "created"  TIMESTAMP DEFAULT NOW(),
    "status"   TEXT,
    "username" TEXT,
    "name"     TEXT,
    "email"    TEXT UNIQUE,
    "info"     JSONB
  );`,
  indexStatus: /*sql*/ `CREATE INDEX users_status_index ON "users" USING HASH ("status");`,
  down: /*sql*/ `DROP TABLE "users";`
};

// In order to get the proper type-checking you need to pass Col and Row as type parameters
export const db = genPostgresAPI<Row>("users");