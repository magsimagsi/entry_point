import { route, getAuth, lastDayKeys, getDestinations, TZ } from '../lib/common.js';
import { redis } from '../lib/redis.js';

// GET /api/state?days=1..14  ->  destinations plus entries for the last N days.
export default route(['GET'], async (req, res) => {
  const a = getAuth(req);
  if (!a.isStaff) {
    return res.status(401).json({ error: 'Staff PIN required', staffRequired: true });
  }
  const n = Math.min(14, Math.max(1, parseInt(req.query.days, 10) || 1));
  const keys = lastDayKeys(n);
  const [destinations, ...rows] = await Promise.all([
    getDestinations(),
    ...keys.map((k) => redis.hgetall('entries:' + k)),
  ]);
  const days = {};
  keys.forEach((k, i) => { days[k] = Object.values(rows[i] || {}); });
  res.status(200).json({
    tz: TZ,
    today: keys[0],
    destinations,
    days,
    staffRequired: a.staffRequired,
    adminConfigured: a.adminConfigured,
  });
});
