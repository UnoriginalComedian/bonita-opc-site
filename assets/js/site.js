/* Bonita OPC — site behaviour. Plain JS, no dependencies, no build step. */
(function () {
  "use strict";

  /* --- Theme -------------------------------------------------------------
     Three states: no stored value = follow the operating system;
     "light"/"dark" = the visitor chose, and their choice wins. */
  var root = document.documentElement;
  try {
    var stored = localStorage.getItem("bopc-theme");
    if (stored === "light" || stored === "dark") root.setAttribute("data-theme", stored);
  } catch (e) { /* private mode / blocked storage — fall through to system */ }

  function currentTheme() {
    var set = root.getAttribute("data-theme");
    if (set) return set;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  var themeBtn = document.querySelector(".theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      themeBtn.setAttribute("aria-label", next === "dark" ? "Switch to light theme" : "Switch to dark theme");
      try { localStorage.setItem("bopc-theme", next); } catch (e) {}
    });
  }

  /* --- Mobile navigation -------------------------------------------------- */
  var navToggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    // Close on escape, and whenever we grow past the mobile breakpoint.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.focus();
      }
    });
    window.matchMedia("(min-width: 961px)").addEventListener("change", function (m) {
      if (m.matches) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* --- Header shadow once scrolled ---------------------------------------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-stuck", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* --- Hero video: respect reduced motion ---------------------------------
     autoplay/loop on a <video> ignores prefers-reduced-motion on its own,
     so we pause it by hand and let the poster frame stand in as a still. */
  var heroVideo = document.getElementById("heroVideo");
  var heroReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (heroVideo && heroReducedMotion) {
    heroVideo.removeAttribute("autoplay");
    heroVideo.pause();
  }

  /* --- Hero lead image: Bible first, sanctuary footage rolls in second ----
     Reduced-motion visitors just keep the Bible image — no fade, nothing
     else to show them since the video is already paused above. */
  var heroLead = document.getElementById("heroLead");
  if (heroLead && !heroReducedMotion) {
    setTimeout(function () { heroLead.classList.add("is-hidden"); }, 5500);
  }

  /* --- Reveal on scroll ---------------------------------------------------- */
  var reveals = document.querySelectorAll(".reveal");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reveals.length && !reduced && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* --- Sermon archive filter ---------------------------------------------- */
  var filter = document.querySelector("[data-sermon-filter]");
  if (filter) {
    var rows = Array.prototype.slice.call(document.querySelectorAll("[data-sermon-row]"));
    var count = document.querySelector("[data-sermon-count]");
    var empty = document.querySelector("[data-sermon-empty]");

    var apply = function () {
      var q = filter.value.trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (row) {
        var hit = !q || row.textContent.toLowerCase().indexOf(q) !== -1;
        row.hidden = !hit;
        if (hit) shown++;
      });
      if (count) count.textContent = shown + (shown === 1 ? " sermon" : " sermons");
      if (empty) empty.hidden = shown !== 0;
    };
    filter.addEventListener("input", apply);
    apply();
  }

  /* --- Contact form fallback ------------------------------------------------
     Runs only while the form's action is still the unconfigured "#" (see the
     comment in contact.html). Once a real endpoint (Formspree, Netlify Forms,
     the church's CMS) is wired up, this hands off automatically because the
     action check fails and the browser's normal submit takes over. */
  var form = document.querySelector("form[data-fallback-email]");
  if (form && form.getAttribute("action") === "#") {
    var status = form.querySelector("[data-form-status]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var data = new FormData(form);
      var name = [data.get("first"), data.get("last")].filter(Boolean).join(" ");
      var subject = "Message from " + (name || "the Bonita OPC website");
      var lines = [
        "Name: " + name,
        "Email: " + (data.get("email") || ""),
        data.get("phone") ? "Phone: " + data.get("phone") : null,
        "",
        data.get("message") || ""
      ].filter(function (l) { return l !== null; });

      var to = form.getAttribute("data-fallback-email");
      var mailto = "mailto:" + encodeURIComponent(to) +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));

      window.location.href = mailto;

      if (status) {
        status.hidden = false;
        status.textContent = "Opening your email app to send this to us — if nothing opens, email " + to + " directly.";
      }
    });
  }

  /* --- Mark the current page in the nav ------------------------------------ */
  var here = location.pathname.replace(/index\.html$/, "").replace(/\/$/, "");
  document.querySelectorAll(".nav__link").forEach(function (a) {
    var target = a.getAttribute("href").replace(/index\.html$/, "").replace(/\/$/, "");
    if (target && target === here) a.setAttribute("aria-current", "page");
  });
})();
