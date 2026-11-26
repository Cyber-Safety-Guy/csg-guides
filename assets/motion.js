/* Gentle motion for the home pages (Dale, 25 Nov 2026). See motion.css. No libraries, no tracking. */
(function () {
  'use strict';
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js');
  var SEL = 'main .tool, main .featured, main .band, main .card, .series-card, .pack-card, .section-head, .stat, main section > h2, .pres-card, .social-card, .tcard';
  var born = Date.now(), io = new IntersectionObserver(function (entries) {
    var batch = entries.filter(function (e) { return e.isIntersecting; });
    batch.forEach(function (e, k) { e.target.style.setProperty('--d', Math.min(k, 6) * 0.09 + 's'); e.target.classList.add('mo-in'); io.unobserve(e.target); });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  function tag(root) {
    (root.querySelectorAll ? root.querySelectorAll(SEL) : []).forEach(function (el) {
      if (el.classList.contains('mo-rv') || el.closest('[hidden]')) return;
      el.classList.add('mo-rv');
      if (Date.now() - born > 3000) el.classList.add('mo-in'); /* cards redrawn by a filter appear at once */
      else io.observe(el);
    });
  }
  tag(document);
  new MutationObserver(function (muts) {
    muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.matches && n.matches(SEL)) tag({ querySelectorAll: function () { return [n]; } }); tag(n); } }); });
  }).observe(document.body, { childList: true, subtree: true });
  /* numbers count up once, the first time they are seen */
  var NUM = document.querySelectorAll('.stat-num:not([id])');
  function count(b) {
    var m = /^(\d+)(.*)$/.exec(b.textContent.trim()); if (!m) return;
    var end = +m[1], suffix = m[2], t0 = null;
    b.style.minWidth = b.offsetWidth + 'px';
    function step(t) { if (!t0) t0 = t; var p = Math.min((t - t0) / 1100, 1), e = 1 - Math.pow(1 - p, 3);
      b.textContent = Math.round(end * e) + suffix; if (p < 1) requestAnimationFrame(step); else b.textContent = m[1] + suffix; }
    requestAnimationFrame(step);
  }
  var fo = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { count(e.target); fo.unobserve(e.target); } }); }, { threshold: 0.6 });
  NUM.forEach(function (b) { fo.observe(b); });
  /* soft light that follows the pointer on cards (mouse and trackpad only) */
  if (window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.tool, .featured, .series-card, .pack-card'); if (!c) return;
      var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }
})();

/* Visual effects (Dale, 26 Nov 2026), matching cybersafetyguy.com and the Academy. See motion.css.
   Every page gets the reading bar and card tilt; pages with a header block (home hero, tool pages, library, 404)
   also get the typing eyebrow, word-by-word heading, button shine, network background and parallax.
   Guide articles and the download page keep their header still. */
(function () {
  'use strict';
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var head = document.querySelector('.hero, .tool-head, .page-head, main.nf');

  /* reading bar along the top */
  var bar = document.createElement('div'); bar.className = 'mo-progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var max = root.scrollHeight - innerHeight;
      bar.style.setProperty('--p', max > 0 ? Math.min(scrollY / max, 1) : 0);
      if (head && !calm && scrollY < head.offsetHeight + 200) head.style.setProperty('--sy', scrollY);
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (calm) return;

  /* cards tilt toward the pointer (mouse and trackpad only; cards drawn later by filters included) */
  if (window.matchMedia('(hover: hover)').matches) {
    var CARDS = '.tool:not(.soon), .featured, .series-card, .pack-card, .card.guide, .related a.card, .pres-card, .social-card, .tcard', last = null;
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest(CARDS);
      if (last && last !== c) { last.style.setProperty('--rx', '0deg'); last.style.setProperty('--ry', '0deg'); }
      last = c; if (!c) return;
      var r = c.getBoundingClientRect(), max = r.width > 520 ? 3 : 7;
      var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.setProperty('--ry', (x * max * 2).toFixed(2) + 'deg'); c.style.setProperty('--rx', (-y * max * 2).toFixed(2) + 'deg');
    }, { passive: true });
  }
  if (!head) return;
  head.classList.add('fx-head');

  /* eyebrow types itself out */
  var k = head.querySelector('.eyebrow');
  if (k && !k.children.length) {
    var full = k.textContent; k.setAttribute('aria-label', full); k.classList.add('typing');
    var txt = document.createElement('span'); txt.setAttribute('aria-hidden', 'true');
    var caret = document.createElement('span'); caret.className = 'caret'; caret.setAttribute('aria-hidden', 'true');
    k.textContent = ''; k.appendChild(txt); k.appendChild(caret);
    var n = 0;
    (function type() { txt.textContent = full.slice(0, ++n); if (n < full.length) setTimeout(type, 45); else setTimeout(function () { caret.remove(); }, 2400); })();
  }

  /* heading appears word by word (keeps the highlighted words' styling) */
  var h1 = head.querySelector('h1');
  if (h1) {
    var label = h1.textContent.replace(/\s+/g, ' ').trim(), i = 0, parts = [];
    Array.prototype.slice.call(h1.childNodes).forEach(function (node) {
      if (node.nodeType === 3) node.textContent.split(/(\s+)/).forEach(function (t) { if (t) parts.push(t); });
      else parts.push(node);
    });
    h1.setAttribute('aria-label', label); h1.classList.add('split'); h1.textContent = '';
    parts.forEach(function (p) {
      if (typeof p === 'string' && /^\s+$/.test(p)) { h1.appendChild(document.createTextNode(' ')); return; }
      var s = document.createElement('span'); s.className = 'w'; s.setAttribute('aria-hidden', 'true'); s.style.setProperty('--i', i++);
      if (typeof p === 'string') s.textContent = p; else s.appendChild(p);
      h1.appendChild(s);
    });
  }

  /* network of drifting points behind the header */
  var cv = document.createElement('canvas'); cv.className = 'hero-net'; cv.setAttribute('aria-hidden', 'true');
  head.insertBefore(cv, head.firstChild);
  var ctx = cv.getContext('2d'), pts = [], W = 0, H = 0, mouse = null, running = false, visible = true;
  function rgb() {
    var h = getComputedStyle(root).getPropertyValue('--accent').trim().replace('#', '');
    var v = /^[0-9a-f]+$/i.test(h) && h.length === 6 ? parseInt(h, 16) : 0x1FD0DC;
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255].join(',');
  }
  var col = rgb();
  function size() {
    var dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var want = Math.min(Math.round(W * H / 13000), W < 600 ? 34 : 72);
    while (pts.length < want) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35 });
    pts.length = want;
  }
  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    var link = W < 600 ? 95 : 130;
    for (var a = 0; a < pts.length; a++) {
      var p = pts[a]; p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
      for (var b = a + 1; b < pts.length; b++) {
        var q = pts[b], dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < link) { ctx.strokeStyle = 'rgba(' + col + ',' + (0.22 * (1 - d / link)).toFixed(3) + ')'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
      }
      if (mouse) { var mx = p.x - mouse.x, my = p.y - mouse.y, md = Math.sqrt(mx * mx + my * my);
        if (md < 170) { ctx.strokeStyle = 'rgba(' + col + ',' + (0.45 * (1 - md / 170)).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); } }
      ctx.fillStyle = 'rgba(' + col + ',.55)'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, 6.283); ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  function setRun() { var go = visible && !document.hidden; if (go && !running) { running = true; requestAnimationFrame(frame); } else if (!go) running = false; }
  size(); cv.classList.add('on');
  addEventListener('resize', size);
  document.addEventListener('visibilitychange', setRun);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; setRun(); }).observe(head);
  new MutationObserver(function () { col = rgb(); }).observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  head.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; });
  head.addEventListener('pointerleave', function () { mouse = null; });
  setRun();
})();
