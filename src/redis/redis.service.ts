import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService {
  private cacheEnabled: boolean;
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.cacheEnabled = !!this.configService.get('REDIS_URL');
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.cacheEnabled) return undefined;
    const resp = (await this.cacheManager.get(key)) as T | undefined;
    return resp;
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    if (!this.cacheEnabled) return;
    return await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    if (!this.cacheEnabled) return;
    return await this.cacheManager.del(key);
  }
}
