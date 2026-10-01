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
      // The swapped-in player already shows the latest uploads, so the
      // "Recent uploads" section below would just repeat the same video.
      var uploads = document.getElementById("recentUploads");
      if (uploads) uploads.hidden = true;
      var liveStatus = document.getElementById("liveStatus");
      if (liveStatus) {
        liveStatus.hidden = false;
        liveStatus.textContent = "We are not live right now. Here is our most recent service.";
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

  /* --- Homepage film: respect reduced motion ------------------------------
     The video autoplays muted; visitors who ask for less motion keep the
     poster frame (the altar and open Bible) instead. */
  var heroVideo = document.getElementById("heroVideo");
  if (heroVideo && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    heroVideo.removeAttribute("autoplay");
    heroVideo.pause();
  }

  /* --- Homepage pictures: church, Bible, then the congregation -------------
     The track slides one picture to the left every few seconds. The dots
     jump to a picture (and restart the timer); a swipe works on phones.
     Reduced-motion visitors keep the first picture unless they tap a dot. */
  var heroTrack = document.getElementById("heroTrack");
  var heroDots = document.querySelectorAll("#heroDots button");
  if (heroTrack && heroDots.length) {
    var slideCount = heroTrack.children.length;
    var slideAt = 0, slideTimer = null;
    var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A copy of the first picture sits at the end, so the loop keeps moving
    // forward (last -> church) instead of sweeping back across every picture.
    var loopCopy = heroTrack.children[0].cloneNode(true);
    loopCopy.alt = ""; loopCopy.setAttribute("aria-hidden", "true"); loopCopy.removeAttribute("fetchpriority");
    heroTrack.appendChild(loopCopy);
    var moveTo = function (pos, animate) {
      heroTrack.style.transition = animate ? "" : "none";
      heroTrack.style.transform = "translateX(" + (-100 * pos) + "%)";
      if (!animate) void heroTrack.offsetWidth; // apply the jump before re-enabling motion
    };
    var markDot = function () {
      heroDots.forEach(function (d, j) {
        if (j === slideAt) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
      });
    };
    var showSlide = function (k) {
      if (k === slideCount && slideAt === slideCount - 1 && !calm) {
        moveTo(slideCount, true);          // slide forward onto the copy of the church
        slideAt = 0; markDot();
        setTimeout(function () { moveTo(0, false); heroTrack.style.transition = ""; }, 1350);
        return;
      }
      slideAt = (k + slideCount) % slideCount;
      moveTo(slideAt, true);
      markDot();
    };
    var startTimer = function () {
      clearInterval(slideTimer);
      if (!calm) slideTimer = setInterval(function () { if (!document.hidden) showSlide(slideAt + 1); }, 7000);
    };
    heroDots.forEach(function (d, j) {
      d.addEventListener("click", function () { showSlide(j); startTimer(); });
    });
    var touchX = null;
    heroTrack.parentNode.parentNode.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    heroTrack.parentNode.parentNode.addEventListener("touchend", function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 50) { showSlide(slideAt + (dx < 0 ? 1 : -1)); startTimer(); }
    }, { passive: true });
    startTimer();
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
    return '<div class="event" data-id="' + escapeHtml(e.id || "") + '"><div class="event__date"><span class="m">' + month +
      '</span><span class="d">' + day + '</span></div><div class="event__body"><h3>' + escapeHtml(e.title) +
      '</h3><p>' + line + '</p></div></div>';
  }

  function renderNews(n) {
    return '<div class="panel" data-id="' + escapeHtml(n.id || "") + '"><p class="label" style="margin-bottom:.5rem;">' +
      escapeHtml(n.label) + '</p><h3>' + escapeHtml(n.title) + '</h3><p>' + escapeHtml(n.body) + '</p></div>';
  }

  // "2026-09-19" on its own is read as midnight UTC, which is the afternoon
  // before in California, so every event showed a day early. Build the date
  // from its parts instead so it stays on the day that was entered.
  function parseDay(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(NaN);
  }

  function getJson(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("bad response");
      return r.json();
    });
  }

  function fillEvents(el, events, filterSort, limit, emptyText) {
    if (!el) return;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var list = events
      .map(function (e) { return { id: e.id, date: parseDay(e.date), title: e.title || "", location: e.location || "" }; })
      .filter(function (e) { return e.title && !isNaN(e.date); });
    list = filterSort(list, today);
    if (limit) list = list.slice(0, limit);
    if (!list.length) {
      if (emptyText) el.innerHTML = '<p class="event-empty">' + emptyText + '</p>';
      return;
    }
    el.innerHTML = list.map(renderEvent).join("");
  }

  var upcomingEl = document.getElementById("upcoming-events");
  var recentEl = document.getElementById("recent-events");
  var newsEl = document.getElementById("news-items");

  // Fetches events and news and draws them. Runs once on load, and again
  // whenever a signed-in admin changes something (see admin-inline.js).
  // Fires "bopc:rendered" afterwards so the admin tools can attach.
  function refreshContent() {
    var jobs = [];
    var eventsApi = (upcomingEl || recentEl) && (upcomingEl || recentEl).getAttribute("data-events-api");
    if (eventsApi) {
      jobs.push(getJson(eventsApi).then(function (events) {
        fillEvents(upcomingEl, events, function (list, today) {
          return list.filter(function (e) { return e.date >= today; }).sort(function (a, b) { return a.date - b.date; });
        }, undefined, "Nothing else is scheduled right now. Sunday worship and Wednesday Bible study meet every week.");
        fillEvents(recentEl, events, function (list, today) {
          return list.filter(function (e) { return e.date < today; }).sort(function (a, b) { return b.date - a.date; });
        }, recentEl && parseInt(recentEl.getAttribute("data-events-recent"), 10) || undefined);
      }).catch(function () { /* leave whatever's already in the HTML as-is */ }));
    }
    var newsApi = newsEl && newsEl.getAttribute("data-news-api");
    if (newsApi) {
      jobs.push(getJson(newsApi).then(function (items) {
        if (items.length) newsEl.innerHTML = items.map(renderNews).join("");
      }).catch(function () { /* leave whatever's already in the HTML as-is */ }));
    }
    return Promise.all(jobs).then(function () {
      document.dispatchEvent(new CustomEvent("bopc:rendered"));
    });
  }
  refreshContent();

  /* --- Site-wide settings: Wednesday Bible study time and place -------------
     Set at bonitaopc.org/admin/settings or with the Wednesday box's buttons on
     the Events page. Shown in every footer, the homepage, Plan Your Visit, and
     the Events schedule. A blank value (or an unreachable Worker) keeps the
     usual text already written into the HTML. */
  function applyBibleStudy(s) {
    [[".js-bible-location", "bibleStudyLocation"], [".js-bible-time", "bibleStudyTime"]].forEach(function (pair) {
      document.querySelectorAll(pair[0]).forEach(function (el) {
        if (!el.hasAttribute("data-default")) el.setAttribute("data-default", el.textContent);
        el.textContent = (s && s[pair[1]]) || el.getAttribute("data-default");
      });
    });
  }
  window.bopcApplyBibleStudy = applyBibleStudy;
  if (document.querySelector(".js-bible-location, .js-bible-time")) {
    fetch("https://bonitaopc.org/api/site-settings", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("bad response"); return r.json(); })
      .then(applyBibleStudy)
      .catch(function () { /* keep the usual text */ });
  }

  /* --- Most recent sermon description ---------------------------------------
     Optional, set at bonitaopc.org/admin/sermon. The video itself always
     auto-updates from YouTube regardless; this is just the line of text
     beside it. If it's blank, the element is simply hidden — the video
     still works fine on its own. */
  var sermonNoteEl = document.getElementById("sermon-note");
  if (sermonNoteEl) {
    fetch("https://bonitaopc.org/api/sermon-note")
      .then(function (r) { if (!r.ok) throw new Error("bad response"); return r.json(); })
      .then(function (note) {
        if (!note.description) return;
        sermonNoteEl.textContent = note.description;
        sermonNoteEl.hidden = false;
      })
      .catch(function () { /* leave whatever's already in the HTML as-is */ });
  }

  /* --- Photo galleries: click a photo to see it large -----------------------
     One shared <dialog> for every .gallery on the page. Arrows (or the
     keyboard's left/right keys) step through that gallery's photos; the X,
     Esc, or a click anywhere outside the photo closes it. */
  var galleries = document.querySelectorAll(".gallery");
  if (galleries.length && typeof HTMLDialogElement === "function") {
    var box = document.createElement("dialog");
    box.className = "lightbox";
    box.setAttribute("aria-label", "Photo viewer");
    box.innerHTML =
      '<figure class="lightbox__figure"><img class="lightbox__img" alt=""><figcaption class="lightbox__cap"></figcaption></figure>' +
      '<button type="button" class="lightbox__btn lightbox__close" aria-label="Close photo">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<button type="button" class="lightbox__btn lightbox__prev" aria-label="Previous photo">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<button type="button" class="lightbox__btn lightbox__next" aria-label="Next photo">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>';
    document.body.appendChild(box);

    var boxImg = box.querySelector(".lightbox__img");
    var boxCap = box.querySelector(".lightbox__cap");
    var set = [], at = 0;

    var show = function (i) {
      at = (i + set.length) % set.length;
      var img = set[at];
      var cap = img.closest("figure") && img.closest("figure").querySelector("figcaption");
      boxImg.src = img.currentSrc || img.src;
      boxImg.alt = img.alt;
      boxCap.textContent = cap ? cap.textContent : "";
      boxCap.hidden = !cap;
    };
    var step = function (d) { if (set.length > 1) show(at + d); };

    box.querySelector(".lightbox__close").addEventListener("click", function () { box.close(); });
    box.querySelector(".lightbox__prev").addEventListener("click", function () { step(-1); });
    box.querySelector(".lightbox__next").addEventListener("click", function () { step(1); });
    box.addEventListener("click", function (e) { if (e.target === box || e.target.classList.contains("lightbox__figure")) box.close(); });
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });
    box.addEventListener("close", function () { document.documentElement.classList.remove("has-lightbox"); });

    galleries.forEach(function (g) {
      var imgs = Array.prototype.slice.call(g.querySelectorAll("img"));
      imgs.forEach(function (img, i) {
        img.tabIndex = 0;
        img.setAttribute("role", "button");
        img.setAttribute("aria-label", "View larger: " + img.alt);
        var open = function () {
          set = imgs;
          box.classList.toggle("is-single", imgs.length < 2);
          show(i);
          box.showModal();
          document.documentElement.classList.add("has-lightbox");
        };
        img.addEventListener("click", open);
        img.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
        });
      });
    });
  }

  /* --- Admin tools on the public pages --------------------------------------
     A church admin signs in once (footer link) and then sees add/edit/delete
     controls right on the page. The tools live in their own file and only
     load for someone who is signed in, so ordinary visitors never download
     them. The password is kept in localStorage, so it stays signed in on
     that computer until someone clicks Sign out. */
  window.bopcSite = { refresh: refreshContent, escapeHtml: escapeHtml, parseDay: parseDay };
  var ADMIN_KEY = "bopc-admin-pw";
  var adminLoaded = false;
  function loadAdmin(then) {
    if (adminLoaded) { if (then) then(); return; }
    adminLoaded = true;
    var tag = document.createElement("script");
    tag.src = "/assets/js/admin-inline.js?v=20260930i";
    tag.onload = function () { if (then) then(); };
    document.body.appendChild(tag);
  }
  var hasAdmin = false;
  try { hasAdmin = !!localStorage.getItem(ADMIN_KEY); } catch (e) {}
  if (hasAdmin) loadAdmin();

  var footerBottom = document.querySelector(".site-footer__bottom");
  if (footerBottom && !hasAdmin) {
    var signIn = document.createElement("p");
    signIn.style.margin = "0";
    signIn.innerHTML = '<a href="#" class="admin-signin-link">Admin sign-in</a>';
    footerBottom.appendChild(signIn);
    signIn.firstChild.addEventListener("click", function (e) {
      e.preventDefault();
      loadAdmin(function () { if (window.bopcAdmin) window.bopcAdmin.signIn(); });
    });
  }

  /* --- Mark the current page in the nav ------------------------------------ */
  var here = location.pathname.replace(/index\.html$/, "").replace(/\/$/, "");
  document.querySelectorAll(".nav__link").forEach(function (a) {
    var target = a.getAttribute("href").replace(/index\.html$/, "").replace(/\/$/, "");
    if (target && target === here) a.setAttribute("aria-current", "page");
  });
})();
