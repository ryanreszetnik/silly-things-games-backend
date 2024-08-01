import { Injectable } from '@nestjs/common';
import { TableNames } from '../shared/interfaces/db.interface';
import { User } from '../shared/models/user.interface';
import { v4 as uuidv4 } from 'uuid';
import { UserDto } from './dtos/user.dto';
import { DynamoDBService } from '../dynamodb/dynamodb.service';
import { getCurrentEpoch } from '../utils/helpers';
import { GoogleUser } from 'src/shared/models/google-user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async findUser(uid: string): Promise<User | null> {
    return await this.dynamoDBService.getItem(
      TableNames.User,
      { uid },
      {
        cache: {
          ttl: 60 * 60 * 24,
        },
      },
    );
  }

  async getAllUsers(): Promise<User[]> {
    const result = await this.dynamoDBService.getAllItems(TableNames.User);
    return result.items;
  }

  async update(
    uid: string,
    updatedProps: Partial<Omit<User, 'uid' | 'createdAt'>>,
  ): Promise<User> {
    for (const field in ['uid', 'createdAt']) {
      if (field in updatedProps) {
        throw new Error(`Update of '${field}' is not allowed`);
      }
    }

    return await this.dynamoDBService.updateItem(
      TableNames.User,
      { uid },
      updatedProps,
      {
        cache: {
          ttl: 60 * 60 * 24,
        },
      },
    );
  }

  toUserDtos(users: User[]): UserDto[] {
    return users.map((user) => this.toUserDto(user));
  }

  toUserDto(user: User): UserDto {
    return {
      uid: user.uid,
      gid: user.gid,
      createdAt: user.createdAt,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
    };
  }

  // Google Auth
  async findOrCreateUserFromGid(
    gid: string,
    firstName: string,
    lastName: string,
    email: string,
    picture?: string,
  ): Promise<{
    user: User;
    isNewUser: boolean;
  }> {
    try {
      let googleUser = await this.dynamoDBService.getItem(
        TableNames.GoogleUser,
        {
          gid: gid,
        },
      );

      const now = getCurrentEpoch();

      if (googleUser) {
        const existingUser = await this.findUser(googleUser.uid);
        if (existingUser) {
          return {
            user: existingUser,
            isNewUser: false,
          };
        }
      } else {
        googleUser = await this.createGoogleUser({
          gid: gid,
          createdAt: now,
          firstName,
          lastName,
          email: email,
          imageUrl: picture,
        });
      }

      const user: User = {
        uid: googleUser.uid,
        gid: googleUser.gid,
        createdAt: now,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        imageUrl: picture,
      };

      await this.dynamoDBService.putItem(TableNames.User, user, {
        cache: {
          ttl: 60 * 60 * 24,
        },
      });
      return {
        user,
        isNewUser: true,
      };
    } catch (error) {
      throw Error(`Error finding or creating user: ${email} ${error.message}`);
    }
  }

  async createGoogleUser(params: {
    gid: string;
    createdAt: number;
    email: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
  }): Promise<GoogleUser> {
    try {
      const uid = uuidv4();
      const googleUser: GoogleUser = {
        ...params,
        uid,
      };
      await this.dynamoDBService.putItem(TableNames.GoogleUser, googleUser);
      return googleUser;
    } catch (error) {
      throw Error(`Error creating google user: ${params.email} ${error}`);
    }
  }
  // private async createUsername(email: string): Promise<string> {
  //     let username = email.split('@')[0];
  //     let user: User | null = await this.findUser(username);
  //     let trials = 1;
  //     while (user) {
  //       username = `${username}${trials}`;
  //       user = await this.findUser(username);
  //       trials++;
  //     }
  //     return username;
  //   }
}
