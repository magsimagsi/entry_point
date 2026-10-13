# Entry Counter

Counts how many people enter the premises and where they are going. Two tabs:

- **Front desk**: a big count for today, one tap per destination, a group-size stepper, undo and remove.
- **Admin** (password): add, rename, reorder, hide and delete destinations, 7-day totals, CSV export.

No patient names or details are stored. Each entry is only the time, group size and destination.

## Project layout

```
public/index.html      the whole page (HTML, CSS, JS)
api/state.js           GET  /api/state?days=1..14   destinations + entries
api/entries.js         POST /api/entries            log an entry
                       DELETE /api/entries?day=&id= remove an entry
api/destinations.js    PUT  /api/destinations       save the list (admin only)
api/login.js           POST /api/login              check a PIN / password
lib/common.js          time zone, auth, defaults
lib/redis.js           Upstash Redis client (plus an in-memory stand-in for local tests)
vercel.json            runs functions in Singapore (sin1), closest to the Philippines
```

## Deploy to Vercel

You need a Vercel account (the free Hobby plan is enough) and a GitHub account.

### 1. Put the project on GitHub

```bash
cd entry-counter
git init
git add .
git commit -m "Entry counter"
```

Create an empty repository on GitHub (private is fine), then:

```bash
git remote add origin https://github.com/<you>/entry-counter.git
git branch -M main
git push -u origin main
```

### 2. Import it into Vercel

1. Vercel dashboard → **Add New… → Project**.
2. Pick the `entry-counter` repository → **Import**.
3. Leave **Framework Preset** as **Other**. Leave Build and Output settings empty.
4. Click **Deploy**. The first deploy will load the page but show "Database not connected". That is expected. Do steps 3 and 4 next.

### 3. Add the database (Upstash Redis)

1. Open the project → **Storage** tab (or **Marketplace**) → **Upstash** → **Redis**.
2. Create the database. Choose a region near you (Singapore if offered) and the free plan.
3. When asked, connect it to this project for all environments (Production, Preview, Development).

This adds the connection variables to the project automatically. The code accepts either
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` or `KV_REST_API_URL` / `KV_REST_API_TOKEN`.
If your integration used another prefix, add one of those pairs yourself under Settings → Environment Variables.

### 4. Set the passwords

Project → **Settings → Environment Variables**, add:

| Name | Value | Notes |
| --- | --- | --- |
| `ADMIN_PASSWORD` | a long passphrase | Required. Opens the Admin tab. |
| `STAFF_PIN` | e.g. `4821` | Optional. If set, the front desk also asks for this PIN. If empty, anyone with the link can log entries. |
| `APP_TIMEZONE` | `Asia/Manila` | Optional. Decides when "today" starts. This is the default. |

### 5. Redeploy

Environment variables only apply to new deployments.
**Deployments** tab → the latest one → **⋯ → Redeploy**.

### 6. Check it works

1. Open your `*.vercel.app` URL.
2. Tap a destination. The big number and that tile should go up by 1.
3. Open the same URL on another device. Both should show the same count within a few seconds.
4. Open **Admin**, sign in, add a destination, and confirm it appears on the front desk tab.

Six example destinations are created the first time the app runs (Registration, Consultation rooms,
Laboratory, Imaging, Pharmacy, Cashier). Change them in Admin.

### Optional: deploy from your computer instead of GitHub

```bash
npm i -g vercel
cd entry-counter
vercel          # first run: link or create the project
# add the Upstash database and the env vars in the dashboard (steps 3 and 4), then:
vercel --prod
```

### Optional: run it locally

```bash
npm install
cp .env.example .env.local     # set ADMIN_PASSWORD, and LOCAL_MEMORY_DB=1 for a throwaway test database
npx vercel dev
```

With `LOCAL_MEMORY_DB=1` data lives in memory and disappears when you stop the server.
Do not set that variable on Vercel.

## Good to know

- **Access control.** The Admin password and the optional staff PIN are checked on the server for every request. They travel over HTTPS. Use a long admin password. For stronger protection, turn on Vercel Authentication (Settings → Deployment Protection) so only your team can open the site at all.
- **Live counts** refresh every 4 seconds on each open screen.
- **Time zone.** "Today" follows `APP_TIMEZONE`, not the device clock, so every screen agrees.
- **Data retention.** Each day's entries expire after about 400 days. Export a CSV before then if you need longer records.
- **Size.** The free Upstash plan is plenty for a clinic's daily tally. One entry is a few hundred bytes.
- **Deleting a destination** keeps past entries. They show under the old name marked "(removed)".
