import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config'; // Assuming you're using @nestjs/config
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (!redisUrl) {
          return {};
        }
        return {
          store: redisStore.create({
            url: configService.get<string>('REDIS_URL'),
          }),
          // host: '127.0.0.1',
          // port: 6379,
          // ttl: 60,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
