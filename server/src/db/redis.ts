import Redis from "ioredis";
import { config } from "../config.js";

function createRedisClient(label: string): Redis {
  const client = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5_000);
      return delay;
    },
    lazyConnect: false,
  });

  client.on("connect", () => {
    console.log(`Redis ${label}: connected`);
  });

  client.on("error", (err) => {
    console.error(`Redis ${label} error:`, err);
  });

  return client;
}

/** General-purpose Redis client for get/set/cache operations. */
export const redis = createRedisClient("main");

/** Dedicated Redis client for subscribing to channels (blocked by SUBSCRIBE). */
export const redisSub = createRedisClient("subscriber");

/** Dedicated Redis client for publishing to channels. */
export const redisPub = createRedisClient("publisher");
