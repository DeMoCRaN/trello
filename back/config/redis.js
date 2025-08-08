const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });

    // Promisify Redis methods
    this.get = promisify(this.client.get).bind(this.client);
    this.set = promisify(this.client.set).bind(this.client);
    this.del = promisify(this.client.del).bind(this.client);
    this.keys = promisify(this.client.keys).bind(this.client);
    this.expire = promisify(this.client.expire).bind(this.client);
    this.quit = promisify(this.client.quit).bind(this.client);
    this.exists = promisify(this.client.exists).bind(this.client);
  }

  async setWithTTL(key, value, ttl = 300) {
    return await this.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async getParsed(key) {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidatePattern(pattern) {
    const keys = await this.keys(pattern);
    if (keys.length > 0) {
      await this.del(...keys);
    }
  }

  async close() {
    await this.quit();
  }
}

module.exports = new RedisClient();
