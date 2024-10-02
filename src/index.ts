export type CompOp = "=" | "<" | ">" | ">=" | "<=" | "!=";
export type BetweenOp = "AND" | "OR";
export type BetweenExtOp = "AND" | "OR" | "NOT";
export type InOp = "IN" | "NOT IN";
export type LikeOp = "LIKE" | "NOT LIKE" | "ILIKE" | "NOT ILIKE";
export type OrderType = "ASC" | "DESC";

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
  debug?:  DebugOptions;
  /**
   * PostgreSQL only, defaults to `public`.
   */
  schema?: string;
}

export interface SelectQueryParams<TCol, TRow> {
  cols:     Array<TCol | "*">;
  where?:   [target: TRow, op?: CompOp, between?: BetweenOp] |
            Array<[col: TCol, op: CompOp, value: any] | BetweenExtOp>;
  in?:      Array<[col: TCol, op: InOp, value: number[] | string[]] | BetweenExtOp>;
  like?:    Array<[col: TCol, op: LikeOp, value: string] | BetweenExtOp>;
  between?: BetweenOp;
  order?:   { by: TCol, type: OrderType };
  shift?:   { limit: number | null, offset: number | null };
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
  debug?:  DebugOptions;
  /**
   * PostgreSQL only, defaults to `public`.
   */
  schema?: string;
}

import { genPostgresAPI } from "./postgres-gen-api.js";
import { runPostgresMigrations } from "./postgres-migrations.js";
import { expect, expectOne } from "./utils.js";

export {
  genPostgresAPI,
  runPostgresMigrations,
  expect, expectOne
};