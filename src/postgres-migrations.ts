import { PoolClient } from "pg";
import { genPostgresAPI } from "./index.js";

export interface Migration {
  name: string;
  exec: (client: PoolClient) => Promise<void>;
}

export interface MigrationConfig {
  table?:                string;
  initialMigrationName?: string;
  schema?:               string;
}

interface MigrationTableRow {
  id?:      number;
  created?: Date;
  name?:    string;
}

export const runPostgresMigrations = async (client: PoolClient, config: MigrationConfig, allMigrations: Migration[]): Promise<void> => {
  const schema = config.schema || "public";
  const Migration = genPostgresAPI<MigrationTableRow>(config.table || "migrations");
  const initMigrationsTable = /*sql*/`CREATE TABLE IF NOT EXISTS "${schema}"."${config.table || "sqmap_migrations"}" (
    "id"      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "created" TIMESTAMP DEFAULT NOW(),
    "name"    TEXT UNIQUE
  );`;
  const initialMigrationName = config.initialMigrationName || "init_db";
  try {
    let migrations: MigrationTableRow[] = [];
    try {
      migrations = (await Migration.select(client, { cols: ["*"], schema })).rows;
    } catch (error: any) {
      if (error.code === "42P01") {
        await client.query(initMigrationsTable, []);
        await Migration.insert(client, {
          cols: ["name"],
          rows: [{ name: initialMigrationName }],
          schema
        });
        migrations = (await Migration.select(client, { cols: ["*"], schema })).rows;
      } else {
        throw error;
      }
    }
    const activeMigrations: string[] = [];
    for (const migration of migrations) {
      activeMigrations.push(migration.name as string);
    }
    for (const migration of allMigrations) {
      if (!activeMigrations.includes(migration.name)) {
        await client.query("BEGIN");
        await migration.exec(client);
        await Migration.insert(client, {
          cols: ["name"],
          rows: [{ name: migration.name }],
          schema
        });
        await client.query("COMMIT");
        activeMigrations.push(migration.name);
        console.log(`Migration "${migration.name}" was executed successfully!`);
      }
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
};