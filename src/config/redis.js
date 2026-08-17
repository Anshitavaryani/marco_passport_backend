const Redis = require("ioredis");
const config = require("./config");
const logger = require("./logger");

// `maxConnectionAge` and `maxInflightRequests` (previously in this file)
// are not real ioredis options — ioredis silently ignores unknown keys, so
// they were doing nothing. Removed, and replaced with actual valid options
// below (connectTimeout/commandTimeout).
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  db: config.redis.db,
  connectTimeout: 10000,
  commandTimeout: 5000,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  reconnectOnError: (err) => err.message.startsWith("READONLY"),
  lazyConnect: true,
});

redis.on("connect", () => logger.info("Redis connected."));
redis.on("error", (err) => logger.warn(`Redis error: ${err.message}`));

// Removed the eager ping-on-load — with `lazyConnect: true`, ioredis is
// meant to defer connecting until the first real command is issued
// elsewhere in the app. Forcing a ping here on every `require('./redis')`
// connected immediately anyway, defeating the point of lazyConnect, and
// meant this module threw a connection error on load in any environment
// without Redis running — even if nothing was actually using it yet.
//
// NOTE: nothing in the codebase reviewed so far actually imports this file.
// If Redis isn't in active use yet, that's fine — this module just won't
// connect until something calls redis.get/set/etc. If it turns out nothing
// ever will, this file (and the `ioredis` dependency) can be deleted.

module.exports = redis;
