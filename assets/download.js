/* Download page: starts the guide download, then shows the newsletter offer.
   Only files in this site's guides/ folder are accepted, so the page can't be used to send
   people to another site or run a script (the old page accepted any address). */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function init() {
    var params = new URLSearchParams(window.location.search);
    var raw = params.get("file") || "";
    var m = /^(?:https:\/\/guides\.cybersafetyguy\.com)?\/?(guides\/[A-Za-z0-9_.\-]+\.pdf)$/.exec(raw);
    var file = m ? "/" + m[1] : null;
    var name = (params.get("name") || "").slice(0, 120) || "Online safety guide";
    $("dl-name").textContent = name;
    if (name) document.title = name + " | Download | Cyber Safety Guy";

    if (!file) {
      $("dl-eyebrow").textContent = "Something went wrong";
      $("dl-title").textContent = "We couldn't find that guide";
      $("dl-name").textContent = "";
      $("dl-where").textContent = "The link may be broken. All the guides are on the guides page.";
      $("dl-manual").hidden = true;
      $("dl-icon").hidden = true;
      return;
    }
    var link = $("dl-link");
    link.href = file;
    link.setAttribute("download", "");

    var bar = $("dl-bar"), pct = 0;
    var t = setInterval(function () { pct = Math.min(pct + 4, 100); bar.style.width = pct + "%"; if (pct >= 100) clearInterval(t); }, 100);

    setTimeout(function () {
      var a = document.createElement("a");
      a.href = file;
      a.setAttribute("download", "");
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        $("dl-eyebrow").textContent = "Download complete";
        $("dl-title").textContent = "Check your Downloads folder";
        $("dl-where").textContent = "It's a PDF, so it opens on any phone, tablet or computer.";
      }, 1000);
    }, 800);
  }
  if (document.readyState !== "loading") init(); else document.addEventListener("DOMContentLoaded", init);
})();
