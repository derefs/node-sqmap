import { QueryResult, QueryResultRow } from "pg";

export function expect<TRow extends QueryResultRow>(queryResult: QueryResult<TRow>, rowCount: number, error: Error): TRow[] {
  if (queryResult.rowCount === rowCount && queryResult.rows.length === rowCount) return queryResult.rows;
  throw error;
}

export function expectOne<TRow extends QueryResultRow>(queryResult: QueryResult<TRow>, error: Error): TRow {
  if (queryResult.rowCount === 1 && queryResult.rows.length === 1) return queryResult.rows[0];
  throw error;
}

// This will explain how explain analyze works
// export function explain<TRow extends QueryResultRow>(queryResult: QueryResult<TRow>, rowCount: number, error: Error): any {
//   return null;
// }