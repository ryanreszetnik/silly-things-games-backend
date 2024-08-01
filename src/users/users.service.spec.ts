import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { DynamoDBService } from '../dynamodb/dynamodb.service';
import { faker } from '@faker-js/faker';
import { UserFollowing } from '../shared/models/user-following.interface';
import { User } from '../shared/models/user.interface';
import { S3Module } from '../s3/s3.module';
import { DynamoDBModule } from '../dynamodb/dynamodb.module';
import { ConfigModule } from '@nestjs/config';
import { TableNames } from '../shared/interfaces/db.interface';

const getFakeUserFollowing = (
  partial: Partial<UserFollowing>,
): UserFollowing => {
  return {
    uid: faker.string.uuid(),
    username: faker.internet.userName(),
    fuid: faker.string.uuid(),
    fusername: faker.internet.userName(),
    ...partial,
  };
};

const getFakeUser = (partial: Partial<User>): User => {
  return {
    createdAt: faker.date.past().getTime(),
    uid: faker.string.uuid(),
    phoneNum: faker.phone.number(),
    username: faker.internet.userName(),
    followAiTags: [faker.lorem.word()],
    pids: [],
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    birthday: faker.date.past().toISOString(),
    image: faker.image.avatar(),
    ...partial,
  };
};

describe('UsersService', () => {
  let service: UsersService;
  let dynamoDBService: DynamoDBService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        S3Module,
        DynamoDBModule,
      ],
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
    dynamoDBService = module.get<DynamoDBService>(DynamoDBService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should search users by username', async () => {
    const usernameSearch = 'test';
    const numItems = 10;
    const myUid = faker.string.uuid();
    const fakeFollowings = [...Array(numItems)].map(() =>
      getFakeUserFollowing({
        fuid: myUid,
        fusername: faker.internet.userName(),
      }),
    );
    const fakeUsers = fakeFollowings.map((f) => getFakeUser({ uid: f.uid }));
    jest.spyOn(dynamoDBService, 'queryPK').mockImplementation(async () => {
      return {
        items: fakeFollowings,
      };
    });
    jest
      .spyOn(dynamoDBService, 'batchGetItems')
      .mockImplementation(async () => {
        return fakeUsers;
      });
    const lastEvaluatedKey = { fuid: 'test' };

    const users = await service.searchFollowersByUsername(
      usernameSearch,
      myUid,
      numItems,
      lastEvaluatedKey,
    );

    expect(users).toBeDefined();
    expect(users.items.length).toBe(numItems);
    expect(dynamoDBService.queryPK).toBeCalledTimes(1);
    expect(dynamoDBService.queryPK).toBeCalledWith(
      TableNames.UserFollowing,
      { fuid: myUid },
      {
        filter: {
          operator: 'begins_with',
          field: 'username',
          value: usernameSearch,
        },
        indexName: 'fuid-uid-index',
        limit: numItems,
        startKey: lastEvaluatedKey,
      },
    );
    expect(dynamoDBService.batchGetItems).toBeCalledWith(
      TableNames.User,
      fakeUsers.map((f) => ({ uid: f.uid })),
    );
    expect(dynamoDBService.batchGetItems).toBeCalledTimes(1);
  });

  it('should get recommended users', async () => {
    const numItems = 10;
    const myUid = faker.string.uuid();

    jest.spyOn(dynamoDBService, 'getAllItems').mockImplementation(async () => {
      return {
        items: [...Array(4)].map(() => getFakeUser({})),
      };
    });

    jest.spyOn(dynamoDBService, 'queryPK').mockImplementation(async () => {
      return {
        items: [...Array(5)].map(() => getFakeUserFollowing({ uid: myUid })),
      };
    });

    jest
      .spyOn(dynamoDBService, 'batchGetItems')
      .mockImplementation(async (_, ks) => {
        return [...Array(ks.length)].map(() => getFakeUser({}));
      });

    const users = await service.getRecommendedUsers(myUid, numItems);

    expect(users).toBeDefined();
    expect(users.length).toBe(10);
    expect(dynamoDBService.getAllItems).toBeCalledTimes(0);
    expect(dynamoDBService.queryPK).toBeCalledTimes(3);
    expect(dynamoDBService.batchGetItems).toBeCalledTimes(1);
  });
  it('should use random users to fill up extra recommended users', async () => {
    const numItems = 10;
    const myUid = faker.string.uuid();

    jest.spyOn(dynamoDBService, 'getAllItems').mockImplementation(async () => {
      return {
        items: [...Array(4)].map(() => getFakeUser({})),
      };
    });

    jest.spyOn(dynamoDBService, 'queryPK').mockImplementation(async () => {
      return {
        items: [...Array(2)].map(() => getFakeUserFollowing({ uid: myUid })),
      };
    });

    jest
      .spyOn(dynamoDBService, 'batchGetItems')
      .mockImplementation(async (_, ks) => {
        return [...Array(ks.length)].map(() => getFakeUser({}));
      });

    const users = await service.getRecommendedUsers(myUid, numItems);

    expect(users).toBeDefined();
    expect(users.length).toBe(8);
    expect(dynamoDBService.getAllItems).toBeCalledTimes(1);
    expect(dynamoDBService.queryPK).toBeCalledTimes(3);
    expect(dynamoDBService.batchGetItems).toBeCalledTimes(1);
    expect(dynamoDBService.getAllItems).toBeCalledWith(TableNames.User, {
      filter: {
        operator: 'neq',
        field: 'uid',
        value: myUid,
      },
      limit: numItems,
    });
  });
  it('should handle many friends with many friends', async () => {
    const numItems = 100;
    const myUid = faker.string.uuid();

    jest.spyOn(dynamoDBService, 'getAllItems').mockImplementation(async () => {
      return {
        items: [...Array(150)].map(() => getFakeUser({})),
      };
    });

    jest.spyOn(dynamoDBService, 'queryPK').mockImplementation(async () => {
      return {
        items: [...Array(10)].map(() => getFakeUserFollowing({ uid: myUid })),
      };
    });

    jest
      .spyOn(dynamoDBService, 'batchGetItems')
      .mockImplementation(async (_, ks) => {
        return [...Array(ks.length)].map(() => getFakeUser({}));
      });

    const users = await service.getRecommendedUsers(myUid, numItems);

    expect(users).toBeDefined();
    expect(users.length).toBe(100);
    expect(dynamoDBService.getAllItems).toBeCalledTimes(0);
    expect(dynamoDBService.queryPK).toBeCalledTimes(11);
    expect(dynamoDBService.batchGetItems).toBeCalledTimes(1);
  });

  it('should fetch user followings correctly', async () => {
    const uid = 'test-uid';
    const limit = 10;
    const startKey = { uid: 'start-uid' };
    const expectedResults = {
      items: Array.from({ length: limit }, () => getFakeUserFollowing({ uid })),
      lastEvaluatedKey: { uid: 'last-uid' },
    };

    jest.spyOn(dynamoDBService, 'queryPK').mockResolvedValue(expectedResults);

    const result = await service.getUserFollowings(uid, limit, startKey);

    expect(dynamoDBService.queryPK).toHaveBeenCalledWith(
      TableNames.UserFollowing,
      { uid },
      {
        limit,
        startKey,
      },
    );
    expect(result).toEqual(expectedResults);
    expect(result.items.every((item) => item.uid === uid)).toBe(true);
  });

  it('should handle errors from DynamoDB service gracefully', async () => {
    const uid = 'test-uid';
    const limit = 10;
    const startKey = { uid: 'start-uid' };
    const errorMessage = 'Error fetching data from DynamoDB';

    jest
      .spyOn(dynamoDBService, 'queryPK')
      .mockRejectedValue(new Error(errorMessage));

    await expect(
      service.getUserFollowings(uid, limit, startKey),
    ).rejects.toThrow(errorMessage);
  });

  it('should handle the case when limit is zero', async () => {
    const uid = 'test-uid';
    const limit = 0;
    const startKey = { uid: 'start-uid' };

    const expectedResults = {
      items: [],
      lastEvaluatedKey: undefined,
    };

    jest.spyOn(dynamoDBService, 'queryPK').mockResolvedValue(expectedResults);

    const result = await service.getUserFollowings(uid, limit, startKey);

    expect(result.items).toHaveLength(0);
    expect(dynamoDBService.queryPK).toHaveBeenCalledWith(
      TableNames.UserFollowing,
      { uid },
      {
        limit,
        startKey,
      },
    );
  });

  it('should handle pagination correctly', async () => {
    const uid = 'test-uid';
    const limit = 5;
    const startKey = { uid: 'start-uid' };
    const expectedResults = {
      items: Array.from({ length: limit }, () => getFakeUserFollowing({ uid })),
      lastEvaluatedKey: { uid: 'last-uid' },
    };

    jest.spyOn(dynamoDBService, 'queryPK').mockResolvedValue(expectedResults);

    const result = await service.getUserFollowings(uid, limit, startKey);

    expect(result.lastEvaluatedKey).toEqual({ uid: 'last-uid' });
    expect(result.items.length).toBe(5);
  });

  it('should return a list of followers', async () => {
    const uid = faker.string.uuid();
    const limit = 5;
    const startKey = { fuid: 'startKeyUid' };

    const expectedFollowers = {
      items: Array.from({ length: limit }, () =>
        getFakeUserFollowing({ fuid: uid }),
      ),
      lastEvaluatedKey: { fuid: 'nextKeyUid' },
    };

    jest.spyOn(dynamoDBService, 'queryPK').mockResolvedValue(expectedFollowers);

    const result = await service.getUserFollowers(uid, limit, startKey);

    expect(result).toEqual(expectedFollowers);
    expect(dynamoDBService.queryPK).toBeCalledWith(
      TableNames.UserFollowing,
      { fuid: uid },
      {
        limit,
        startKey,
        indexName: 'fuid-uid-index',
      },
    );
    expect(result.items.every((item) => item.fuid === uid)).toBe(true);
  });

  it('should handle the case when no followers are found', async () => {
    const uid = faker.string.uuid();
    const limit = 5;
    const startKey = { fuid: 'startKeyUid' };

    const expectedFollowers = {
      items: [],
      lastEvaluatedKey: undefined,
    };

    jest.spyOn(dynamoDBService, 'queryPK').mockResolvedValue(expectedFollowers);

    const result = await service.getUserFollowers(uid, limit, startKey);

    expect(result.items).toHaveLength(0);
    expect(result.lastEvaluatedKey).toBeUndefined();
    expect(dynamoDBService.queryPK).toBeCalledWith(
      TableNames.UserFollowing,
      { fuid: uid },
      {
        limit,
        startKey,
        indexName: 'fuid-uid-index',
      },
    );
  });
});
