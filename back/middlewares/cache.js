const redis = require('redis');
const { promisify } = require('util');

const client = redis.createClient({
  host: 'localhost',
  port: 5173
});

client.on('error', (err) => {
  console.error('Redis error:', err);
});

module.exports = {
  get: promisify(client.get).bind(client),
  set: promisify(client.set).bind(client),
  del: promisify(client.del).bind(client),
  keys: promisify(client.keys).bind(client),
  expire: promisify(client.expire).bind(client),
  quit: promisify(client.quit).bind(client),
};