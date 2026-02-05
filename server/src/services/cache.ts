import { redis, redisPub, redisSub } from "../db/redis.js";

/**
 * Generic cache-aside pattern.
 * Attempts to read the value from Redis first. On a miss, calls the fetcher,
 * stores the result in Redis with the given TTL, and returns it.
 */
export async function cacheGet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await redis.get(key);

  if (cached !== null) {
    return JSON.parse(cached) as T;
  }

  const value = await fetcher();
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  return value;
}

/**
 * Delete a single cache key.
 */
export async function cacheInvalidate(key: string): Promise<void> {
  await redis.del(key);
}

/**
 * Delete all cache keys matching a glob pattern.
 * Uses SCAN to avoid blocking Redis on large keyspaces.
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100,
    );
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== "0");
}

/**
 * Publish a game event on the Redis channel for a specific game.
 * Subscribers listening on `game:{gameId}` will receive the serialised event.
 */
export async function publishGameEvent(
  gameId: string,
  event: Record<string, unknown>,
): Promise<void> {
  await redisPub.publish(`game:${gameId}`, JSON.stringify(event));
}

/**
 * Subscribe to game events for a specific game.
 * Returns an unsubscribe function that cleans up the listener.
 *
 * Because ioredis dedicates a connection once SUBSCRIBE is issued,
 * we use the shared `redisSub` client and filter by channel.
 */
export function subscribeGameEvents(
  gameId: string,
  callback: (event: Record<string, unknown>) => void,
): () => void {
  const channel = `game:${gameId}`;

  const handler = (ch: string, message: string) => {
    if (ch === channel) {
      try {
        const parsed = JSON.parse(message) as Record<string, unknown>;
        callback(parsed);
      } catch {
        console.error(`Failed to parse game event on ${channel}:`, message);
      }
    }
  };

  redisSub.subscribe(channel).catch((err) => {
    console.error(`Failed to subscribe to ${channel}:`, err);
  });

  redisSub.on("message", handler);

  return () => {
    redisSub.unsubscribe(channel).catch((err) => {
      console.error(`Failed to unsubscribe from ${channel}:`, err);
    });
    redisSub.removeListener("message", handler);
  };
}

/**
 * Store a full game state snapshot in Redis (used for quick reads by WS clients).
 */
export async function setGameState(
  gameId: string,
  state: Record<string, unknown>,
): Promise<void> {
  await redis.set(`gamestate:${gameId}`, JSON.stringify(state), "EX", 3600);
}

/**
 * Retrieve a cached game state snapshot.
 */
export async function getGameState(
  gameId: string,
): Promise<Record<string, unknown> | null> {
  const raw = await redis.get(`gamestate:${gameId}`);
  if (raw === null) return null;
  return JSON.parse(raw) as Record<string, unknown>;
}
