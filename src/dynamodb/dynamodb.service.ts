import { Inject, Injectable } from '@nestjs/common';

import {
  DecodeFilterResponse,
  FilterQuery,
  FilterQueryGroup,
  GetPaginatedResult,
  QueryOptions,
  ScanOptions,
  SingleFilterQuery,
  SingleValueFilterQuery,
  NumericAttributes,
} from './interfaces';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  PutCommandOutput,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  BatchWriteCommand,
  BatchWriteCommandOutput,
  BatchGetCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConfigService } from '@nestjs/config';
import {
  GSITables,
  PrimaryKeys,
  SortKeys,
  TableItem,
  TableKeys,
  TableKeyValues,
  TableNames,
} from 'src/shared/interfaces/db.interface';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class DynamoDBService {
  private readonly documentClient: DynamoDBDocumentClient;

  constructor(
    @Inject('DYNAMODB') private readonly dynamoDBClient: DynamoDBClient,
    private readonly configService: ConfigService,
    private readonly cacheService: RedisService,
  ) {
    this.documentClient = DynamoDBDocumentClient.from(dynamoDBClient);
  }
  private getTableName(tableName: TableNames | GSITables) {
    const tableParts = tableName.split(':');
    const stage = this.configService.get<string>('STAGE');
    const appName = this.configService.get<string>('APP_NAME');
    if (!appName || !stage) throw new Error('Missing app or stage config vars');
    return `${appName}-${tableParts[0]}-${stage}`;
  }
  private getIndexName(tableName: TableNames | GSITables) {
    const tableParts = tableName.split(':');
    if (tableParts.length === 2) {
      return tableParts[1];
    }
    return undefined;
  }

  private decodeFilterQuery<T extends TableNames | GSITables>(
    query: FilterQuery<T>,
  ): DecodeFilterResponse {
    if (query.operator === 'and' || query.operator === 'or') {
      if (query.queries.length == 0) {
        return {
          FilterExpression: '',
          ExpressionAttributeValues: {},
          ExpressionAttributeNames: {},
        };
      }
      const group = query as FilterQueryGroup<T>;
      const decodedQueries = group.queries.map((query) =>
        this.decodeFilterQuery(query),
      );
      const filterExpression = decodedQueries
        .filter((q) => q.FilterExpression.length > 0)
        .map((decodedQuery) => `(${decodedQuery.FilterExpression})`)
        .join(` ${group.operator} `);
      const expressionAttributeValues = decodedQueries.reduce(
        (acc, decodedQuery) => ({
          ...acc,
          ...decodedQuery.ExpressionAttributeValues,
        }),
        {},
      );
      const expressionAttributeNames = decodedQueries.reduce(
        (acc, decodedQuery) => ({
          ...acc,
          ...decodedQuery.ExpressionAttributeNames,
        }),
        {},
      );
      return {
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
      };
    }
    const singleQuery = query as SingleFilterQuery<T>;
    const operator = singleQuery.operator;
    const key = `:${String(singleQuery.field)}`;
    const name = `#${String(singleQuery.field)}`;
    // const filterExpression = `${name} ${operator} ${key}`;
    let filterExpression = '';
    switch (operator) {
      case 'attribute_exists':
        filterExpression = `attribute_exists(${name})`;
        break;
      case 'attribute_not_exists':
        filterExpression = `attribute_not_exists(${name})`;
        break;
      case 'begins_with':
        filterExpression = `begins_with(${name}, ${key})`;
        break;
      case 'contains':
        filterExpression = `contains(${name}, ${key})`;
        break;
      case 'not_contains':
        filterExpression = `not contains(${name}, ${key})`;
        break;
      case 'eq':
        filterExpression = `${name} = ${key}`;
        break;
      case 'neq':
        filterExpression = `${name} <> ${key}`;
        break;
      case 'lt':
        filterExpression = `${name} < ${key}`;
        break;
      case 'lte':
        filterExpression = `${name} <= ${key}`;
        break;
      case 'gt':
        filterExpression = `${name} > ${key}`;
        break;
      case 'gte':
        filterExpression = `${name} >= ${key}`;
        break;
    }
    return {
      FilterExpression: filterExpression,
      ExpressionAttributeValues: singleQuery.hasOwnProperty('value')
        ? {
            [key]: (singleQuery as SingleValueFilterQuery<T>).value,
          }
        : {},
      ExpressionAttributeNames: { [name]: String(singleQuery.field) },
    };
  }

  private getCacheKeyString<T extends TableNames>(
    table: T,
    item: TableKeys[T],
  ) {
    const key = TableKeyValues[table]
      .map((key) => item[key as keyof TableKeys[T]])
      .join('-');
    return `dynamodb:${this.getTableName(table)}:${key}`;
  }

  async queryPK<T extends TableNames | GSITables>(
    tableName: T,
    key: PrimaryKeys[T],
    options: QueryOptions<T> = {},
  ): Promise<GetPaginatedResult<T, T>> {
    const primaryKey = Object.keys(key)[0] as keyof PrimaryKeys[T];
    const primaryKeyString = primaryKey as string;
    const { scanIndexForward, limit, startKey, filter } = options;
    const forwardScan =
      scanIndexForward === undefined ? true : scanIndexForward;
    const {
      FilterExpression,
      ExpressionAttributeValues,
      ExpressionAttributeNames,
    } = filter
      ? this.decodeFilterQuery(filter)
      : {
          FilterExpression: undefined,
          ExpressionAttributeValues: {},
          ExpressionAttributeNames: {},
        };
    const command = new QueryCommand({
      TableName: this.getTableName(tableName),
      KeyConditionExpression: `#${primaryKeyString} = :${primaryKeyString}`,
      ExpressionAttributeValues: {
        [`:${primaryKeyString}`]: key[primaryKey],
        ...ExpressionAttributeValues,
      },
      ExpressionAttributeNames: {
        [`#${primaryKeyString}`]: primaryKeyString,
        ...ExpressionAttributeNames,
      },
      FilterExpression: FilterExpression,
      ExclusiveStartKey: startKey,
      Limit: limit,
      ScanIndexForward: forwardScan,
      IndexName: this.getIndexName(tableName),
    });
    const response = await this.documentClient.send(command);
    const resp = {
      items: response.Items as TableItem[T][],
      lastEvaluatedKey: response.LastEvaluatedKey as TableKeys[T],
    };
    if (
      options.filter &&
      options.repeatUntilLimit &&
      resp.items.length < limit &&
      resp.lastEvaluatedKey
    ) {
      const nextResults = await this.queryPK(tableName, key, {
        ...options,
        startKey: resp.lastEvaluatedKey,
        limit: limit - resp.items.length,
        repeatUntilLimit: true,
      });
      return {
        items: [...resp.items, ...nextResults.items],
        lastEvaluatedKey: nextResults.lastEvaluatedKey,
      };
    }
    return resp;
  }

  async queryPKWithSortKeyPrefix<T extends TableNames | GSITables>(
    tableName: T,
    partitionKey: PrimaryKeys[T],
    sortKeyPrefix: Partial<SortKeys[T]>,
    options: QueryOptions<T> = {},
  ): Promise<GetPaginatedResult<T, T>> {
    const primaryKey = Object.keys(partitionKey)[0] as keyof PrimaryKeys[T];
    const primaryKeyString = primaryKey as string;
    const sortKey = Object.keys(sortKeyPrefix)[0] as keyof SortKeys[T];
    const sortKeyString = sortKey as string;
    const { scanIndexForward, limit, startKey, filter } = options;
    const forwardScan =
      scanIndexForward === undefined ? true : scanIndexForward;

    const {
      FilterExpression,
      ExpressionAttributeValues,
      ExpressionAttributeNames,
    } = filter
      ? this.decodeFilterQuery(filter)
      : {
          FilterExpression: undefined,
          ExpressionAttributeValues: {},
          ExpressionAttributeNames: {},
        };

    const expressionAttributeValues = {
      [`:${primaryKeyString}`]: partitionKey[primaryKey],
      [`:${sortKeyString}`]: sortKeyPrefix[sortKey],
      ...ExpressionAttributeValues,
    };

    console.log('Query parameters:', {
      TableName: this.getTableName(tableName),
      KeyConditionExpression: `#${primaryKeyString} = :${primaryKeyString} AND begins_with(#${sortKeyString}, :${sortKeyString})`,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: {
        [`#${primaryKeyString}`]: primaryKeyString,
        [`#${sortKeyString}`]: sortKeyString,
        ...ExpressionAttributeNames,
      },
    });

    const command = new QueryCommand({
      TableName: this.getTableName(tableName),
      KeyConditionExpression: `#${primaryKeyString} = :${primaryKeyString} AND begins_with(#${sortKeyString}, :${sortKeyString})`,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: {
        [`#${primaryKeyString}`]: primaryKeyString,
        [`#${sortKeyString}`]: sortKeyString,
        ...ExpressionAttributeNames,
      },
      FilterExpression: FilterExpression,
      ExclusiveStartKey: startKey,
      Limit: limit,
      ScanIndexForward: forwardScan,
      IndexName: this.getIndexName(tableName),
    });

    const response = await this.documentClient.send(command);
    console.log('DynamoDB response:', response);

    const resp = {
      items: response.Items as TableItem[T][],
      lastEvaluatedKey: response.LastEvaluatedKey as TableKeys[T],
    };

    if (
      options.filter &&
      options.repeatUntilLimit &&
      resp.items.length < limit &&
      resp.lastEvaluatedKey
    ) {
      const nextResults = await this.queryPKWithSortKeyPrefix(
        tableName,
        partitionKey,
        sortKeyPrefix,
        {
          ...options,
          startKey: resp.lastEvaluatedKey,
          limit: limit - resp.items.length,
          repeatUntilLimit: true,
        },
      );
      return {
        items: [...resp.items, ...nextResults.items],
        lastEvaluatedKey: nextResults.lastEvaluatedKey,
      };
    }

    return resp;
  }

  async getAllItems<T extends TableNames>(
    tableName: T,
    options: ScanOptions<T> = {},
  ): Promise<GetPaginatedResult<T, T>> {
    const { limit, startKey, filter } = options;

    const {
      FilterExpression,
      ExpressionAttributeValues,
      ExpressionAttributeNames,
    } = filter
      ? this.decodeFilterQuery(filter)
      : {
          FilterExpression: undefined,
          ExpressionAttributeValues: undefined,
          ExpressionAttributeNames: undefined,
        };

    const command = new ScanCommand({
      TableName: this.getTableName(tableName),

      ExpressionAttributeValues,
      ExpressionAttributeNames,
      FilterExpression,
      ExclusiveStartKey: startKey,
      Limit: limit,
      IndexName: this.getIndexName(tableName),
    });
    const response = await this.documentClient.send(command);
    return {
      items: response.Items as TableItem[T][],
      lastEvaluatedKey: response.LastEvaluatedKey as TableKeys[T],
    };
  }

  async incrementAttributes<T extends TableNames>(
    tableName: T,
    key: TableKeys[T],
    increments: NumericAttributes<TableItem[T]>,
    options?: {
      cache?: {
        ttl: number;
      };
    },
  ): Promise<TableItem[T]> {
    const allAttributeNames = Object.keys(
      increments,
    ) as (keyof NumericAttributes<TableItem[T]>)[];

    const attributeKeysToUpdate = allAttributeNames.filter(
      (attr) => increments[attr] !== undefined,
    );

    const updateExpression =
      'set ' +
      attributeKeysToUpdate
        .map(
          (attr) =>
            `#${String(attr)} = #${String(attr)} ${(increments[attr] as number) > 0 ? '+' : '-'} :${String(attr)}`,
        )
        .join(', ');
    const expressionAttributeValues = attributeKeysToUpdate.reduce(
      (acc, attr) => ({
        ...acc,
        [`:${String(attr)}`]: Math.abs(increments[attr] as number),
      }),
      {},
    );
    const definedExpressionAttributeNames = attributeKeysToUpdate.reduce(
      (acc, attr) => ({ ...acc, [`#${String(attr)}`]: attr }),
      {},
    );

    const command = new UpdateCommand({
      TableName: this.getTableName(tableName),
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: definedExpressionAttributeNames,
      ReturnValues: 'ALL_NEW',
    });
    const response = await this.documentClient.send(command);
    if (options?.cache) {
      const cacheKey = this.getCacheKeyString(tableName, key);
      await this.cacheService.set(
        cacheKey,
        response.Attributes,
        options.cache.ttl,
      );
    }
    return response.Attributes as TableItem[T];
  }

  async putItem<T extends TableNames>(
    tableName: T,
    item: TableItem[T],
    options?: {
      cache?: {
        ttl: number;
      };
    },
  ) {
    if (options?.cache) {
      const cacheKey = this.getCacheKeyString(tableName, item);
      await this.cacheService.set(cacheKey, item, options.cache.ttl);
    }

    const command = new PutCommand({
      TableName: this.getTableName(tableName),
      Item: item,
    });
    const response: PutCommandOutput = await this.documentClient.send(command);
    return response;
  }

  async getItem<T extends TableNames>(
    tableName: T,
    key: TableKeys[T],
    options?: {
      cache?: {
        ttl: number;
      };
    },
  ): Promise<TableItem[T] | null> {
    const cacheKey = this.getCacheKeyString(tableName, key);
    if (options?.cache) {
      const cachedItem = await this.cacheService.get<TableItem[T]>(cacheKey);
      if (cachedItem) {
        //update cache ttl
        await this.cacheService.set(cacheKey, cachedItem, options.cache.ttl);
        return cachedItem;
      }
    }

    const command = new GetCommand({
      TableName: this.getTableName(tableName),
      Key: key,
    });

    const { Item } = await this.documentClient.send(command);
    if (options?.cache) {
      await this.cacheService.set(cacheKey, Item, options.cache.ttl);
    }

    if (!Item) return null;
    return Item as TableItem[T];
  }
  async deleteItem<T extends TableNames>(
    tableName: T,
    key: TableKeys[T],
  ): Promise<TableItem[T]> {
    const command = new DeleteCommand({
      TableName: this.getTableName(tableName),
      Key: key,
    });
    const response = await this.documentClient.send(command);
    await this.cacheService.del(this.getCacheKeyString(tableName, key));
    return response.Attributes as TableItem[T];
  }
  async batchDeleteItems<T extends TableNames>(
    tableName: T,
    keys: TableKeys[T][],
  ): Promise<BatchWriteCommandOutput[]> {
    const chunkSize = 25; // DynamoDB batchWrite limit
    const chunks = this.chunkArray(keys, chunkSize);
    const batchPromises = chunks.map((chunk) => {
      const deleteRequests = chunk.map((key) => ({
        DeleteRequest: {
          Key: key,
        },
      }));

      const command = new BatchWriteCommand({
        RequestItems: {
          [this.getTableName(tableName)]: deleteRequests,
        },
      });

      return this.documentClient.send(command);
    });

    const results = await Promise.all(batchPromises);

    return results;
  }
  async updateItem<T extends TableNames>(
    tableName: T,
    key: TableKeys[T],
    attributesToUpdate: Partial<Omit<TableItem[T], keyof TableKeys[T]>>,
    options?: {
      conditionExpression?: string;
      cache?: {
        ttl: number;
      };
    },
  ): Promise<TableItem[T]> {
    const allAttributeNames = Object.keys(attributesToUpdate) as (keyof Omit<
      TableItem[T],
      keyof TableKeys[T]
    >)[];

    const attributeKeysToUpdate = allAttributeNames.filter(
      (attr) => attributesToUpdate[attr] !== undefined,
    );

    const updateExpression =
      'set ' +
      attributeKeysToUpdate
        .map((attr) => `#${String(attr)} = :${String(attr)}`)
        .join(', ');
    const expressionAttributeValues = attributeKeysToUpdate.reduce(
      (acc, attr) => ({
        ...acc,
        [`:${String(attr)}`]: attributesToUpdate[attr],
      }),
      {},
    );
    const definedExpressionAttributeNames = attributeKeysToUpdate.reduce(
      (acc, attr) => ({ ...acc, [`#${String(attr)}`]: attr }),
      {},
    );

    const command = new UpdateCommand({
      TableName: this.getTableName(tableName),
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: definedExpressionAttributeNames,
      ReturnValues: 'ALL_NEW',
    });
    if (options?.conditionExpression) {
      command.input.ConditionExpression = options.conditionExpression;
    }
    const response = await this.documentClient.send(command);
    if (options?.cache) {
      const cacheKey = this.getCacheKeyString(tableName, key);
      await this.cacheService.set(
        cacheKey,
        response.Attributes,
        options.cache.ttl,
      );
    }
    return response.Attributes as TableItem[T];
  }
  async identicalScanSearch<T extends TableNames>(
    tableName: T,
    key: keyof TableItem[T],
    value: string,
  ): Promise<TableItem[T][]> {
    const command = new ScanCommand({
      TableName: this.getTableName(tableName),
      FilterExpression: `#${String(key)} = :value`,
      ExpressionAttributeValues: {
        ':value': value,
      },
      ExpressionAttributeNames: {
        [`#${String(key)}`]: String(key),
      },
    });
    const response = await this.documentClient.send(command);
    return response.Items as TableItem[T][];
  }

  async batchGetItems<T extends TableNames>(
    tableName: T,
    keys: TableKeys[T][],
  ): Promise<TableItem[T][]> {
    const chunkSize = 100; // DynamoDB batchGet limit
    const chunks = this.chunkArray(keys, chunkSize);
    const batchPromises = chunks.map((chunk) => {
      const command = new BatchGetCommand({
        RequestItems: {
          [this.getTableName(tableName)]: {
            Keys: chunk,
          },
        },
      });

      return this.documentClient.send(command);
    });
    const results = await Promise.all(batchPromises);

    return results.flatMap(
      (result) => result.Responses[this.getTableName(tableName)],
    ) as TableItem[T][];
  }

  async batchWriteItems<T extends TableNames>(
    tableName: T,
    items: Array<TableItem[T]>,
  ): Promise<BatchWriteCommandOutput[]> {
    const chunkSize = 25; // DynamoDB batchWrite limit
    const chunks = this.chunkArray(items, chunkSize);
    const batchPromises = chunks.map((chunk) => {
      const putRequests = chunk.map((item) => ({
        PutRequest: {
          Item: item,
        },
      }));

      const command = new BatchWriteCommand({
        RequestItems: {
          [this.getTableName(tableName)]: putRequests,
        },
      });

      return this.documentClient.send(command);
    });

    const results = await Promise.all(batchPromises);

    return results;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  }
}
