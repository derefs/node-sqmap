export type CompOp = "=" | "<" | ">" | ">=" | "<=" | "!=";
export type BetweenOp = "AND" | "OR";
export type BetweenExtOp = "AND" | "OR" | "NOT";
export type InOp = "IN" | "NOT IN";
export type LikeOp = "LIKE" | "NOT LIKE" | "ILIKE" | "NOT ILIKE";
export type OrderType = "ASC" | "DESC";
export type ExtractColsFromRow<T> = {
  [P in keyof T]: P
}[keyof T];

export interface Format {
  params: {
    prefix: string;
    index:  "from-0" | "from-1" | "named" | false;
  };
  quotingChar: `"` | "`";
}

export interface SQLData {
  query:  string;
  params: any[];
}

export interface DebugOptions {
  enable?:   boolean;
  print?: {
    query?:  boolean;
    params?: boolean;
    timing?: boolean;
  };
  printAll?: boolean;
  dryRun?:   boolean;
  explain?:  boolean;
  inputs?:   (query: string, params: any[], timing: number) => void;
}

export interface InsertQueryParams<TCol, TRow> {
  cols:    TCol[];
  rows:    TRow[];
  return?: TCol[] | "*";
  /**
   * PostgreSQL only.
   */
  debug?:  DebugOptions;
  /**
   * PostgreSQL only, defaults to `public`.
   */
  schema?: string;
}

// FIXME:
// const pageViews = await PageView.db.sqlSelect({
//   cols: ["*"],
//   order: { by: query.orderBy as any, type: query.orderType },
//   like: query.like.length > 0 ? query.like : undefined,
//   where: [["id", "=", 2]],
//   shift: { limit: query.limit, offset: (query.limit * query.page) - query.limit }
// });
// QUERY {
//   matches: [],
//   orderBy: 'id',
//   orderType: 'DESC',
//   like: [],
//   where: [ [ 'id', '=', 2 ] ],
//   limit: 100,
//   page: 1,
//   idGt: undefined,
//   idLt: undefined,
//   idEq: 2
// }
// {
//   query: 'SELECT * FROM "public"."page_views" WHERE "0"=$1 AND "1"=$2 AND "2"=$3 ORDER BY "id" DESC LIMIT $4 OFFSET $5;',
//   params: [ 'id', '=', 2, 100, 0 ]
// }

export interface SelectQueryParams<TCol, TRow> {
  cols:     Array<TCol | "*">;
  where?:   [target: TRow, op?: CompOp, between?: BetweenOp] |
            Array<[col: TCol, op: CompOp, value: any] | BetweenExtOp>;
  in?:      Array<[col: TCol, op: InOp, value: number[] | string[]] | BetweenExtOp>;
  like?:    Array<[col: TCol, op: LikeOp, value: string] | BetweenExtOp>;
  between?: BetweenOp;
  order?:   { by: TCol, type: OrderType };
  shift?:   { limit: number | null, offset: number | null };
  /**
   * PostgreSQL only.
   */
  debug?:   DebugOptions;
  /**
   * PostgreSQL only, defaults to `public`.
   */
  schema?: string;
}

export interface UpdateQueryParams<TCol, TRow> {
  set:      TRow;
  where?:   [target: TRow, op?: CompOp, between?: BetweenOp] |
            Array<[col: TCol, op: CompOp, value: any] | BetweenExtOp>;
  in?:      Array<[col: TCol, op: InOp, value: number[] | string[]] | BetweenExtOp>;
  like?:    Array<[col: TCol, op: LikeOp, value: string] | BetweenExtOp>;
  between?: BetweenOp;
  return?:  TCol[] | "*";
  /**
   * PostgreSQL only.
   */
  debug?:   DebugOptions;
  /**
   * PostgreSQL only, defaults to `public`.
   */
  schema?: string;
}

export interface DeleteQueryParams<TCol, TRow> {
  where?:   [target: TRow, op?: CompOp, between?: BetweenOp] |
            Array<[col: TCol, op: CompOp, value: any] | BetweenExtOp>;
  in?:      Array<[col: TCol, op: InOp, value: number[] | string[]] | BetweenExtOp>;
  like?:    Array<[col: TCol, op: LikeOp, value: string] | BetweenExtOp>;
  between?: BetweenOp;
  return?: TCol[] | "*";
  /**
   * PostgreSQL only.
   */
  debug?:  DebugOptions;
  /**
   * PostgreSQL only, defaults to `public`.
   */
  schema?: string;
}

type Formats = "NODE_PG_POSTGRES" | "BUN_SQLITE_INDEX" | "BUN_SQLITE_NAMED";
export const FORMATS: Record<Formats, Format> = {
  NODE_PG_POSTGRES: {
    params: { prefix: "$", index: "from-1" },
    quotingChar: `"`
  },
  BUN_SQLITE_INDEX: {
    params: { prefix: "?", index: "from-1" },
    quotingChar: `"`
  },
  BUN_SQLITE_NAMED: {
    params: { prefix: "$", index: "named" },
    quotingChar: `"`
  }
};

import { genPostgresAPI } from "./postgres-gen-api.js";
import { runPostgresMigrations } from "./postgres-migrations.js";
import { expect, expectOne } from "./utils.js";

export {
  genPostgresAPI,
  runPostgresMigrations,
  expect, expectOne,
};