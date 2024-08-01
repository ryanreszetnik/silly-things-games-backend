import {
  GSITables,
  TableItem,
  TableKeys,
  TableNames,
} from 'src/shared/interfaces/db.interface';

// DynamoDB Service
export interface GetPaginatedResult<
  T extends TableNames | GSITables,
  K extends TableNames | GSITables,
> {
  items: TableItem[T][];
  lastEvaluatedKey?: TableKeys[K];
}

export interface GetPaginatedResults<
  T extends TableNames | GSITables,
  K extends TableNames | GSITables,
> {
  items: TableItem[T][];
  lastEvaluatedKeys?: TableKeys[K][];
}

type SingleNumberFilterQuery<T extends TableNames | GSITables> = {
  operator: 'eq' | 'lt' | 'lte' | 'gt' | 'gte';
  value: number;
  field: keyof TableItem[T];
};

type SingleBooleanFilterQuery<T extends TableNames | GSITables> = {
  operator: 'eq';
  value: boolean;
  field: keyof TableItem[T];
};

type SingleStringFilterQuery<T extends TableNames | GSITables> = {
  operator: 'begins_with' | 'eq' | 'contains' | 'not_contains' | 'neq';
  value: string;
  field: keyof TableItem[T];
};

type FieldFilterQuery<T extends TableNames | GSITables> = {
  operator: 'attribute_exists' | 'attribute_not_exists';
  field: keyof TableItem[T];
};

export type SingleValueFilterQuery<T extends TableNames | GSITables> =
  | SingleNumberFilterQuery<T>
  | SingleStringFilterQuery<T>
  | SingleBooleanFilterQuery<T>;

export type SingleFilterQuery<T extends TableNames | GSITables> =
  | SingleValueFilterQuery<T>
  | FieldFilterQuery<T>;

export type FilterQuery<T extends TableNames | GSITables> =
  | SingleFilterQuery<T>
  | FilterQueryGroup<T>;
export type FilterQueryGroup<T extends TableNames | GSITables> = {
  operator: 'and' | 'or';
  queries: FilterQuery<T>[];
};

export type DecodeFilterResponse = {
  FilterExpression: string;
  ExpressionAttributeValues: { [key: string]: any };
  ExpressionAttributeNames: { [key: string]: string };
};

export type QueryOptions<T extends TableNames | GSITables> = {
  limit?: number;
  startKey?: TableKeys[T];
  filter?: FilterQuery<T>;
  scanIndexForward?: boolean;
  repeatUntilLimit?: boolean;
};

export type ScanOptions<T extends TableNames | GSITables> = {
  limit?: number;
  startKey?: TableKeys[T];
  filter?: FilterQuery<T>;
};

export type NumericAttributes<T> = Partial<{
  [K in keyof T]: T[K] extends number ? T[K] : never;
}>;
