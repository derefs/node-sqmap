import { PoolClient, QueryResult, QueryResultRow } from "pg";
import perf from "perf_hooks";
import { InsertQueryParams, SelectQueryParams,  UpdateQueryParams, DeleteQueryParams, DebugOptions } from "./index";
import * as QueryParser from "./query-parser";

const handleDebugOptions = (options: DebugOptions, finalQuery: string, params: any[]) => {
  const printQuery  = options.printAll || options.print?.query;
  const printParams = options.printAll || options.print?.params;
  const printTiming = options.printAll || options.print?.timing;
  if (printQuery) {
    let color = 90; // gray
    if (finalQuery.startsWith("INSERT INTO") || finalQuery.startsWith("EXPLAIN ANALYZE INSERT INTO")) color = 32; // green
    if (finalQuery.startsWith("UPDATE") || finalQuery.startsWith("EXPLAIN ANALYZE UPDATE")) color = 33; // yellow
    if (finalQuery.startsWith("DELETE FROM") || finalQuery.startsWith("EXPLAIN ANALYZE DELETE FROM")) color = 31; // red
    console.log(`SQL query: \x1b[${color}m${finalQuery}\x1b[0m`);
  }
  if (printParams) console.log("Params:", params);
  if (printTiming) {
    const timeMicroSeconds = ((options as any)._totalTime * 1000).toFixed(4);
    console.log(`Query was parsed and built in ${timeMicroSeconds} μs.`);
  }
  if (options.inputs) options.inputs(finalQuery, params, (options as any)._totalTime);
};

export interface SQMPostgresAPI<TCol, TRow extends QueryResultRow> {
  insert: (client: PoolClient, query: InsertQueryParams<TCol, TRow>) => Promise<QueryResult<TRow>>;
  select: (client: PoolClient, query: SelectQueryParams<TCol, TRow>) => Promise<QueryResult<TRow>>;
  update: (client: PoolClient, query: UpdateQueryParams<TCol, TRow>) => Promise<QueryResult<TRow>>;
  delete: (client: PoolClient, query: DeleteQueryParams<TCol, TRow>) => Promise<QueryResult<TRow>>;
  sql:    (client: PoolClient, query: string, params: any[])         => Promise<QueryResult<TRow | any>>;
}

export function genPostgresAPI<TCol, TRow extends QueryResultRow>(tableName: string, useDebug?: DebugOptions): SQMPostgresAPI<TCol, TRow> {
  return {
    insert: (client: PoolClient, query: InsertQueryParams<TCol, TRow>): Promise<QueryResult<TRow>> => {
      if (useDebug) query.debug = query.debug ?? useDebug;
      if (query.debug?.enable) (query.debug as any)._startTime = perf.performance.now();
      const parsedQuery = QueryParser.parseInsertQuery<TCol, TRow>(query);

      // Build the query
      let finalQuery = `INSERT INTO "${tableName}" `;
      finalQuery += `${parsedQuery.columns} VALUES ${parsedQuery.values}`;
      if (parsedQuery.returning !== null) finalQuery += ` RETURNING ${parsedQuery.returning};`;
      else finalQuery += ";";

      if (query.debug?.enable) {
        (query.debug as any)._totalTime = perf.performance.now() - (query.debug as any)._startTime;
        if (query.debug.explain) finalQuery = "EXPLAIN ANALYZE " + finalQuery;
        handleDebugOptions(query.debug, finalQuery, parsedQuery.params);
        if (query.debug?.dryRun) return {} as Promise<QueryResult<TRow>>;
      }
      return client.query(finalQuery, parsedQuery.params);
    },
    select: (client: PoolClient, query: SelectQueryParams<TCol, TRow>): Promise<QueryResult<TRow>> => {
      if (useDebug) query.debug = query.debug ?? useDebug;
      if (query.debug?.enable) (query.debug as any)._startTime = perf.performance.now();
      const parsedQuery = QueryParser.parseSelectQuery<TCol, TRow>(query);

      // Build the query
      let finalQuery = `SELECT ${parsedQuery.columns} FROM "${tableName}"`;
      const between = query.between || "AND";
      let containsWhere = false;
      if (parsedQuery.whereClause) {
        containsWhere = true;
        finalQuery += ` WHERE ${parsedQuery.whereClause}`;
      }
      if (parsedQuery.inOp) {
        if (!containsWhere) {
          finalQuery += " WHERE";
          containsWhere = true;
        } else finalQuery += ` ${between}`;
        finalQuery += ` ${parsedQuery.inOp}`;
      }
      if (parsedQuery.likeOp) {
        if (!containsWhere) {
          finalQuery += " WHERE";
          containsWhere = true;
        } else finalQuery += ` ${between}`;
        finalQuery += ` ${parsedQuery.likeOp}`;
      }
      if (parsedQuery.order !== null) finalQuery += ` ${parsedQuery.order}`;
      if (parsedQuery.shift !== null) finalQuery += ` ${parsedQuery.shift}`;
      finalQuery += ";";

      if (query.debug?.enable) {
        (query.debug as any)._totalTime = perf.performance.now() - (query.debug as any)._startTime;
        if (query.debug.explain) finalQuery = "EXPLAIN ANALYZE " + finalQuery;
        handleDebugOptions(query.debug, finalQuery, parsedQuery.params);
        if (query.debug?.dryRun) return {} as Promise<QueryResult<TRow>>;
      }
      return client.query(finalQuery, parsedQuery.params);
    },
    update: (client: PoolClient, query: UpdateQueryParams<TCol, TRow>): Promise<QueryResult<TRow>> => {
      if (useDebug) query.debug = query.debug ?? useDebug;
      if (query.debug?.enable) (query.debug as any)._startTime = perf.performance.now();
      const parsedQuery = QueryParser.parseUpdateQuery<TCol, TRow>(query);

      // Build the query
      let finalQuery = `UPDATE "${tableName}" SET ${parsedQuery.colValPairs}`;
      const between = query.between || "AND";
      let containsWhere = false;
      if (parsedQuery.whereClause) {
        containsWhere = true;
        finalQuery += ` WHERE ${parsedQuery.whereClause}`;
      }
      if (parsedQuery.inOp) {
        if (!containsWhere) {
          finalQuery += " WHERE";
          containsWhere = true;
        } else finalQuery += ` ${between}`;
        finalQuery += ` ${parsedQuery.inOp}`;
      }
      if (parsedQuery.likeOp) {
        if (!containsWhere) {
          finalQuery += " WHERE";
          containsWhere = true;
        } else finalQuery += ` ${between}`;
        finalQuery += ` ${parsedQuery.likeOp}`;
      }
      if (parsedQuery.returning !== null) finalQuery += ` RETURNING ${parsedQuery.returning};`;
      finalQuery += ";";

      if (query.debug?.enable) {
        (query.debug as any)._totalTime = perf.performance.now() - (query.debug as any)._startTime;
        if (query.debug.explain) finalQuery = "EXPLAIN ANALYZE " + finalQuery;
        handleDebugOptions(query.debug, finalQuery, parsedQuery.params);
        if (query.debug?.dryRun) return {} as Promise<QueryResult<TRow>>;
      }
      return client.query(finalQuery, parsedQuery.params);
    },
    delete: (client: PoolClient, query: DeleteQueryParams<TCol, TRow>): Promise<QueryResult<TRow>> => {
      if (useDebug) query.debug = query.debug ?? useDebug;
      if (query.debug?.enable) (query.debug as any)._startTime = perf.performance.now();
      const parsedQuery = QueryParser.parseDeleteQuery<TCol, TRow>(query);

      // Build the query
      let finalQuery = `DELETE FROM "${tableName}"`;
      const between = query.between || "AND";
      let containsWhere = false;
      if (parsedQuery.whereClause) {
        containsWhere = true;
        finalQuery += ` WHERE ${parsedQuery.whereClause}`;
      }
      if (parsedQuery.inOp) {
        if (!containsWhere) {
          finalQuery += " WHERE";
          containsWhere = true;
        } else finalQuery += ` ${between}`;
        finalQuery += ` ${parsedQuery.inOp}`;
      }
      if (parsedQuery.likeOp) {
        if (!containsWhere) {
          finalQuery += " WHERE";
          containsWhere = true;
        } else finalQuery += ` ${between}`;
        finalQuery += ` ${parsedQuery.likeOp}`;
      }
      if (parsedQuery.returning !== null) finalQuery += ` RETURNING ${parsedQuery.returning};`;
      finalQuery += ";";

      if (query.debug?.enable) {
        (query.debug as any)._totalTime = perf.performance.now() - (query.debug as any)._startTime;
        if (query.debug.explain) finalQuery = "EXPLAIN ANALYZE " + finalQuery;
        handleDebugOptions(query.debug, finalQuery, parsedQuery.params);
        if (query.debug?.dryRun) return {} as Promise<QueryResult<TRow>>;
      }
      return client.query(finalQuery, parsedQuery.params);
    },
    sql: (client: PoolClient, query: string, params: any[]): Promise<QueryResult<TRow | any>> => {
      return client.query(query, params);
    },
  };
}