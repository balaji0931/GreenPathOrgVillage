import { createClient, RedisClientType } from 'redis';

type CacheValue = any;

export interface ICache {
  get(key: string): Promise<CacheValue | null>;
  set(key: string, value: CacheValue, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
  isConnected(): boolean;
}

class RedisCache implements ICache {
  private client: RedisClientType;
  private connected: boolean = false;

  constructor(redisUrl?: string) {
    if (!redisUrl) {
      throw new Error('Redis URL is required for RedisCache');
    }

    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis max retries exceeded');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.client.on('connect', () => {
      this.connected = true;
      console.log('✅ Redis cache connected');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis cache error:', err);
      this.connected = false;
    });

    this.client.connect().catch((err) => {
      console.error('Failed to connect to Redis:', err);
      this.connected = false;
    });
  }

  async get(key: string): Promise<CacheValue | null> {
    if (!this.connected) return null;
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: CacheValue, ttl: number = 3600): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async clear(pattern?: string): Promise<void> {
    if (!this.connected) return;
    try {
      if (pattern) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      } else {
        await this.client.flushDb();
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

class MemoryCache implements ICache {
  private cache: Map<string, { value: CacheValue; expiresAt: number }> = new Map();

  async get(key: string): Promise<CacheValue | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: CacheValue, ttl: number = 3600): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const key of Array.from(this.cache.keys())) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  isConnected(): boolean {
    return true;
  }
}

let cacheInstance: ICache | null = null;

export function initializeCache(): ICache {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      cacheInstance = new RedisCache(redisUrl);
      console.log('🟢 Using Redis cache');
    } catch (error) {
      console.warn('⚠️ Redis unavailable, falling back to memory cache:', error);
      cacheInstance = new MemoryCache();
    }
  } else {
    console.log('🟠 Using memory cache (REDIS_URL not configured)');
    cacheInstance = new MemoryCache();
  }

  return cacheInstance;
}

export function getCache(): ICache {
  if (!cacheInstance) {
    cacheInstance = initializeCache();
  }
  return cacheInstance;
}

// Cache key builders
export const cacheKeys = {
  village: (villageId: string) => `village:${villageId}`,
  villages: () => 'villages:all',
  collectors: (villageId: string) => `collectors:${villageId}`,
  collectorsPaginated: (villageId: string, page: number, limit: number) => `collectors:${villageId}:${page}:${limit}`,
  households: (villageId: string) => `households:${villageId}`,
  householdsPaginated: (villageId: string, page: number, limit: number, filters?: string) =>
    `households:${villageId}:${page}:${limit}:${filters || 'all'}`,
  issues: (villageId: string) => `issues:${villageId}`,
  issuesPaginated: (villageId: string, page: number, limit: number, status?: string) =>
    `issues:${villageId}:${page}:${limit}:${status || 'all'}`,
  wasteCollections: (villageId: string) => `collections:${villageId}`,
  wasteCollectionsPaginated: (villageId: string, page: number, limit: number, date?: string) =>
    `collections:${villageId}:${page}:${limit}:${date || 'all'}`,
  announcements: (villageId: string) => `announcements:${villageId}`,
  announcementsPaginated: (page: number, limit: number) => `announcements:paginated:${page}:${limit}`,
  globalAnnouncements: () => 'announcements:global',
  managers: () => 'managers:all',
  managersPaginated: (page: number, limit: number) => `managers:paginated:${page}:${limit}`,
  moderators: () => 'moderators:all',
  villageStats: (villageId: string) => `stats:village:${villageId}`,
  moderatorStats: (moderatorId: string) => `stats:moderator:${moderatorId}`,
  wards: (villageId: string) => `wards:${villageId}`,
  dailyReport: (villageId: string, date: string) => `report:daily:${villageId}:${date}`,
  villageDetails: (villageId: string) => `village:details:${villageId}`,
  websiteFeedback: (page: number, limit: number) => `feedback:website:${page}:${limit}`,
  contactSubmissions: (page: number, limit: number) => `contact:submissions:${page}:${limit}`,
};
