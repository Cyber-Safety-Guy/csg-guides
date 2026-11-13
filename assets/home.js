/* Home page: live counts from guides.json (the numbers in the HTML are the fallback). */
(function () {
  "use strict";
  fetch("/guides.json").then(function (r) { return r.json(); }).then(function (items) {
    var guides = items.filter(function (i) { return i.type === "guide"; }).length;
    var pres = items.filter(function (i) { return i.type === "presentation"; }).length;
    var set = function (id, text) { var el = document.getElementById(id); if (el) el.textContent = text; };
    set("stat-guides", guides);
    set("stat-pres", pres);
    set("pill-guides", guides + " guides");
    set("pill-pres", pres + (pres === 1 ? " talk" : " talks"));
  }).catch(function () { /* keep the fallback numbers */ });
})();
