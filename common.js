import crypto from 'node:crypto';
import { redis, dbReady } from './redis.js';

export const TZ = process.env.APP_TIMEZONE || 'Asia/Manila';

// "YYYY-MM-DD" for the given moment in the configured time zone.
export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

// Today first, then going back. Built from calendar math so DST never repeats or skips a day.
export function lastDayKeys(n) {
  const [y, m, d] = dayKey().split('-').map(Number);
  const keys = [];
  for (let i = 0; i < n; i++) {
    keys.push(new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10));
  }
  return keys;
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

// Credentials come from headers on normal requests, or from the body on /api/login.
export function authWith(password, pin) {
  const adminPw = process.env.ADMIN_PASSWORD || '';
  const staffPin = process.env.STAFF_PIN || '';
  const isAdmin = Boolean(adminPw) && safeEqual(password || '', adminPw);
  const isStaff = isAdmin || !staffPin || safeEqual(pin || '', staffPin);
  return { isAdmin, isStaff, staffRequired: Boolean(staffPin), adminConfigured: Boolean(adminPw) };
}

export function getAuth(req) {
  return authWith(req.headers['x-admin-password'], req.headers['x-staff-pin']);
}

// Wraps a handler: method check, no caching, database check, error handling.
export function route(methods, handler) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!methods.includes(req.method)) {
      res.setHeader('Allow', methods.join(', '));
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!dbReady) {
      return res.status(503).json({
        error: 'Database not connected. Add the Upstash Redis integration to the project and redeploy.',
      });
    }
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  };
}

export const DEFAULT_DESTINATIONS = [
  { id: 'registration', name: 'Registration', note: 'Front counter', active: true, order: 10 },
  { id: 'consultation-rooms', name: 'Consultation rooms', note: 'Check the room list at the desk', active: true, order: 20 },
  { id: 'laboratory', name: 'Laboratory', note: 'Blood tests and samples', active: true, order: 30 },
  { id: 'imaging', name: 'Imaging', note: 'X-ray and ultrasound', active: true, order: 40 },
  { id: 'pharmacy', name: 'Pharmacy', note: 'Prescriptions and refills', active: true, order: 50 },
  { id: 'cashier', name: 'Cashier', note: 'Billing and payments', active: true, order: 60 },
];

export async function getDestinations() {
  let list = await redis.get('destinations');
  if (!Array.isArray(list)) {
    list = DEFAULT_DESTINATIONS;
    await redis.set('destinations', list);
  }
  return list;
}
