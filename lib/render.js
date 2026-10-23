// Server-rendered pages for the Feed template: the profile + post feed, and single-post share pages.
const S = require('./site');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const photosOf = (p) => { try { return JSON.parse(p.photos) || []; } catch (e) { return []; } };
const when = (p) => {
  if (!p.show_date) return '';
  const d = new Date(String(p.created_at).replace(' ', 'T') + 'Z');
  return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
};

const ICON = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>',
  text: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z"/></svg>',
  fb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 22v-8.2h2.8l.5-3.3h-3.3V8.4c0-.9.4-1.7 1.8-1.7h1.6V3.8s-1.4-.3-2.8-.3c-2.8 0-4.5 1.7-4.5 4.7v2.3H6.7v3.3h2.9V22h3.9z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3l7 7-3 1-4 4 1 5-2 1-4-5-5 5-1-1 5-5-5-4 1-2 5 1 4-4z"/></svg>',
};

function head({ title, desc, url, image }) {
  const site = S.siteUrl();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#0d0d0c">
<link rel="icon" type="image/png" href="/img/favicon.png">
<link rel="canonical" href="${esc(site + url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(S.legal)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(site + url)}">
<meta property="og:image" content="${esc(site + image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/feed.css">
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: S.legal,
    slogan: S.tagline,
    description: S.bio,
    telephone: S.phoneHref,
    email: S.email,
    url: site + '/',
    image: site + '/img/og.jpg',
    areaServed: ['New Hampshire', 'Maine', 'Massachusetts'],
    sameAs: [S.facebook],
  }).replace(/</g, '\\u003c')}</script>
</head>`;
}

function photoBlock(p) {
  const ph = photosOf(p);
  if (!ph.length) return '';
  if (p.kind === 'beforeafter' && ph.length >= 2) {
    return `<div class="ba" style="--pos:50%">
      <img src="${esc(ph[1].src)}" alt="${esc(ph[1].alt || 'After')}" loading="lazy">
      <div class="ba-before"><img src="${esc(ph[0].src)}" alt="${esc(ph[0].alt || 'Before')}" loading="lazy"></div>
      <span class="ba-tag ba-l">Before</span><span class="ba-tag ba-r">After</span>
      <span class="ba-line" aria-hidden="true"></span>
      <input type="range" min="0" max="100" value="50" aria-label="Drag to compare before and after">
    </div>`;
  }
  const n = Math.min(ph.length, 4);
  const more = ph.length - 4;
  return `<div class="ph ph-${n}">${ph
    .slice(0, 4)
    .map(
      (x, i) =>
        `<button type="button" class="ph-i" data-lb="${i}" aria-label="View photo ${i + 1} of ${ph.length}"><img src="${esc(x.src)}" alt="${esc(x.alt || p.title || '')}" loading="lazy">${i === 3 && more > 0 ? `<span class="more">+${more}</span>` : ''}</button>`
    )
    .join('')}</div>`;
}

function postCard(p, opts = {}) {
  const ph = photosOf(p);
  const meta = [p.category, when(p)].filter(Boolean).join(' · ');
  const by = `<header class="post-head">
      <img class="av" src="/img/avatar.jpg" alt="" width="40" height="40">
      <div><b>${esc(S.name)}</b><span>${esc(meta || S.category)}</span></div>
      ${p.pinned ? `<span class="pin">${ICON.pin}Pinned</span>` : ''}
    </header>`;
  const data = `data-cat="${esc(p.category || '')}" data-kind="${esc(p.kind)}" data-photos="${esc(JSON.stringify(ph))}"`;

  if (p.kind === 'follow') {
    return `<article class="post post-follow" id="post-${p.id}" ${data}>
      ${by}
      <p class="follow-big">See new jobs first.</p>
      <p>Fresh installs and job-site updates go up on Facebook as we work.</p>
      <a class="btn btn-gold" href="${esc(S.facebook)}" target="_blank" rel="noopener" data-social="facebook">${ICON.fb}Follow on Facebook · ${esc(S.facebookFollowers)}</a>
    </article>`;
  }
  if (p.kind === 'note') {
    return `<article class="post post-note${p.pinned ? ' is-pinned' : ''}" id="post-${p.id}" ${data}>
      ${by}
      ${p.title ? `<h2 class="note-title">${esc(p.title)}</h2>` : ''}
      ${p.body ? `<p class="post-body">${esc(p.body)}</p>` : ''}
      ${photoBlock(p)}
      ${p.pinned ? `<div class="note-acts"><a class="btn btn-gold" href="#estimate" data-quote>Get a free estimate</a><a class="btn btn-line" href="tel:${S.phoneHref}">${ICON.phone}Call ${esc(S.phone)}</a></div>` : ''}
    </article>`;
  }
  return `<article class="post post-${esc(p.kind)}" id="post-${p.id}" ${data}>
    ${by}
    ${p.title ? `<h2 class="post-title">${opts.single ? esc(p.title) : `<a href="/p/${p.id}">${esc(p.title)}</a>`}</h2>` : ''}
    ${p.body ? `<p class="post-body">${esc(p.body)}</p>` : ''}
    ${photoBlock(p)}
    <footer class="post-acts">
      <a class="act act-want" href="#estimate" data-want="${esc(p.title || 'this project')}" data-quote>Get this look</a>
      <button type="button" class="act" data-share="/p/${p.id}" data-title="${esc(p.title || S.name)}">Share</button>
      ${ph.length > 1 && p.kind !== 'beforeafter' ? `<span class="count">${ph.length} photos</span>` : ''}
    </footer>
  </article>`;
}

function estimateForm() {
  return `<form class="est" id="estForm" novalidate>
    <p class="est-k">Free estimate</p>
    <h2>Tell us about your project.</h2>
    <div class="hp" aria-hidden="true"><label>Company <input type="text" name="company" tabindex="-1" autocomplete="off"></label></div>
    <input type="hidden" name="source" id="srcField">
    <input type="hidden" name="ref_post" id="refPost">
    <p class="ref" id="refNote" hidden></p>
    <label>Name *<input name="name" autocomplete="name" required></label>
    <label>Phone *<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required></label>
    <label>Email<input name="email" type="email" autocomplete="email"></label>
    <label>Town<input name="town" autocomplete="address-level2"></label>
    <label>Project
      <select name="project_type"><option value="">Choose one</option>${S.projectTypes.map((t) => `<option>${esc(t)}</option>`).join('')}</select>
    </label>
    <label>Timing
      <select name="timeline"><option value="">Choose one</option><option>As soon as possible</option><option>In the next 1–3 months</option><option>3+ months out</option><option>Just planning</option></select>
    </label>
    <label>Details<textarea name="details" rows="3" placeholder="Room, size, tile you like, anything we should know"></textarea></label>
    <fieldset class="pref"><legend>Best way to reach you</legend>
      <label><input type="radio" name="contact_pref" value="Call" checked> Call</label>
      <label><input type="radio" name="contact_pref" value="Text"> Text</label>
      <label><input type="radio" name="contact_pref" value="Email"> Email</label>
    </fieldset>
    <button class="btn btn-gold btn-full" type="submit" id="estBtn">Send my request</button>
    <p class="form-msg" id="estMsg" role="status" aria-live="polite"></p>
    <p class="est-alt">Or call / text <a href="tel:${S.phoneHref}">${esc(S.phone)}</a></p>
  </form>`;
}

function shell({ title, desc, url, image, feed, single }) {
  const chips = ['All', ...S.categories].map((c, i) => `<button type="button" class="chip${i === 0 ? ' on' : ''}" data-filter="${esc(c === 'All' ? '' : c)}">${esc(c)}</button>`).join('');
  return `${head({ title, desc, url, image })}
<body>
<header class="bar">
  <a class="bar-brand" href="/" aria-label="${esc(S.name)} home"><img src="/img/logo-mark.png" alt="" width="20" height="31"><span>${esc(S.name)}</span></a>
  <nav class="bar-nav" aria-label="Main">
    <a href="/#feed">Work</a>
    <a href="/#estimate" data-quote>Estimate</a>
    <a href="${esc(S.facebook)}" target="_blank" rel="noopener" data-social="facebook" aria-label="${esc(S.name)} on Facebook" class="bar-fb">${ICON.fb}</a>
    <a class="bar-call" href="tel:${S.phoneHref}">${ICON.phone}<span>${esc(S.phone)}</span></a>
  </nav>
</header>

<div class="cover" aria-hidden="true"><img src="/img/cover.jpg" alt=""></div>

<div class="layout">
  <aside class="profile" aria-label="About ${esc(S.name)}">
    <img class="avatar" src="/img/avatar.jpg" alt="${esc(S.legal)} logo" width="240" height="240">
    <h1>${esc(S.legal)}</h1>
    <p class="cat">${esc(S.category)} · <span>${esc(S.areaShort)}</span></p>
    <p class="tag">${esc(S.tagline)}</p>
    <ul class="stats">
      <li><b>${esc(S.facebookFollowers)}</b><span>Facebook followers</span></li>
      <li><b>3</b><span>States served</span></li>
      <li><b>Free</b><span>Estimates</span></li>
    </ul>
    <div class="acts">
      <a class="btn btn-gold" href="#estimate" data-quote>Get an estimate</a>
      <a class="btn btn-line" href="tel:${S.phoneHref}">${ICON.phone}Call</a>
      <a class="btn btn-line" href="sms:${S.phoneHref}">${ICON.text}Text</a>
    </div>
    <p class="bio">${esc(S.bio)}</p>
    <dl class="facts">
      <div><dt>Phone</dt><dd><a href="tel:${S.phoneHref}">${esc(S.phone)}</a></dd></div>
      <div><dt>Email</dt><dd><a href="mailto:${esc(S.email)}">${esc(S.email)}</a></dd></div>
      <div><dt>Serving</dt><dd>${esc(S.area)}</dd></div>
      <div><dt>Facebook</dt><dd><a href="${esc(S.facebook)}" target="_blank" rel="noopener" data-social="facebook">Locked &amp; Level LLC</a></dd></div>
    </dl>
  </aside>

  <main class="feed" id="feed" aria-label="Recent work">
    ${single ? `<p class="back"><a href="/">← All of our work</a></p>` : `<nav class="chips" aria-label="Filter work">${chips}</nav>`}
    ${feed}
    ${single ? `<p class="back"><a class="btn btn-line" href="/">See all of our work</a></p>` : ''}
    <p class="feed-end" id="feedEnd" hidden>Nothing here yet. <button type="button" class="link" data-filter="">Show everything</button></p>
  </main>

  <aside class="side" id="estimate" aria-label="Request a free estimate">
    ${estimateForm()}
  </aside>
</div>

<footer class="foot">
  <div class="foot-in">
    <img src="/img/logo-mark.png" alt="" width="26" height="40">
    <p><b>${esc(S.legal)}</b><br>${esc(S.tagline)}<br>${esc(S.category)} across ${esc(S.area.replace(/ · /g, ', ').replace(/, ([^,]*)$/, ' and $1'))}.</p>
    <p><a href="tel:${S.phoneHref}">${esc(S.phone)}</a><br><a href="mailto:${esc(S.email)}">${esc(S.email)}</a><br><a href="${esc(S.facebook)}" target="_blank" rel="noopener" data-social="facebook">Facebook</a></p>
  </div>
  <div class="foot-bar"><span>© ${new Date().getFullYear()} ${esc(S.legal)}</span><a class="credit" href="https://getrealeasysites.com" target="_blank" rel="noopener">Website by Real Easy Sites</a></div>
</footer>

<nav class="dock" aria-label="Quick contact">
  <a href="tel:${S.phoneHref}">${ICON.phone}Call</a>
  <a href="sms:${S.phoneHref}">${ICON.text}Text</a>
  <a class="dock-go" href="#estimate" data-quote>Free estimate</a>
</nav>

<div class="lightbox" id="lightbox" hidden>
  <button class="lb-x" id="lbClose" aria-label="Close">×</button>
  <button class="lb-nav lb-prev" id="lbPrev" aria-label="Previous photo">‹</button>
  <img id="lbImg" alt="">
  <button class="lb-nav lb-next" id="lbNext" aria-label="Next photo">›</button>
  <p id="lbCap"></p>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script src="/js/track.js" defer></script>
<script src="/js/feed.js" defer></script>
</body>
</html>`;
}

function homePage(posts) {
  return shell({
    title: `${S.legal} | Custom Tile & Remodeling in NH, ME & MA`,
    desc: 'Custom tile showers, floors, backsplashes and bathroom remodels across New Hampshire, Maine and Massachusetts. See our latest work and request a free estimate.',
    url: '/',
    image: '/img/og.jpg',
    feed: posts.map((p) => postCard(p)).join('\n'),
  });
}

function postPage(p) {
  const ph = photosOf(p);
  return shell({
    title: `${p.title || 'Recent work'} | ${S.legal}`,
    desc: (p.body || S.bio).slice(0, 180),
    url: '/p/' + p.id,
    image: ph[0] ? ph[0].src : '/img/og.jpg',
    feed: postCard(p, { single: true }),
    single: true,
  });
}

module.exports = { homePage, postPage, photosOf, esc };
