# Locked & Level LLC website (Feed template)

Node 20 / Express / SQLite. The home page is a business profile and a feed of posts (jobs, before & afters, announcements). The owner posts new jobs from the dashboard at `/admin`, and every post gets its own share link (`/p/<id>`) with its own preview photo for Facebook.

## Run locally
```
npm install
ADMIN_PASSWORD=choose-something-long npm start
```
Open http://localhost:3000 and http://localhost:3000/admin

## Deploy on Render
1. Upload this folder to a GitHub repo. node_modules, the database and .env are ignored.
2. Render > New > Web Service. Build: `npm install`. Start: `npm start`.
3. Add a Disk (1 GB) at `/var/data`. Set `DB_PATH=/var/data/site.sqlite` and `UPLOAD_DIR=/var/data/uploads` so posts and photos survive deploys.
4. Set the env vars in `.env.example`: ADMIN_PASSWORD, SESSION_SECRET, SITE_URL, NOTIFY_EMAIL, SMTP_*.

## Dashboard
- **Posts:** add job photos (up to 10), a before & after (2 photos), or an announcement. Pin, hide, move to top, edit, or delete any post. Photos are resized automatically.
- **Estimate requests:** status, notes, call/text/email buttons, delete, CSV export. Requests sent from a post's "Get this look" button show which post they came from.
- **Traffic:** visitors, call and text taps, estimate requests, sources.

## Reusing the Feed template
Business details live in `lib/site.js`; the starter posts are in `db/init.js`.
