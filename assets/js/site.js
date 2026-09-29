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

  /* --- Watch Live: show something real instead of "video unavailable" ------
     YouTube's live_stream embed just sits on an error-looking placeholder
     when nothing's live. Swap it for the channel's most recent upload
     outside the two Sunday windows, so there's always something to watch. */
  var liveFrame = document.getElementById("liveFrame");
  if (liveFrame) {
    var channel = liveFrame.getAttribute("data-channel");
    var windows = (liveFrame.getAttribute("data-sunday-windows") || "").split(",").map(function (w) {
      var parts = w.split("-");
      return { start: parts[0], end: parts[1] };
    });
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(new Date());
    var get = function (type) { return (parts.filter(function (p) { return p.type === type; })[0] || {}).value; };
    var isSunday = get("weekday") === "Sun";
    var nowMinutes = parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10);
    var toMinutes = function (hhmm) {
      var hm = hhmm.split(":");
      return parseInt(hm[0], 10) * 60 + parseInt(hm[1], 10);
    };
    var isLive = isSunday && windows.some(function (w) {
      return nowMinutes >= toMinutes(w.start) && nowMinutes < toMinutes(w.end);
    });

    if (!isLive && channel) {
      liveFrame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/videoseries?list=UU' +
        channel.replace(/^UC/, "") + '" title="Most recent service" loading="lazy" allowfullscreen ' +
        'allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>';
      var liveStatus = document.getElementById("liveStatus");
      if (liveStatus) {
        liveStatus.hidden = false;
        liveStatus.textContent = "Not live right now — our next service streams Sunday, 11:00 a.m. & 6:00 p.m. Pacific. Here's our most recent service in the meantime:";
      }
    }
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
  /* --- Hero lead image: Bible first, sanctuary footage rolls in second ----
     The video has no autoplay attribute and preload="none", so it costs
     nothing during the initial page load — we only start fetching and
     playing it once the Bible image is about to fade, which also keeps
     it off the critical path for mobile Performance scores. Reduced-motion
     visitors just keep the Bible image — no fade, no video request at all. */
  var heroVideo = document.getElementById("heroVideo");
  var heroLead = document.getElementById("heroLead");
  var heroReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (heroLead && !heroReducedMotion) {
    setTimeout(function () {
      heroLead.classList.add("is-hidden");
      if (heroVideo) heroVideo.play().catch(function () {});
    }, 5500);
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

  /* --- Click-to-load map ---------------------------------------------------
     Google's embed pulls its own JS the moment the iframe exists, so we
     don't create it until someone actually clicks. */
  document.querySelectorAll(".map-frame__load").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var iframe = document.createElement("iframe");
      iframe.src = btn.getAttribute("data-map-src");
      iframe.title = btn.getAttribute("data-map-title") || "Map";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      btn.replaceWith(iframe);
    });
  });

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

  /* --- Events and news, from the site admin ---------------------------------
     Whoever keeps the calendar adds/edits/removes events and news at
     bonitaopc.org/admin — no code, no CMS login on the old site. Each
     block renders on top of whatever's already written into the HTML,
     so if the Worker can't be reached the page just falls back to that. */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderEvent(e) {
    var month = e.date.toLocaleDateString("en-US", { month: "short" });
    var day = e.date.getDate();
    var full = e.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    var line = full + (e.location ? " · " + escapeHtml(e.location) : "");
    return '<div class="event"><div class="event__date"><span class="m">' + month + '</span><span class="d">' + day +
      '</span></div><div class="event__body"><h3>' + escapeHtml(e.title) + '</h3><p>' + line + '</p></div></div>';
  }

  function loadEvents(el, filterSort, limit) {
    var apiUrl = el && el.getAttribute("data-events-api");
    if (!apiUrl) return;
    fetch(apiUrl)
      .then(function (r) { if (!r.ok) throw new Error("bad response"); return r.json(); })
      .then(function (events) {
        var today = new Date(); today.setHours(0, 0, 0, 0);
        events = events
          .map(function (e) { return { date: new Date(e.date || ""), title: e.title || "", location: e.location || "" }; })
          .filter(function (e) { return e.title && !isNaN(e.date); });
        events = filterSort(events, today);
        if (limit) events = events.slice(0, limit);
        if (!events.length) return;
        el.innerHTML = events.map(renderEvent).join("");
      })
      .catch(function () { /* leave whatever's already in the HTML as-is */ });
  }

  loadEvents(document.getElementById("upcoming-events"), function (events, today) {
    return events.filter(function (e) { return e.date >= today; }).sort(function (a, b) { return a.date - b.date; });
  });

  var recentEl = document.getElementById("recent-events");
  loadEvents(recentEl, function (events, today) {
    return events.filter(function (e) { return e.date < today; }).sort(function (a, b) { return b.date - a.date; });
  }, recentEl && parseInt(recentEl.getAttribute("data-events-recent"), 10) || undefined);

  var newsEl = document.getElementById("news-items");
  if (newsEl) {
    var newsApi = newsEl.getAttribute("data-news-api");
    if (newsApi) {
      fetch(newsApi)
        .then(function (r) { if (!r.ok) throw new Error("bad response"); return r.json(); })
        .then(function (items) {
          if (!items.length) return;
          newsEl.innerHTML = items.map(function (n) {
            return '<div class="panel"><p class="label" style="margin-bottom:.5rem;">' + escapeHtml(n.label) +
              '</p><h3>' + escapeHtml(n.title) + '</h3><p>' + escapeHtml(n.body) + '</p></div>';
          }).join("");
        })
        .catch(function () { /* leave whatever's already in the HTML as-is */ });
    }
  }

  /* --- Mark the current page in the nav ------------------------------------ */
  var here = location.pathname.replace(/index\.html$/, "").replace(/\/$/, "");
  document.querySelectorAll(".nav__link").forEach(function (a) {
    var target = a.getAttribute("href").replace(/index\.html$/, "").replace(/\/$/, "");
    if (target && target === here) a.setAttribute("aria-current", "page");
  });
})();
