import { Redis } from '@upstash/redis';

// The Upstash integration on Vercel sets one of these pairs.
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

// In-memory stand-in for local testing only (LOCAL_MEMORY_DB=1). Not for production.
function memoryStore() {
  const kv = new Map();
  const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  return {
    async get(k) { return kv.has(k) ? clone(kv.get(k)) : null; },
    async set(k, v) { kv.set(k, clone(v)); return 'OK'; },
    async hgetall(k) {
      const h = kv.get(k);
      return h && Object.keys(h).length ? clone(h) : null;
    },
    async hset(k, obj) {
      const h = kv.get(k) || {};
      Object.assign(h, clone(obj));
      kv.set(k, h);
      return Object.keys(obj).length;
    },
    async hdel(k, ...fields) {
      const h = kv.get(k) || {};
      let n = 0;
      for (const f of fields) if (f in h) { delete h[f]; n++; }
      return n;
    },
    async expire() { return 1; },
  };
}

const hasRedis = Boolean(url && token);
const useMemory = !hasRedis && process.env.LOCAL_MEMORY_DB === '1';

export const dbReady = hasRedis || useMemory;
export const redis = useMemory ? memoryStore() : hasRedis ? new Redis({ url, token }) : null;
