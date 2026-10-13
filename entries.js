import crypto from 'node:crypto';
import { route, getAuth, dayKey, getDestinations } from '../lib/common.js';
import { redis } from '../lib/redis.js';

const KEEP_SECONDS = 60 * 60 * 24 * 400;

// POST   /api/entries            body { dest: "<destination id or empty>", n: 1..99 }
// DELETE /api/entries?day=YYYY-MM-DD&id=<entry id>
export default route(['POST', 'DELETE'], async (req, res) => {
  const a = getAuth(req);
  if (!a.isStaff) return res.status(401).json({ error: 'Staff PIN required', staffRequired: true });

  if (req.method === 'POST') {
    const body = req.body || {};
    const n = Number(body.n);
    if (!Number.isInteger(n) || n < 1 || n > 99) {
      return res.status(400).json({ error: 'Group size must be a whole number from 1 to 99.' });
    }
    const destId = typeof body.dest === 'string' ? body.dest : '';
    let destName = '';
    if (destId) {
      const list = await getDestinations();
      const d = list.find((x) => x.id === destId);
      if (!d) return res.status(400).json({ error: 'Unknown destination.' });
      destName = d.name;
    }
    const now = new Date();
    const day = dayKey(now);
    const entry = { id: crypto.randomUUID(), ts: now.getTime(), n, dest: destId, destName };
    await redis.hset('entries:' + day, { [entry.id]: entry });
    await redis.expire('entries:' + day, KEEP_SECONDS);
    return res.status(201).json({ day, entry });
  }

  const day = String(req.query.day || '');
  const id = String(req.query.id || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^[A-Za-z0-9-]{1,64}$/.test(id)) {
    return res.status(400).json({ error: 'Bad day or id.' });
  }
  await redis.hdel('entries:' + day, id);
  res.status(200).json({ ok: true });
});
