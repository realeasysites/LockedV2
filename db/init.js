const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'site.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    town TEXT,
    project_type TEXT,
    timeline TEXT,
    contact_pref TEXT,
    details TEXT,
    ref_post TEXT,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

  CREATE TABLE IF NOT EXISTS sa_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL DEFAULT (datetime('now')),
    visitor TEXT NOT NULL,
    type TEXT NOT NULL,
    path TEXT,
    source TEXT,
    device TEXT,
    label TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sa_ts ON sa_events(ts);

  -- The feed: every job, note or before/after the owner posts
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    kind TEXT NOT NULL DEFAULT 'job',      -- job | note | beforeafter | follow
    category TEXT,
    title TEXT,
    body TEXT,
    photos TEXT NOT NULL DEFAULT '[]',     -- JSON [{src, alt}]
    pinned INTEGER NOT NULL DEFAULT 0,
    hidden INTEGER NOT NULL DEFAULT 0,
    show_date INTEGER NOT NULL DEFAULT 1,
    sort INTEGER NOT NULL DEFAULT 0
  );
`);

// Starter feed built from Locked & Level's own job photos. Seeded posts show no date
// (we don't know when each job happened); posts made from the dashboard show their date.
if (process.env.SEED_POSTS !== 'false' && db.prepare('SELECT COUNT(*) n FROM posts').get().n === 0) {
  const P = (src, alt) => ({ src: '/img/work/' + src + '.jpg', alt });
  const seed = [
    { kind: 'note', pinned: 1, title: 'Free estimates across New England', body: 'Showers, floors, backsplashes and full bathroom remodels in New Hampshire, Maine and Massachusetts. Send a few details and we’ll reach out to talk about your project.' },
    { kind: 'job', category: 'Baths', title: 'Black marble primary bath', body: 'Floor-to-ceiling large-format black marble-look tile, a freestanding tub and a floating double vanity. Every line runs true wall to wall.', photos: [P('bath-black-marble-tub', 'Black marble-look tile bathroom with a freestanding tub'), P('bath-black-marble-vanity', 'Floating vanity against black marble-look tile'), P('bath-black-marble-wall', 'Black marble-look tile walls and floor around the toilet')] },
    { kind: 'beforeafter', category: 'Baths', title: 'Before & after', body: 'An outdated bath taken down to the studs and rebuilt clean, bright and modern. Drag the line to compare.', photos: [P('before', 'Bathroom before the remodel'), P('after', 'Bathroom after the remodel')] },
    { kind: 'job', category: 'Showers', title: 'River stone and wood-look plank shower', body: 'A full river-stone feature wall paired with wood-look plank tile. Natural texture without the upkeep of real wood.', photos: [P('shower-pebble', 'Shower with a river stone feature wall and wood-look plank tile')] },
    { kind: 'job', category: 'Floors', title: 'Penny round with a flower pattern', body: 'White penny round with a blue flower pattern laid in by hand. Small tile, tight lines, no shortcuts.', photos: [P('floor-penny-round', 'White penny round floor with blue flower pattern'), P('tub-surround-white', 'White subway tub surround with patterned mosaic floor')] },
    { kind: 'note', title: 'Not just installed. Engineered to perfection.', body: 'Laser precise alignment. Millimeter accuracy. Luxury finishes. Built on skill, driven by pride.' },
    { kind: 'job', category: 'Kitchens', title: 'Kitchen backsplashes', body: 'The detail that ties a kitchen together, cut and set clean around every outlet, window and cabinet edge.', photos: [P('backsplash-mosaic', 'Glass mosaic kitchen backsplash under a window'), P('kitchen-island', 'Kitchen with white cabinets and tile backsplash'), P('kitchen-white', 'Open kitchen with herringbone backsplash')] },
    { kind: 'job', category: 'Showers', title: 'Showers, start to finish', body: 'Niches, benches, mosaic accent walls and large-format tile. Including a heated floor going in before the tile goes down.', photos: [P('shower-mosaic-wall', 'Shower with a glass mosaic accent wall'), P('shower-large-format', 'Shower with large-format tile and recessed niche during leveling'), P('shower-heated-floor', 'Shower with heated floor system installed before tile'), P('shower-niche', 'Finished shower with niche and pebble floor')] },
    { kind: 'job', category: 'Floors', title: 'Pattern floors', body: 'Encaustic-look cement pattern tile and terracotta hex, each laid out so the pattern lands right at every doorway.', photos: [P('floor-cement-pattern', 'Patterned cement-look tile floor'), P('floor-hex-terracotta', 'Terracotta hex floor with slate plank wainscot')] },
    { kind: 'job', category: 'Fireplaces & walls', title: 'Stone feature wall', body: 'A floor-to-ceiling stone-look surround that turns the fireplace into the focal point of the room.', photos: [P('stone-fireplace', 'Stone-look tile fireplace surround')] },
    { kind: 'job', category: 'Floors', title: 'Wood-look tile, wall to wall', body: 'All the warmth of a wood floor in a basement that can handle water. And the same plank on the walls of a shower.', photos: [P('floor-wood-look', 'Wood-look plank tile floor in a finished basement'), P('shower-wood-look', 'Shower walls in wood-look plank tile'), P('shower-basketweave', 'Basketweave mosaic shower floor')] },
    { kind: 'job', category: 'Baths', title: 'Vanity feature wall', body: 'Vertical stacked tile behind a double vanity, lit from above. A simple wall that changes the whole room.', photos: [P('vanity-feature-wall', 'Double vanity in front of a vertical stacked tile feature wall')] },
    { kind: 'follow' },
  ];
  const ins = db.prepare(
    'INSERT INTO posts (kind, category, title, body, photos, pinned, show_date, sort) VALUES (@kind,@category,@title,@body,@photos,@pinned,0,@sort)'
  );
  seed.forEach((p, i) =>
    ins.run({ kind: p.kind, category: p.category || null, title: p.title || null, body: p.body || null, photos: JSON.stringify(p.photos || []), pinned: p.pinned || 0, sort: (seed.length - i) * 10 })
  );
}

module.exports = db;
