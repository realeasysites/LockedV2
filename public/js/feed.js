(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var toastT;
  function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 2200); }

  // filter chips
  var posts = $$('.post');
  function filter(cat) {
    $$('.chip').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-filter') === cat); });
    var shown = 0;
    posts.forEach(function (p) {
      var kind = p.getAttribute('data-kind'), pc = p.getAttribute('data-cat');
      var show = !cat || ((kind === 'job' || kind === 'beforeafter') && pc === cat);
      p.hidden = !show; if (show) shown++;
    });
    var end = $('#feedEnd'); if (end) end.hidden = shown > 0;
    if (cat && window.scrollY > $('#feed').offsetTop) $('#feed').scrollIntoView({ behavior: 'smooth' });
  }
  $$('[data-filter]').forEach(function (b) { b.addEventListener('click', function () { filter(b.getAttribute('data-filter')); }); });

  // before / after sliders
  $$('.ba').forEach(function (ba) {
    var r = $('input', ba);
    r.addEventListener('input', function () { ba.style.setProperty('--pos', r.value + '%'); });
  });

  // lightbox per post
  var lb = $('#lightbox'), img = $('#lbImg'), cap = $('#lbCap'), set = [], idx = 0, last = null;
  function show(i) { idx = (i + set.length) % set.length; img.src = set[idx].src; img.alt = set[idx].alt || ''; cap.textContent = set[idx].alt || ''; $('#lbPrev').hidden = $('#lbNext').hidden = set.length < 2; }
  $$('.ph-i').forEach(function (b) {
    b.addEventListener('click', function () {
      try { set = JSON.parse(b.closest('.post').getAttribute('data-photos')); } catch (e) { set = []; }
      if (!set.length) return;
      last = b; show(Number(b.getAttribute('data-lb'))); lb.hidden = false; $('#lbClose').focus();
    });
  });
  function close() { lb.hidden = true; img.src = ''; if (last) last.focus(); }
  $('#lbClose').addEventListener('click', close);
  $('#lbPrev').addEventListener('click', function () { show(idx - 1); });
  $('#lbNext').addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1);
  });

  // share a post
  $$('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () {
      var url = location.origin + b.getAttribute('data-share'), title = b.getAttribute('data-title');
      if (window.saTrack) window.saTrack('social', 'share post');
      if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { toast('Link copied'); }, function () { window.prompt('Copy this link:', url); });
    });
  });

  // "Get this look" pre-fills the estimate form with the post
  var ref = $('#refPost'), note = $('#refNote');
  function setRef(t) {
    ref.value = t || '';
    if (t) { note.innerHTML = ''; note.appendChild(document.createTextNode('About: ' + t)); var x = document.createElement('button'); x.type = 'button'; x.className = 'link'; x.textContent = 'remove'; x.onclick = function () { setRef(''); }; note.appendChild(x); }
    note.hidden = !t;
  }
  $$('[data-want]').forEach(function (a) {
    a.addEventListener('click', function () {
      setRef(a.getAttribute('data-want'));
      setTimeout(function () { var n = $('#estForm input[name=name]'); if (n) n.focus({ preventScroll: true }); }, 500);
    });
  });

  // estimate form
  var form = $('#estForm'), msg = $('#estMsg'), btn = $('#estBtn');
  var q = new URLSearchParams(location.search), src = q.get('utm_source') || q.get('ref') || '';
  try { if (!src && document.referrer && new URL(document.referrer).host !== location.host) src = new URL(document.referrer).hostname; } catch (e) {}
  $('#srcField').value = src || 'direct';
  function say(t, ok) { msg.className = 'form-msg ' + (ok ? 'ok' : 'err'); msg.textContent = t; }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = {}; new FormData(form).forEach(function (v, k) { d[k] = v; });
    if (!String(d.name || '').trim()) { say('Please add your name.'); return; }
    if (String(d.phone || '').replace(/\D/g, '').length < 7) { say('Please add a phone number.'); return; }
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch('/api/estimate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok) { form.reset(); setRef(''); say('Got it! We’ll be in touch soon.', true); if (window.saTrack) window.saTrack('quote_click', 'submitted'); }
        else say((res.j && res.j.error) || 'Something went wrong. Please call or text us.');
      })
      .catch(function () { say('Could not send. Please call or text us.'); })
      .then(function () { btn.disabled = false; btn.textContent = 'Send my request'; });
  });
})();
