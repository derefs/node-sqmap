import { PoolClient, QueryResult, QueryResultRow } from "pg";
import perf from "perf_hooks";
import { InsertQueryParams, SelectQueryParams,  UpdateQueryParams, DeleteQueryParams, DebugOptions, BetweenOp, SQLData, ExtractColsFromRow, Format, FORMATS } from "./index.js";
import * as QueryParser from "./query-parser.js";

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

export interface DefaultValues {
  schema?: string;
  format?: Format;
}

export interface SQMPostgresAPI<TCol, TRow extends QueryResultRow> {
  insert:    (client: PoolClient, query: InsertQueryParams<TCol, TRow>) => Promise<QueryResult<TRow>>;
  sqlInsert: (query: InsertQueryParams<TCol, TRow>) => SQLData;
  select:    (client: PoolClient, query: SelectQueryParams<TCol, TRow>) => Promise<QueryResult<TRow>>;
  sqlSelect: (query: SelectQueryParams<TCol, TRow>) => SQLData;
  update:    (client: PoolClient, query: UpdateQueryParams<TCol, TRow>) => Promise<QueryResult<TRow>>;
  sqlUpdate: (query: UpdateQueryParams<TCol, TRow>) => SQLData;
  delete:    (client: PoolClient, query: DeleteQueryParams<TCol, TRow>) => Promise<QueryResult<TRow>>;
  sqlDelete: (query: DeleteQueryParams<TCol, TRow>) => SQLData;
  sql:       (client: PoolClient, query: string, params: any[])         => Promise<QueryResult<TRow | any>>;
}

export const DEFAULT_POSTGRES_SCHEMA = "public";

const buildInsertQuery = (schema: string, tableName: string, parsedQuery: QueryParser.ParsedInsertQuery): string => {
  let finalQuery = `INSERT INTO "${schema}"."${tableName}" `;
  finalQuery += `${parsedQuery.columns} VALUES ${parsedQuery.values}`;
  if (parsedQuery.returning !== null) finalQuery += ` RETURNING ${parsedQuery.returning};`;
  else finalQuery += ";";
  return finalQuery;
};

const buildSelectQuery = (schema: string, tableName: string, parsedQuery: QueryParser.ParsedSelectQuery, between?: BetweenOp): string => {
  let finalQuery = `SELECT ${parsedQuery.columns} FROM "${schema}"."${tableName}"`;
  between = between || "AND";
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
  return finalQuery;
};

const buildUpdateQuery = (schema: string, tableName: string, parsedQuery: QueryParser.ParsedUpdateQuery, between?: BetweenOp): string => {
  let finalQuery = `UPDATE "${schema}"."${tableName}" SET ${parsedQuery.colValPairs}`;
  between = between || "AND";
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
  return finalQuery;
};

const buildDeleteQuery = (schema: string, tableName: string, parsedQuery: QueryParser.ParsedDeleteQuery, between?: BetweenOp): string => {
  let finalQuery = `DELETE FROM "${schema}"."${tableName}"`;
  between = between || "AND";
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
  return finalQuery;
};

export function genPostgresAPI<TRow extends QueryResultRow>(tableName: string, defaultValues?: DefaultValues, useDebug?: DebugOptions): SQMPostgresAPI<ExtractColsFromRow<TRow>, TRow> {
  const DEFAULT_SCHEMA = (defaultValues && defaultValues.schema) || DEFAULT_POSTGRES_SCHEMA;
  const DEFAULT_FORMAT: Format = (defaultValues && defaultValues.format) || FORMATS.NODE_PG_POSTGRES;

  return {
    insert: (client: PoolClient, query: InsertQueryParams<ExtractColsFromRow<TRow>, TRow>): Promise<QueryResult<TRow>> => {
      const schema = query.schema || DEFAULT_SCHEMA;
      if (useDebug) query.debug = query.debug ?? useDebug;
      if (query.debug?.enable) (query.debug as any)._startTime = perf.performance.now();
      const parsedQuery = QueryParser.parseInsertQuery<ExtractColsFromRow<TRow>, TRow>(query, DEFAULT_FORMAT);
      let finalQuery = buildInsertQuery(schema, tableName, parsedQuery);

      if (query.debug?.enable) {
        (query.debug as any)._totalTime = perf.performance.now() - (query.debug as any)._startTime;
        if (query.debug.explain) finalQuery = "EXPLAIN ANALYZE " + finalQuery;
        handleDebugOptions(query.debug, finalQuery, parsedQuery.params);
        if (query.debug?.dryRun) return {} as Promise<QueryResult<TRow>>;
      }
      return client.query(finalQuery, parsedQuery.params);
    },
    sqlInsert: (query: InsertQueryParams<ExtractColsFromRow<TRow>, TRow>): SQLData => {
      const schema = query.schema || DEFAULT_SCHEMA;
      const parsedQuery = QueryParser.parseInsertQuery<ExtractColsFromRow<TRow>, TRow>(query, DEFAULT_FORMAT);
      const finalQuery = buildInsertQuery(schema, tableName, parsedQuery);
      return { query: finalQuery, params: parsedQuery.params };
    },

    select: (client: PoolClient, query: SelectQueryParams<ExtractColsFromRow<TRow>, TRow>): Promise<QueryResult<TRow>> => {
      const schema = query.schema || DEFAULT_SCHEMA;
      if (useDebug) query.debug = query.debug ?? useDebug;
      if (query.debug?.enable) (query.debug as any)._startTime = perf.performance.now();
      const parsedQuery = QueryParser.parseSelectQuery<ExtractColsFromRow<TRow>, TRow>(query, { prefix: "$", appendIndex: true });
      let finalQuery = buildSelectQuery(schema, tableName, parsedQuery, query.between);

      if (query.debug?.enable) {
        (query.debug as any)._totalTime = perf.performance.now() - (query.debug as any)._startTime;
        if (query.debug.explain) finalQuery = "EXPLAIN ANALYZE " + finalQuery;
        handleDebugOptions(query.debug, finalQuery, parsedQuery.params);
        if (query.debug?.dryRun) return {} as Promise<QueryResult<TRow>>;
      }
      return client.query(finalQuery, parsedQuery.params);
    },
    sqlSelect: (query: SelectQueryParams<ExtractColsFromRow<TRow>, TRow>): SQLData => {
      const schema = query.schema || DEFAULT_SCHEMA;
      const parsedQuery = QueryParser.parseSelectQuery<ExtractColsFromRow<TRow>, TRow>(query, { prefix: "$", appendIndex: true });
      let finalQuery = buildSelectQuery(schema, tableName, parsedQuery, query.between);
      return { query: finalQuery, params: parsedQuery.params };
    },

    update: (client: PoolClient, query: UpdateQueryParams<ExtractColsFromRow<TRow>, TRow>): Promise<QueryResult<TRow>> => {
      const schema = query.schema || DEFAULT_SCHEMA;
      if (useDebug) query.debug = query.debug ?? useDebug;
      if (query.debug?.enable) (query.debug as any)._startTime = perf.performance.now();
      const parsedQuery = QueryParser.parseUpdateQuery<ExtractColsFromRow<TRow>, TRow>(query, { prefix: "$", appendIndex: true });
      let finalQuery = buildUpdateQuery(schema, tableName, parsedQuery, query.between);

      if (query.debug?.enable) {
        (query.debug as any)._totalTime = perf.performance.now() - (query.debug as any)._startTime;
        if (query.debug.explain) finalQuery = "EXPLAIN ANALYZE " + finalQuery;
        handleDebugOptions(query.debug, finalQuery, parsedQuery.params);
        if (query.debug?.dryRun) return {} as Promise<QueryResult<TRow>>;
      }
      return client.query(finalQuery, parsedQuery.params);
    },
    sqlUpdate: (query: UpdateQueryParams<ExtractColsFromRow<TRow>, TRow>): SQLData => {
      const schema = query.schema || DEFAULT_SCHEMA;
      const parsedQuery = QueryParser.parseUpdateQuery<ExtractColsFromRow<TRow>, TRow>(query, { prefix: "$", appendIndex: true });
      let finalQuery = buildUpdateQuery(schema, tableName, parsedQuery, query.between);
      return { query: finalQuery, params: parsedQuery.params };
    },

    delete: (client: PoolClient, query: DeleteQueryParams<ExtractColsFromRow<TRow>, TRow>): Promise<QueryResult<TRow>> => {
      const schema = query.schema || DEFAULT_SCHEMA;
      if (useDebug) query.debug = query.debug ?? useDebug;
      if (query.debug?.enable) (query.debug as any)._startTime = perf.performance.now();
      const parsedQuery = QueryParser.parseDeleteQuery<ExtractColsFromRow<TRow>, TRow>(query, { prefix: "$", appendIndex: true });
      let finalQuery = buildDeleteQuery(schema, tableName, parsedQuery, query.between);

      if (query.debug?.enable) {
        (query.debug as any)._totalTime = perf.performance.now() - (query.debug as any)._startTime;
        if (query.debug.explain) finalQuery = "EXPLAIN ANALYZE " + finalQuery;
        handleDebugOptions(query.debug, finalQuery, parsedQuery.params);
        if (query.debug?.dryRun) return {} as Promise<QueryResult<TRow>>;
      }
      return client.query(finalQuery, parsedQuery.params);
    },
    sqlDelete: (query: DeleteQueryParams<ExtractColsFromRow<TRow>, TRow>): SQLData => {
      const schema = query.schema || DEFAULT_SCHEMA;
      const parsedQuery = QueryParser.parseDeleteQuery<ExtractColsFromRow<TRow>, TRow>(query, { prefix: "$", appendIndex: true });
      let finalQuery = buildDeleteQuery(schema, tableName, parsedQuery, query.between);
      return { query: finalQuery, params: parsedQuery.params };
    },

    sql: (client: PoolClient, query: string, params: any[]): Promise<QueryResult<TRow | any>> => {
      return client.query(query, params);
    },
  };
}