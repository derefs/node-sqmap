import pg from "pg";

const HOST = "127.0.0.1";
const PORT = 7888;
const DB   = "sqmap-db";
const USER = "sqmap-user";
const PASS = "sqmap-pass";

export const pool = new pg.Pool({
  host: HOST,
  port: PORT,
  database: DB,
  user: USER,
  password: PASS
});