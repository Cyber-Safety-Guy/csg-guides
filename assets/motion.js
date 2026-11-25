/* Gentle motion for the home pages (Dale, 25 Nov 2026). See motion.css. No libraries, no tracking. */
(function () {
  'use strict';
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calm || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('js');
  var SEL = 'main .tool, main .featured, main .band, main .card, .series-card, .pack-card, .section-head, .stat, main section > h2';
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
