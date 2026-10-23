const express = require('express');
const path = require('path');
const db = require('../db/init');
const auth = require('../lib/auth');
const S = require('../lib/site');
const { statsFor } = require('./analytics');
const { upload, handle, savePhotos, removePhotos } = require('../lib/uploads');

const router = express.Router();
const STATUSES = ['new', 'contacted', 'estimate scheduled', 'quoted', 'won', 'lost'];

const fails = new Map();
function throttled(ip) {
  const now = Date.now();
  const arr = (fails.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  fails.set(ip, arr);
  return arr.length >= 8;
}

router.use(['/admin', '/admin/*'], (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

router.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'views', auth.isAuthed(req) ? 'admin.html' : 'login.html')));
router.get('/admin/status', (req, res) => res.json({ loginEnabled: auth.loginEnabled(), authed: auth.isAuthed(req) }));
router.post('/admin/login', express.json({ limit: '4kb' }), (req, res) => {
  if (!auth.loginEnabled()) return res.status(503).json({ ok: false, error: 'Login is not set up yet. Set ADMIN_PASSWORD (8+ characters).' });
  if (throttled(req.ip)) return res.status(429).json({ ok: false, error: 'Too many attempts. Try again in a few minutes.' });
  if (!auth.checkPassword((req.body || {}).password)) {
    fails.get(req.ip).push(Date.now());
    return res.status(401).json({ ok: false, error: 'Wrong password.' });
  }
  auth.issue(req, res);
  res.json({ ok: true });
});
router.get('/admin/logout', (req, res) => { auth.clear(res); res.redirect('/admin'); });

const api = express.Router();
api.use(auth.requireAdminApi);

/* ---------- estimate requests ---------- */
api.get('/leads', (req, res) => res.json({ statuses: STATUSES, leads: db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 1000').all() }));
api.patch('/leads/:id', express.json({ limit: '16kb' }), (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  if (!db.prepare('SELECT id FROM leads WHERE id = ?').get(id)) return res.status(404).json({ error: 'not found' });
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return res.status(400).json({ error: 'bad status' });
    db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(b.status, id);
  }
  if (b.notes !== undefined) db.prepare('UPDATE leads SET notes = ? WHERE id = ?').run(String(b.notes).slice(0, 4000), id);
  res.json({ ok: true });
});
api.delete('/leads/:id', (req, res) => res.json({ ok: db.prepare('DELETE FROM leads WHERE id = ?').run(Number(req.params.id)).changes > 0 }));
api.get('/export.csv', (req, res) => {
  const cols = ['id', 'created_at', 'status', 'name', 'phone', 'email', 'town', 'project_type', 'timeline', 'contact_pref', 'details', 'ref_post', 'source', 'notes'];
  const cell = (v) => { let s = v == null ? '' : String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
  const rows = db.prepare('SELECT * FROM leads ORDER BY id DESC').all();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="estimate-requests.csv"');
  res.send([cols.join(',')].concat(rows.map((r) => cols.map((c) => cell(r[c])).join(','))).join('\n'));
});
api.get('/stats', (req, res) => res.json({ d7: statsFor(7), d30: statsFor(30), d90: statsFor(90) }));

/* ---------- feed posts ---------- */
const KINDS = ['job', 'note', 'beforeafter', 'follow'];
const out = (p) => ({ ...p, photos: JSON.parse(p.photos || '[]'), url: S.siteUrl() + '/p/' + p.id });
const getPost = (id) => db.prepare('SELECT * FROM posts WHERE id = ?').get(Number(id));
const topSort = () => (db.prepare('SELECT MAX(sort) m FROM posts').get().m || 0) + 10;

api.get('/posts', (req, res) => {
  res.json({ categories: S.categories, posts: db.prepare('SELECT * FROM posts ORDER BY pinned DESC, sort DESC, id DESC').all().map(out) });
});

api.post('/posts', handle(upload.array('photos', 10)), async (req, res) => {
  const b = req.body || {};
  const kind = KINDS.includes(b.kind) ? b.kind : 'job';
  const title = String(b.title || '').trim().slice(0, 140);
  const body = String(b.body || '').trim().slice(0, 2000);
  const category = S.categories.includes(b.category) ? b.category : null;
  if (!title && !body && !(req.files || []).length) return res.status(400).json({ ok: false, error: 'Add a photo or write something.' });
  if (kind === 'beforeafter' && (req.files || []).length !== 2) return res.status(400).json({ ok: false, error: 'Before & after needs exactly 2 photos: the before first, then the after.' });
  try {
    const photos = await savePhotos(req.files, title);
    if (kind === 'beforeafter') { photos[0].alt = (title || 'Project') + ', before'; photos[1].alt = (title || 'Project') + ', after'; }
    const info = db
      .prepare('INSERT INTO posts (kind, category, title, body, photos, pinned, show_date, sort) VALUES (?,?,?,?,?,?,1,?)')
      .run(kind, category, title || null, body || null, JSON.stringify(photos), b.pinned === '1' ? 1 : 0, topSort());
    res.json({ ok: true, post: out(getPost(info.lastInsertRowid)) });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message || 'Could not save the post.' });
  }
});

api.patch('/posts/:id', express.json({ limit: '16kb' }), (req, res) => {
  const p = getPost(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'not found' });
  const b = req.body || {};
  const set = {
    title: b.title !== undefined ? String(b.title).trim().slice(0, 140) || null : p.title,
    body: b.body !== undefined ? String(b.body).trim().slice(0, 2000) || null : p.body,
    category: b.category !== undefined ? (S.categories.includes(b.category) ? b.category : null) : p.category,
    pinned: b.pinned !== undefined ? (b.pinned ? 1 : 0) : p.pinned,
    hidden: b.hidden !== undefined ? (b.hidden ? 1 : 0) : p.hidden,
    sort: b.toTop ? topSort() : p.sort,
  };
  db.prepare('UPDATE posts SET title=@title, body=@body, category=@category, pinned=@pinned, hidden=@hidden, sort=@sort WHERE id=@id').run({ ...set, id: p.id });
  res.json({ ok: true, post: out(getPost(p.id)) });
});

api.delete('/posts/:id', (req, res) => {
  const p = getPost(req.params.id);
  if (!p) return res.json({ ok: false });
  removePhotos(JSON.parse(p.photos || '[]'));
  db.prepare('DELETE FROM posts WHERE id = ?').run(p.id);
  res.json({ ok: true });
});

router.use('/admin/api', api);
module.exports = router;
