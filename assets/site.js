/* guides.cybersafetyguy.com shared behaviour: theme (device setting or the visitor's choice,
   remembered on this device only), phone menu. No tracking, nothing leaves the device.
   Loaded in <head> without defer so the theme is set before the page paints. */
(function () {
  "use strict";
  var KEY = "csg_guides_theme";
  var root = document.documentElement;

  function systemTheme() {
    try { return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"; }
    catch (e) { return "dark"; }
  }
  function stored() {
    try { var v = window.localStorage.getItem(KEY); return v === "light" || v === "dark" ? v : null; }
    catch (e) { return null; }
  }
  root.setAttribute("data-theme", stored() || systemTheme());

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      var paint = function () {
        var dark = root.getAttribute("data-theme") === "dark";
        btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
        btn.setAttribute("aria-pressed", String(dark));
        var label = btn.querySelector(".tt-label");
        if (label) label.textContent = dark ? "Light" : "Dark";
        var sun = btn.querySelector(".i-sun"), moon = btn.querySelector(".i-moon");
        if (sun) sun.style.display = dark ? "" : "none";
        if (moon) moon.style.display = dark ? "none" : "";
      };
      btn.addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try {
          if (next === systemTheme()) window.localStorage.removeItem(KEY);  /* back to following the device */
          else window.localStorage.setItem(KEY, next);
        } catch (e) { /* storage blocked: works for this visit only */ }
        paint();
      });
      paint();
    }

    var menuBtn = document.getElementById("menu-toggle");
    var nav = document.getElementById("site-nav");
    if (menuBtn && nav) {
      menuBtn.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.classList.contains("open")) {
          nav.classList.remove("open");
          menuBtn.setAttribute("aria-expanded", "false");
          menuBtn.focus();
        }
      });
    }
  });
})();
