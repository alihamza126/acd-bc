import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL not set; Redis features will be disabled');
      return;
    }
    try {
      this.client = createClient({ url });
      this.client.on('error', (err) => {
        this.logger.error('Redis client error', err);
      });
      this.client.on('reconnecting', () => {
        this.logger.log('Redis reconnecting');
      });
      this.client.on('connect', () => {
        this.logger.log('Redis connected');
      });
      await this.client.connect();
      this.logger.log('Redis connection established');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      this.client = null;
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.logger.log('Redis connection closed');
    }
  }

  isAvailable(): boolean {
    return this.client != null;
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  /** Get value by key. Returns null if key does not exist or Redis is unavailable. */
  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.warn(`Redis GET failed for key ${key}`, error);
      return null;
    }
  }

  /** Set key with optional TTL in seconds. */
  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      if (ttlSeconds != null && ttlSeconds > 0) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      this.logger.warn(`Redis SET failed for key ${key}`, error);
      return false;
    }
  }

  /** Delete key. Returns true if key was deleted or Redis is unavailable (no-op). */
  async del(key: string): Promise<boolean> {
    if (!this.client) return true;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.warn(`Redis DEL failed for key ${key}`, error);
      return false;
    }
  }

  /** Delete multiple keys. */
  async delMany(keys: string[]): Promise<boolean> {
    if (!this.client || keys.length === 0) return true;
    try {
      await this.client.del(keys);
      return true;
    } catch (error) {
      this.logger.warn('Redis DEL many failed', error);
      return false;
    }
  }

  /** Set TTL on existing key (seconds). */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      const result = await this.client.expire(key, seconds);
      return Boolean(result);
    } catch (error) {
      this.logger.warn(`Redis EXPIRE failed for key ${key}`, error);
      return false;
    }
  }
}
