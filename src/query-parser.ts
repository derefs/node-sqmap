import {
  CompOp, BetweenOp, BetweenExtOp, InOp, LikeOp,
  InsertQueryParams, SelectQueryParams, UpdateQueryParams, DeleteQueryParams
} from "./index";

export interface ParsedInsertQuery {
  columns:   string;
  values:    string;
  returning: string | null;
  params:    any[];
}

export function parseInsertQuery<TCol, TRow>(query: InsertQueryParams<TCol, TRow>): ParsedInsertQuery {
  let columns:   string = "(";
  let values:    string = "(";
  let returning: string | null = null;
  let params:    any[] = [];

  const colsCount = query.cols.length;
  const rowsCount = query.rows.length;
  if (colsCount === 0) throw new Error("No columns provided for the insert statement!");
  if (rowsCount === 0) throw new Error("No rows provided for the insert statement!");

  for (let i = 0; i < colsCount; i++) columns += `"${query.cols[i]}", `;
  columns = columns.slice(0, -2);
  columns += ")";

  let paramIndex = 1;
  for (let i = 0; i < rowsCount; i++) {
    const row = query.rows[i];
    for (let j = 0; j < colsCount; j++) {
      const col = query.cols[j];
      values += `$${paramIndex}, `;
      paramIndex++;
      params.push((row as any)[col]);
    }
    values = values.slice(0, -2);
    values += "), (";
  }
  values = values.slice(0, -3);

  if (query.return === "*") returning = "*";
  else if (query.return !== undefined) {
    let returnColumns = "";
    for (let i = 0; i < query.return.length; i++) {
      returnColumns += `"${query.return[i]}", `;
    }
    returnColumns = returnColumns.slice(0, -2);
    returning = returnColumns;
  }

  return { columns, values, returning, params };
}

interface WhereClauseResult { whereClause: string | null; paramIndex: number; }
function resolveWhereClause<TCol, TRow>(
  WHERE: [target: TRow, op?: CompOp, between?: BetweenOp] |
         Array<[col: TCol, op: CompOp, value: any] | BetweenExtOp>,
  paramIndex: number, params: any[]
): WhereClauseResult {
  let whereClause: string | null = null;
  if (typeof WHERE[0] === "object") {
    whereClause = "";
    const target = WHERE[0];
    const op = WHERE[1] || "=";
    const between = WHERE[2] || "AND";
    whereClause = "";
    for (const [key, value] of Object.entries(target as any)) {
      whereClause += `"${key}"${op}$${paramIndex} ${between} `;
      paramIndex++;
      params.push(value);
    }
    whereClause = whereClause.slice(0, (between.length + 2) * -1);
  } else if (Array.isArray(WHERE)) {
    whereClause = "";
    for (let i = 0; i < WHERE.length; i++) {
      const token = WHERE[i];
      if (Array.isArray(token)) {
        const col = token[0];
        const op = token[1];
        whereClause += ` "${col}"${op}$${paramIndex} `;
        paramIndex++;
        params.push(token[2]);
      } else {
        whereClause += token;
      }
    }
    whereClause = whereClause.slice(0, -1);
  }
  return { whereClause, paramIndex };
}

interface InOpResult { inOp: string | null; paramIndex: number; }
function resolveInOperator<TCol, TRow>(
  IN: Array<[col: TCol, op: InOp, value: number[] | string[]] | BetweenExtOp>,
  paramIndex: number, params: any[]
): InOpResult {
  let inOp: string | null = "";
  for (let i = 0; i < IN.length; i++) {
    const token = IN[i];
    if (Array.isArray(token)) {
      const col = token[0];
      const op = token[1];
      const values = token[2];
      inOp += `"${col}" ${op} (`;
      for (let j = 0; j < values.length; j++) {
        const value = values[j];
        inOp += `$${paramIndex}, `;
        paramIndex++;
        params.push(value);
      }
      inOp = inOp.slice(0, -2);
      inOp += ") ";
    } else {
      inOp += token;
    }
  }
  inOp = inOp.slice(0, -1);
  return { inOp, paramIndex };
}

interface LikeOpResult { likeOp: string | null; paramIndex: number; }
function resolveLikeOperator<TCol, TRow>(
  LIKE: Array<[col: TCol, op: LikeOp, value: string] | BetweenExtOp>,
  paramIndex: number, params: any[]
): LikeOpResult {
  let likeOp: string | null = "";
  for (let i = 0; i < LIKE.length; i++) {
    const token = LIKE[i];
    if (Array.isArray(token)) {
      const col = token[0];
      const op = token[1];
      likeOp += `"${col}" ${op} $${paramIndex} `;
      paramIndex++;
      params.push(token[2]);
    } else {
      likeOp += token;
    }
  }
  likeOp = likeOp.slice(0, -1);
  return { likeOp, paramIndex };
}

interface ShiftResult { shift: string | null; paramIndex: number; }
function resolveShift<TCol, TRow>(
  SHIFT: { limit: number | null, offset: number | null },
  paramIndex: number, params: any[]
): ShiftResult {
  let shift: string | null = "";
  let char = "";
  if (SHIFT.limit !== null && SHIFT.limit >= 0) {
    shift += `LIMIT $${paramIndex}`;
    paramIndex++;
    params.push(SHIFT.limit);
    char = " ";
  }
  if (SHIFT.offset !== null && SHIFT.offset >= 0) {
    shift += `${char}OFFSET $${paramIndex}`;
    params.push(SHIFT.offset);
    paramIndex++;
  }
  return { shift, paramIndex };
}

export interface ParsedSelectQuery {
  columns:     string;
  whereClause: string | null;
  inOp:        string | null;
  likeOp:      string | null;
  order:       string | null;
  shift:       string | null;
  params:      any[];
}
export function parseSelectQuery<TCol, TRow>(query: SelectQueryParams<TCol, TRow>): ParsedSelectQuery {
  let columns:     string = "";
  let whereClause: string | null = null;
  let inOp:        string | null = null;
  let likeOp:      string | null = null;
  let order:       string | null = null;
  let shift:       string | null = null;
  const params:    any[] = [];

  const colsCount = query.cols.length;
  if (colsCount === 0) throw new Error("No columns provided for the insert statement!");

  for (let i = 0; i < colsCount; i++) {
    const col = query.cols[i];
    if (col !== "*") columns += `${col}, `;
    else columns += `"${col}", `;
  }
  columns = columns.slice(0, -2);

  let paramIndex: number = 1;
  if (query.where) {
    const whereClauseResult = resolveWhereClause<TCol, TRow>(query.where, paramIndex, params);
    whereClause = whereClauseResult.whereClause;
    paramIndex  = whereClauseResult.paramIndex;
  }
  if (query.in) {
    const inOpResult = resolveInOperator<TCol, TRow>(query.in, paramIndex, params);
    inOp       = inOpResult.inOp;
    paramIndex = inOpResult.paramIndex;
  }
  if (query.like) {
    const likeOpResult = resolveLikeOperator<TCol, TRow>(query.like, paramIndex, params);
    likeOp     = likeOpResult.likeOp;
    paramIndex = likeOpResult.paramIndex;
  }
  if (query.order) order = `ORDER BY "${query.order.by}" ${query.order.type}`;
  if (query.shift) {
    const shiftResult = resolveShift<TCol, TRow>(query.shift, paramIndex, params);
    shift      = shiftResult.shift;
    paramIndex = shiftResult.paramIndex;
  }

  return { columns, whereClause, inOp, likeOp, order, shift, params };
}

export interface ParsedUpdateQuery {
  colValPairs: string;
  whereClause: string | null;
  inOp:        string | null;
  likeOp:      string | null;
  returning:   string | null;
  params:      any[];
}
export function parseUpdateQuery<TCol, TRow>(query: UpdateQueryParams<TCol, TRow>): ParsedUpdateQuery {
  let colValPairs: string = "";
  let whereClause: string | null = null;
  let inOp:        string | null = null;
  let likeOp:      string | null = null;
  let returning:   string | null = null;
  const params:    any[] = [];

  if (!query.where && !query.in && !query.like) throw new Error("Update query needs a where clause!");
  if (Object.keys(query.set as any).length === 0) throw new Error("No update data was provided!");

  let paramIndex: number = 1;
  for (const [key, value] of Object.entries(query.set as any)) {
    colValPairs += `"${key}"=$${paramIndex}, `;
    paramIndex++;
    params.push(value);
  }
  colValPairs = colValPairs.slice(0, -2);

  if (query.where) {
    const whereClauseResult = resolveWhereClause<TCol, TRow>(query.where, paramIndex, params);
    whereClause = whereClauseResult.whereClause;
    paramIndex  = whereClauseResult.paramIndex;
  }
  if (query.in) {
    const inOpResult = resolveInOperator<TCol, TRow>(query.in, paramIndex, params);
    inOp       = inOpResult.inOp;
    paramIndex = inOpResult.paramIndex;
  }
  if (query.like) {
    const likeOpResult = resolveLikeOperator<TCol, TRow>(query.like, paramIndex, params);
    likeOp     = likeOpResult.likeOp;
    paramIndex = likeOpResult.paramIndex;
  }

  if (query.return === "*") returning = "*";
  else if (query.return !== undefined) {
    let returnColumns = "";
    for (let i = 0; i < query.return.length; i++) {
      returnColumns += `"${query.return[i]}", `;
    }
    returnColumns = returnColumns.slice(0, -2);
    returning = returnColumns;
  }

  return { colValPairs, whereClause, inOp, likeOp, returning, params };
}

export interface ParsedDeleteQuery {
  whereClause: string | null;
  inOp:        string | null;
  likeOp:      string | null;
  returning:   string | null;
  params:      any[];
}
export function parseDeleteQuery<TCol, TRow>(query: DeleteQueryParams<TCol, TRow>): ParsedDeleteQuery {
  let whereClause: string | null = null;
  let inOp:        string | null = null;
  let likeOp:      string | null = null;
  let returning:   string | null = null;
  const params:    any[] = [];

  if (!query.where && !query.in && !query.like) throw new Error("Delete query needs a where clause!");

  let paramIndex: number = 1;
  if (query.where) {
    const whereClauseResult = resolveWhereClause<TCol, TRow>(query.where, paramIndex, params);
    whereClause = whereClauseResult.whereClause;
    paramIndex  = whereClauseResult.paramIndex;
  }
  if (query.in) {
    const inOpResult = resolveInOperator<TCol, TRow>(query.in, paramIndex, params);
    inOp       = inOpResult.inOp;
    paramIndex = inOpResult.paramIndex;
  }
  if (query.like) {
    const likeOpResult = resolveLikeOperator<TCol, TRow>(query.like, paramIndex, params);
    likeOp     = likeOpResult.likeOp;
    paramIndex = likeOpResult.paramIndex;
  }

  if (query.return === "*") returning = "*";
  else if (query.return !== undefined) {
    let returnColumns = "";
    for (let i = 0; i < query.return.length; i++) {
      returnColumns += `"${query.return[i]}", `;
    }
    returnColumns = returnColumns.slice(0, -2);
    returning = returnColumns;
  }

  return { whereClause, inOp, likeOp, returning, params };
}