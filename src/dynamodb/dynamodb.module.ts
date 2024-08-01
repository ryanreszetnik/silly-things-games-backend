import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBService } from './dynamodb.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [
    {
      provide: 'DYNAMODB',
      useFactory: (configService: ConfigService) => {
        return new DynamoDB({
          region: configService.get<string>('AWS_REGION'),
          credentials: {
            accessKeyId: configService.get<string>('AWS_ACCESS_ID') ?? 'N/A',
            secretAccessKey:
              configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? 'N/A',
          },
        });
      },
      inject: [ConfigService],
    },
    DynamoDBService,
  ],
  exports: [DynamoDBService],
})
export class DynamoDBModule {}
