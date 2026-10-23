const express = require('express');
const db = require('../db/init');
const S = require('../lib/site');
const { sendLeadAlert, sendAutoReply } = require('../lib/mailer');
const { homePage, postPage } = require('../lib/render');

const router = express.Router();

/* ---------- pages ---------- */
const visible = () => db.prepare('SELECT * FROM posts WHERE hidden = 0 ORDER BY pinned DESC, sort DESC, id DESC').all();

router.get(['/', '/index.html'], (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.type('html').send(homePage(visible()));
});

router.get('/p/:id', (req, res, next) => {
  const p = db.prepare('SELECT * FROM posts WHERE id = ? AND hidden = 0').get(Number(req.params.id));
  if (!p || p.kind === 'follow') return next();
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.type('html').send(postPage(p));
});

router.get('/sitemap.xml', (req, res) => {
  const site = S.siteUrl();
  const urls = ['/'].concat(visible().filter((p) => p.kind === 'job' || p.kind === 'beforeafter').map((p) => '/p/' + p.id));
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${site}${u}</loc></url>`).join('\n') +
      `\n</urlset>\n`
  );
});

/* ---------- estimate requests ---------- */
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 6;
}
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

router.post('/api/estimate', (req, res) => {
  const b = req.body || {};
  if (b.company) return res.json({ ok: true });
  if (limited(req.ip)) return res.status(429).json({ ok: false, error: 'Too many requests. Please call or text us instead.' });
  const lead = {
    name: clean(b.name, 120),
    phone: clean(b.phone, 40),
    email: clean(b.email, 160),
    town: clean(b.town, 120),
    project_type: clean(b.project_type, 120),
    timeline: clean(b.timeline, 80),
    contact_pref: clean(b.contact_pref, 20),
    details: clean(b.details, 3000),
    ref_post: clean(b.ref_post, 160),
    source: clean(b.source, 200),
  };
  if (!lead.name || lead.phone.replace(/\D/g, '').length < 7) return res.status(400).json({ ok: false, error: 'Please add your name and a phone number.' });
  if (lead.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lead.email)) return res.status(400).json({ ok: false, error: 'That email address looks off.' });
  const info = db
    .prepare(
      `INSERT INTO leads (name, phone, email, town, project_type, timeline, contact_pref, details, ref_post, source)
       VALUES (@name,@phone,@email,@town,@project_type,@timeline,@contact_pref,@details,@ref_post,@source)`
    )
    .run(lead);
  db.prepare(`INSERT INTO sa_events (visitor, type, path, label) VALUES ('server','lead','/',?)`).run(String(info.lastInsertRowid));
  sendLeadAlert(lead).catch((e) => console.error('alert email failed:', e.message));
  sendAutoReply(lead).catch((e) => console.error('auto-reply failed:', e.message));
  res.json({ ok: true });
});

module.exports = router;
