import { route, getAuth } from '../lib/common.js';
import { redis } from '../lib/redis.js';

// PUT /api/destinations  body { destinations: [{ id, name, note, active }] }  (admin only)
// The array order is the display order.
export default route(['PUT'], async (req, res) => {
  const a = getAuth(req);
  if (!a.isAdmin) return res.status(401).json({ error: 'Admin password required.' });

  const list = req.body && req.body.destinations;
  if (!Array.isArray(list) || list.length > 100) {
    return res.status(400).json({ error: 'Send a list of up to 100 destinations.' });
  }
  const seenIds = new Set();
  const seenNames = new Set();
  const clean = [];
  for (let i = 0; i < list.length; i++) {
    const d = list[i] || {};
    const id = typeof d.id === 'string' && /^[a-z0-9-]{1,40}$/.test(d.id) ? d.id : null;
    const name = String(d.name || '').trim().slice(0, 60);
    const note = String(d.note || '').trim().slice(0, 80);
    if (!id || seenIds.has(id)) return res.status(400).json({ error: 'Each destination needs a unique id.' });
    if (!name) return res.status(400).json({ error: 'Each destination needs a name.' });
    if (seenNames.has(name.toLowerCase())) return res.status(400).json({ error: `“${name}” appears twice.` });
    seenIds.add(id);
    seenNames.add(name.toLowerCase());
    clean.push({ id, name, note, active: d.active !== false, order: (i + 1) * 10 });
  }
  await redis.set('destinations', clean);
  res.status(200).json({ destinations: clean });
});
