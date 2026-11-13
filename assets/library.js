/* Guide library: renders guides.json into the topic sections, with search, topic chips,
   copy-link buttons and a "not covered yet" request form (Formspree). Built with DOM methods,
   never innerHTML, so guide text is always treated as text. */
(function () {
  "use strict";
  var CATS = ["platform-guides", "online-risks", "parental-controls", "further-resources"];
  var guides = [];
  var cards = [];          // { el, cat, text }
  var activeCat = "";

  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function pdfPath(link) {
    // guides.json holds full URLs or site paths; the download page takes a guides/ path
    var m = /(?:^|\/)(guides\/[A-Za-z0-9_.\-]+\.pdf)$/.exec(link || "");
    return m ? m[1] : null;
  }
  function downloadHref(g) {
    var p = pdfPath(g.link);
    if (!p) return g.link;
    return "/download?" + new URLSearchParams({ file: p, name: g.title }).toString();
  }
  function absoluteLink(g) {
    var p = pdfPath(g.link);
    return p ? "https://guides.cybersafetyguy.com/" + p : g.link;
  }

  function card(g) {
    var art = el("article", { "class": "card guide" });
    var imgWrap = el("div", { "class": "guide-img" });
    if (g.image) {
      var img = el("img", { src: "/images/thumbs/" + g.image.replace(/\.[a-z]+$/i, ".webp"), alt: "", loading: "lazy", width: "560", height: "840" });
      imgWrap.appendChild(img);
    }
    if (g.isNew) imgWrap.appendChild(el("span", { "class": "pill pill-new" }, "New"));
    art.appendChild(imgWrap);

    var body = el("div", { "class": "guide-body" });
    var h = el("h3");
    // Guides with their own web page (guides.json "page") open it; the PDF is one click away
    var a = g.page ? el("a", { href: g.page }, g.title) : el("a", { href: downloadHref(g), target: "_blank", rel: "noopener" }, g.title);
    h.appendChild(a);
    body.appendChild(h);
    if (g.ageRating) {
      var tags = el("div", { "class": "tags" });
      tags.appendChild(el("span", { "class": "pill" }, "Age rating " + g.ageRating));
      body.appendChild(tags);
    }
    body.appendChild(el("p", {}, g.desc || ""));
    var actions = el("div", { "class": "guide-actions" });
    if (g.page) {
      actions.appendChild(el("a", { "class": "btn btn-primary btn-small", href: g.page, "aria-label": "Read the " + g.title + " guide" }, "Read the guide"));
      actions.appendChild(el("a", { "class": "copy-btn", href: downloadHref(g), target: "_blank", rel: "noopener", "aria-label": "Download the " + g.title + " PDF", style: "display:inline-flex;align-items:center;text-decoration:none" }, "PDF"));
    } else {
      actions.appendChild(el("a", { "class": "btn btn-primary btn-small", href: downloadHref(g), target: "_blank", rel: "noopener", "aria-label": "Open the " + g.title + " guide" }, "Open the guide"));
    }
    var copy = el("button", { type: "button", "class": "copy-btn", "aria-label": "Copy the link to the " + g.title + " guide" }, "Copy link");
    copy.addEventListener("click", function () {
      var url = absoluteLink(g);
      var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy link"; }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt("Copy this link:", url); });
      else window.prompt("Copy this link:", url);
    });
    actions.appendChild(copy);
    body.appendChild(actions);
    art.appendChild(body);
    return art;
  }

  function normalise(s) { return (s || "").toLowerCase().replace(/[^a-z0-9+ ]/g, " ").replace(/\s+/g, " ").trim(); }

  function apply() {
    var q = normalise($("guide-search").value);
    var shown = 0;
    cards.forEach(function (c) {
      var ok = (!activeCat || c.cat === activeCat) && (!q || c.text.indexOf(q) !== -1 || q.replace(/ /g, "").indexOf(c.key) !== -1);
      c.el.hidden = !ok;
      if (ok) shown++;
    });
    CATS.forEach(function (cat) {
      var sec = document.querySelector('.cat[data-cat="' + cat + '"]');
      if (!sec) return;
      var any = cards.some(function (c) { return c.cat === cat && !c.el.hidden; });
      sec.hidden = !any;
    });
    var note = $("result-note");
    var nc = $("not-covered");
    if (!q && !activeCat) { note.textContent = ""; nc.hidden = true; return; }
    note.textContent = shown === 1 ? "1 guide matches." : shown + " guides match.";
    if (q && shown === 0) {
      var raw = $("guide-search").value.trim();
      $("not-covered-title").textContent = raw;
      $("quick-app").value = raw;
      $("quick-subject").value = "Guide Request: " + raw;
      $("quick-request").hidden = false;
      $("quick-sent").hidden = true;
      nc.hidden = false;
      note.textContent = "No guide matches that yet.";
    } else {
      nc.hidden = true;
    }
  }

  function sendForm(form, sentEl) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) {
          if (!r.ok) throw new Error("not ok");
          form.hidden = true;
          sentEl.textContent = "Thank you, that's on my list.";
          sentEl.hidden = false;
        })
        .catch(function () {
          sentEl.textContent = "Sorry, that didn't send. Please try again in a moment.";
          sentEl.hidden = false;
          if (btn) btn.disabled = false;
        });
    });
  }

  function init() {
    fetch("/guides.json").then(function (r) { return r.json(); }).then(function (items) {
      guides = items.filter(function (i) { return i.type === "guide"; });
      var total = $("total-line");
      if (total) total.textContent = "There are " + guides.length + " to choose from.";
      guides.forEach(function (g) {
        var grid = $("grid-" + g.id);
        if (!grid) return;   // e.g. the Complete Parent's Guide, shown as the featured card
        if (!grid.dataset.fresh) { grid.textContent = ""; grid.dataset.fresh = "1"; }  // replace the build-time cards
        var c = card(g);
        grid.appendChild(c);
        cards.push({ el: c, cat: g.id, key: normalise(g.title).replace(/ /g, ""),
          text: normalise([g.title, g.desc, [].concat(g.risks || []).join(" "), [].concat(g.topics || []).join(" ")].join(" ")) });
      });
      apply();
    }).catch(function () {
      $("result-note").textContent = "Sorry, the guide list didn't load. Please refresh the page.";
    });

    $("guide-search").addEventListener("input", apply);
    Array.prototype.forEach.call(document.querySelectorAll(".chip"), function (b) {
      b.addEventListener("click", function () {
        activeCat = b.getAttribute("data-cat") || "";
        Array.prototype.forEach.call(document.querySelectorAll(".chip"), function (x) {
          x.setAttribute("aria-pressed", String(x === b));
        });
        apply();
      });
    });
    sendForm($("quick-request"), $("quick-sent"));
    sendForm($("request"), $("request-sent"));
  }

  if (document.readyState !== "loading") init(); else document.addEventListener("DOMContentLoaded", init);
})();
