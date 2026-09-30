/* Bonita OPC — site admin.
   A tiny replacement for the old CMS's admin panel: password-gated pages
   at /admin/events and /admin/news where a church volunteer can add, edit,
   delete, search, and page through events and news items without touching
   code. Each collection is a single JSON array in Workers KV — fine up to
   the low thousands of items, which covers "hundreds of events" with
   plenty of headroom. The public site reads GET /api/events and /api/news
   — no password needed for those, since the lists themselves aren't
   sensitive; only writes require the admin password. */

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
  };
}

function json(data, init, origin) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin), ...(init && init.headers) },
  });
}

function checkAuth(request, env) {
  const supplied = request.headers.get("X-Admin-Password") || "";
  return supplied.length > 0 && supplied === env.ADMIN_PASSWORD;
}

async function readCollection(env, key) {
  const raw = await env.EVENTS.get(key);
  return raw ? JSON.parse(raw) : [];
}

async function writeCollection(env, key, items) {
  await env.EVENTS.put(key, JSON.stringify(items));
}

/* One config per collection: KV key, required fields, and how to build a
   clean record from a request body. Shared by both /api/events and
   /api/news so adding a third collection later is a few lines, not a
   copy-pasted route. */
const COLLECTIONS = {
  events: {
    key: "events",
    required: ["date", "title"],
    build: (body) => ({ date: body.date, title: body.title, location: body.location || "" }),
  },
  news: {
    key: "news",
    required: ["label", "title", "body"],
    build: (body) => ({ label: body.label, title: body.title, body: body.body }),
  },
};

/* Singleton values (not lists) — one KV key per config, e.g. the current
   sermon note or the Bible study's current location, each with a fixed
   shape and defaults. Reused for anything that's "one editable value the
   site reads everywhere," as opposed to the growing lists (events, news). */
const SINGLETONS = {
  "sermon-note": { defaults: { description: "" } },
  "site-settings": { defaults: { bibleStudyLocation: "" } },
};

async function handleSingleton(request, env, origin) {
  const url = new URL(request.url);
  const key = url.pathname.replace(/^\/api\//, "");
  const config = SINGLETONS[key];
  if (!config || url.pathname !== `/api/${key}`) return null;

  if (request.method === "GET") {
    const raw = await env.EVENTS.get(key);
    return json(raw ? JSON.parse(raw) : config.defaults, {}, origin);
  }
  if (request.method === "PUT") {
    if (!checkAuth(request, env)) return json({ error: "unauthorized" }, { status: 401 }, origin);
    const body = await request.json().catch(() => null);
    const value = {};
    Object.keys(config.defaults).forEach((f) => { value[f] = (body && body[f]) || config.defaults[f]; });
    await env.EVENTS.put(key, JSON.stringify(value));
    return json(value, {}, origin);
  }
  return json({ error: "method not allowed" }, { status: 405 }, origin);
}

async function handleCollection(request, env, origin, collection) {
  const url = new URL(request.url);

  if (url.pathname === `/api/${collection.name}`) {
    if (request.method === "GET") {
      return json(await readCollection(env, collection.key), {}, origin);
    }
    if (request.method === "POST") {
      if (!checkAuth(request, env)) return json({ error: "unauthorized" }, { status: 401 }, origin);
      const body = await request.json().catch(() => null);
      if (!body || collection.required.some((f) => !body[f])) {
        return json({ error: collection.required.join(" and ") + " are required" }, { status: 400 }, origin);
      }
      const items = await readCollection(env, collection.key);
      const item = { id: crypto.randomUUID(), ...collection.build(body) };
      items.push(item);
      await writeCollection(env, collection.key, items);
      return json(item, { status: 201 }, origin);
    }
    return json({ error: "method not allowed" }, { status: 405 }, origin);
  }

  const match = url.pathname.match(new RegExp(`^/api/${collection.name}/([^/]+)$`));
  if (match) {
    if (!checkAuth(request, env)) return json({ error: "unauthorized" }, { status: 401 }, origin);
    const id = match[1];
    const items = await readCollection(env, collection.key);
    const idx = items.findIndex((it) => it.id === id);
    if (idx === -1) return json({ error: "not found" }, { status: 404 }, origin);

    if (request.method === "PUT") {
      const body = await request.json().catch(() => null);
      if (!body || collection.required.some((f) => !body[f])) {
        return json({ error: collection.required.join(" and ") + " are required" }, { status: 400 }, origin);
      }
      items[idx] = { id, ...collection.build(body) };
      await writeCollection(env, collection.key, items);
      return json(items[idx], {}, origin);
    }
    if (request.method === "DELETE") {
      items.splice(idx, 1);
      await writeCollection(env, collection.key, items);
      return json({ ok: true }, {}, origin);
    }
    return json({ error: "method not allowed" }, { status: 405 }, origin);
  }

  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    // Never serve the admin or the API over plain http (the password travels in
    // a header); send the visitor to the https:// address instead.
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      return Response.redirect(url.origin + "/admin/events", 302);
    }
    if (url.pathname === "/admin/events") {
      return htmlPage(eventsPage(), env);
    }
    if (url.pathname === "/admin/news") {
      return htmlPage(newsPage(), env);
    }
    if (url.pathname === "/admin/sermon") {
      return htmlPage(sermonPage(), env);
    }
    if (url.pathname === "/admin/settings") {
      return htmlPage(settingsPage(), env);
    }

    const singletonResult = await handleSingleton(request, env, origin);
    if (singletonResult) return singletonResult;

    for (const name of Object.keys(COLLECTIONS)) {
      const result = await handleCollection(request, env, origin, { name, ...COLLECTIONS[name] });
      if (result) return result;
    }

    return json({ error: "not found" }, { status: 404 }, origin);
  },
};

function htmlPage(html, env) {
  return new Response(html.replace("__GOOGLE_MAPS_API_KEY__", env.GOOGLE_MAPS_API_KEY || ""), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/* --- Shared page shell -----------------------------------------------------
   Header with the Events/News/Back-to-site nav, the shared styles, and the
   password gate. `active` picks which nav link is current. `bodyHtml` and
   `scriptExtra` are page-specific. */
function shell(active, title, bodyHtml, scriptExtra, includeMaps) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | Bonita OPC Admin</title>
<style>
  :root {
    --green: #2f4436; --plaster: #f3ebdd; --stock: #fbf6ec; --ink: #241f19;
    --muted: #6c6256; --tile: #a6432a; --brass: #7d571c; --rule: #d9cdb8; --rule-strong: #b9a98d;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--plaster); color: var(--ink);
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    line-height: 1.5;
  }
  header {
    background: var(--green); color: #fff; padding: 1rem 1.5rem;
    display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;
  }
  header h1 { margin: 0; font-size: 1.2rem; margin-right: auto; }
  header nav { display: flex; gap: 1.25rem; align-items: center; }
  header nav a { color: rgba(255,255,255,.8); text-decoration: none; font-size: .95rem; }
  header nav a:hover, header nav a[aria-current] { color: #fff; text-decoration: underline; }
  header nav a.back { border-left: 1px solid rgba(255,255,255,.3); padding-left: 1.25rem; }
  main { max-width: 760px; margin: 0 auto; padding: 1.5rem; }
  .panel { background: var(--stock); border: 1px solid var(--rule-strong); padding: 1.25rem; margin-bottom: 1.5rem; }
  label { display: block; font-weight: 600; font-size: .92rem; margin-bottom: .25rem; }
  input, textarea {
    width: 100%; padding: .55rem .7rem; margin-bottom: .9rem;
    border: 1px solid var(--rule-strong); border-radius: 2px; font: inherit;
  }
  textarea { min-height: 5rem; resize: vertical; }
  button {
    background: var(--tile); color: #fff; border: 0; padding: .6rem 1.2rem;
    font: inherit; font-weight: 700; cursor: pointer; border-radius: 2px;
  }
  button:hover { opacity: .9; }
  button.secondary { background: transparent; color: var(--tile); border: 1px solid var(--tile); }
  button:disabled { opacity: .4; cursor: default; }
  .row {
    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    padding: .8rem 0; border-bottom: 1px solid var(--rule);
  }
  .row .meta { font-size: .88rem; color: var(--muted); }
  .row .actions { display: flex; gap: .5rem; flex-shrink: 0; }
  .row .actions button { padding: .4rem .8rem; font-size: .85rem; }
  #app { display: none; }
  #login { max-width: 360px; margin: 3rem auto 0; }
  .error { color: var(--tile); font-size: .9rem; margin-bottom: .8rem; }
  .empty { color: var(--muted); font-style: italic; padding: 1rem 0; }
  .search-row { display: flex; gap: .75rem; align-items: center; margin-bottom: 1rem; }
  .search-row input { margin-bottom: 0; flex: 1; }
  .search-row .count { font-size: .85rem; color: var(--muted); white-space: nowrap; }
  .pager { display: flex; gap: .35rem; align-items: center; justify-content: center; margin-top: 1.25rem; flex-wrap: wrap; }
  .pager button {
    background: var(--stock); color: var(--ink); border: 1px solid var(--rule-strong);
    padding: .35rem .7rem; font-size: .85rem; font-weight: 600;
  }
  .pager button[aria-current] { background: var(--tile); color: #fff; border-color: var(--tile); }
  .pager button:disabled { opacity: .35; }
</style>
</head>
<body>

<header>
  <h1>Bonita OPC Admin</h1>
  <nav>
    <a href="/admin/events" ${active === "events" ? 'aria-current="page"' : ""}>Events</a>
    <a href="/admin/news" ${active === "news" ? 'aria-current="page"' : ""}>News</a>
    <a href="/admin/sermon" ${active === "sermon" ? 'aria-current="page"' : ""}>Sermon</a>
    <a href="/admin/settings" ${active === "settings" ? 'aria-current="page"' : ""}>Settings</a>
    <a href="https://bonitaopc.org" class="back">\u2190 Back to site</a>
    <a href="#" id="signOut">Sign out</a>
  </nav>
</header>

<main>
  <div id="login" class="panel">
    <p id="loginError" class="error" hidden>Wrong password.</p>
    <label for="pw">Password</label>
    <input type="password" id="pw" autocomplete="current-password">
    <button id="loginBtn">Log in</button>
  </div>

  <div id="app">
${bodyHtml}
  </div>
</main>

<script>
(function () {
  "use strict";
  var SESSION_KEY = "bopc-admin-pw";
  var password = "";

  var loginEl = document.getElementById("login");
  var appEl = document.getElementById("app");
  var pwEl = document.getElementById("pw");
  var loginBtn = document.getElementById("loginBtn");
  var loginError = document.getElementById("loginError");

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function authHeaders() {
    return { "Content-Type": "application/json", "X-Admin-Password": password };
  }

  function tryPassword(pw, onResult) {
    fetch(location.origin + "/api/events/__check__", { method: "DELETE", headers: { "X-Admin-Password": pw } })
      .then(function (r) { onResult(r.status !== 401); })
      .catch(function () { onResult(false); });
  }

  function enterApp() {
    loginEl.style.display = "none";
    appEl.style.display = "block";
    if (window.onAdminReady) window.onAdminReady(authHeaders);
  }

  loginBtn.addEventListener("click", function () {
    var candidate = pwEl.value;
    tryPassword(candidate, function (ok) {
      if (!ok) {
        loginError.hidden = false;
        return;
      }
      password = candidate;
      loginError.hidden = true;
      try { localStorage.setItem(SESSION_KEY, password); } catch (e) {}
      enterApp();
    });
  });
  pwEl.addEventListener("keydown", function (e) { if (e.key === "Enter") loginBtn.click(); });
  document.getElementById("signOut").addEventListener("click", function (e) {
    e.preventDefault();
    try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch (err) {}
    location.reload();
  });

  /* Skip the login screen if this tab already proved the password once.
     Shown optimistically — before the check round-trip even finishes — so
     moving between admin pages doesn't flash the login form each time.
     Only falls back to the login screen if the saved password turns out
     to be stale (rare: cleared/changed server-side mid-session). */
  // Runs at the end of the script (see below), after the page-specific code
  // has defined window.onAdminReady; running it earlier left lists empty.
  function autoEnter() {
  var saved = "";
  try { saved = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || ""; } catch (e) {}
  if (saved) {
    password = saved;
    enterApp();
    tryPassword(saved, function (ok) {
      if (!ok) {
        try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
        password = "";
        appEl.style.display = "none";
        loginEl.style.display = "block";
      }
    });
  }
  }

  window.escapeHtml = escapeHtml;
  window.authHeaders = function () { return authHeaders(); };
  window.initPlaces = function () {}; /* no-op unless a page below replaces it */
${scriptExtra || ""}
  autoEnter();
})();
</script>
${includeMaps ? '<script src="https://maps.googleapis.com/maps/api/js?key=__GOOGLE_MAPS_API_KEY__&libraries=places&callback=initPlaces&loading=async" async defer></script>' : ""}
</body>
</html>`;
}

/* Search + numbered pagination, shared by both list pages. Everything is
   fetched once and paged/filtered client-side — even a couple thousand
   small JSON records is a trivial payload, so this stays simple instead
   of building out server-side paging for a scale the church won't hit. */
const PAGER_JS = `
  function makePager(opts) {
    var searchEl = document.getElementById(opts.searchField);
    var countEl = document.getElementById(opts.countField);
    var listEl = document.getElementById(opts.listField);
    var pagerEl = document.getElementById(opts.pagerField);
    var pageSize = 25;
    var page = 1;
    var all = [];

    function matches(item, q) {
      if (!q) return true;
      q = q.toLowerCase();
      return opts.searchFields.some(function (f) { return (item[f] || "").toLowerCase().indexOf(q) !== -1; });
    }

    function render() {
      var q = searchEl.value.trim();
      var filtered = all.filter(function (it) { return matches(it, q); });
      var totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if (page > totalPages) page = totalPages;
      var start = (page - 1) * pageSize;
      var pageItems = filtered.slice(start, start + pageSize);

      countEl.textContent = filtered.length + (filtered.length === 1 ? " item" : " items") +
        (filtered.length !== all.length ? " (of " + all.length + ")" : "");

      if (!pageItems.length) {
        listEl.innerHTML = '<p class="empty">' + opts.emptyLabel + '</p>';
      } else {
        listEl.innerHTML = pageItems.map(function (it) {
          return '<div class="row"><div><strong>' + escapeHtml(it[opts.titleField]) + '</strong><br>' +
            '<span class="meta">' + escapeHtml(opts.metaLine(it)) + '</span></div>' +
            '<div class="actions">' +
            '<button type="button" data-edit="' + it.id + '">Edit</button>' +
            '<button type="button" class="secondary" data-delete="' + it.id + '">Delete</button>' +
            '</div></div>';
        }).join("");
        listEl.querySelectorAll("[data-edit]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var it = all.filter(function (x) { return x.id === btn.getAttribute("data-edit"); })[0];
            if (it) opts.onEdit(it);
          });
        });
        listEl.querySelectorAll("[data-delete]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (!confirm(opts.deleteConfirm)) return;
            fetch(opts.api + "/" + btn.getAttribute("data-delete"), { method: "DELETE", headers: authHeaders() })
              .then(reload);
          });
        });
      }

      var pagerHtml = '<button type="button" data-page="prev" ' + (page <= 1 ? "disabled" : "") + '>\\u2039 Prev</button>';
      var windowStart = Math.max(1, page - 3);
      var windowEnd = Math.min(totalPages, windowStart + 6);
      for (var p = windowStart; p <= windowEnd; p++) {
        pagerHtml += '<button type="button" data-page="' + p + '" ' + (p === page ? 'aria-current="page"' : "") + '>' + p + '</button>';
      }
      pagerHtml += '<button type="button" data-page="next" ' + (page >= totalPages ? "disabled" : "") + '>Next \\u203a</button>';
      pagerEl.innerHTML = totalPages > 1 ? pagerHtml : "";
      pagerEl.querySelectorAll("[data-page]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var v = btn.getAttribute("data-page");
          if (v === "prev") page = Math.max(1, page - 1);
          else if (v === "next") page = Math.min(totalPages, page + 1);
          else page = parseInt(v, 10);
          render();
          window.scrollTo(0, listEl.offsetTop - 20);
        });
      });
    }

    function reload() {
      return fetch(opts.api).then(function (r) { return r.json(); }).then(function (items) {
        all = items;
        page = 1;
        render();
      });
    }

    searchEl.addEventListener("input", function () { page = 1; render(); });
    return { reload: reload };
  }
`;

function searchPagerHtml(prefix) {
  return `
    <div class="search-row">
      <input type="search" id="${prefix}Search" placeholder="Search\u2026">
      <span class="count" id="${prefix}Count"></span>
    </div>
    <div id="${prefix}List"></div>
    <div class="pager" id="${prefix}Pager"></div>`;
}

function eventsPage() {
  const body = `
    <h2 style="margin-top:0;">Add an event</h2>
    <div class="panel">
      <input type="hidden" id="eventId">
      <label for="eventDate">Date</label>
      <input type="date" id="eventDate">
      <label for="eventTitle">Title</label>
      <input type="text" id="eventTitle" placeholder="Family Bible Study &amp; Prayer">
      <label for="eventLocation">Location (optional)</label>
      <input type="text" id="eventLocation" placeholder="Start typing an address\u2026" autocomplete="off">
      <p id="eventsFormError" class="error" hidden></p>
      <button id="eventsSaveBtn">Save event</button>
      <button id="eventsCancelBtn" class="secondary" hidden>Cancel edit</button>
    </div>

    <h2 id="eventsFormTitle">All events</h2>
    <div class="panel">
      ${searchPagerHtml("events")}
    </div>`;

  const script = `${PAGER_JS}
  window.initPlaces = function () {
    var input = document.getElementById("eventLocation");
    if (!input || !window.google || !google.maps || !google.maps.places) return;
    var ac = new google.maps.places.Autocomplete(input, { fields: ["formatted_address"] });
    ac.addListener("place_changed", function () {
      var place = ac.getPlace();
      if (place && place.formatted_address) input.value = place.formatted_address;
    });
  };

  window.onAdminReady = function () {
    var idEl = document.getElementById("eventId");
    var dateEl = document.getElementById("eventDate");
    var titleEl = document.getElementById("eventTitle");
    var locationEl = document.getElementById("eventLocation");
    var saveBtn = document.getElementById("eventsSaveBtn");
    var cancelBtn = document.getElementById("eventsCancelBtn");
    var formError = document.getElementById("eventsFormError");
    var sectionTitle = document.getElementById("eventsFormTitle");
    var addHeading = document.querySelector("main h2");

    function resetForm() {
      idEl.value = ""; dateEl.value = ""; titleEl.value = ""; locationEl.value = "";
      addHeading.textContent = "Add an event";
      cancelBtn.hidden = true;
      formError.hidden = true;
    }

    var pager = makePager({
      api: location.origin + "/api/events",
      searchField: "eventsSearch", countField: "eventsCount", listField: "eventsList", pagerField: "eventsPager",
      searchFields: ["title", "location", "date"], titleField: "title",
      emptyLabel: "No events yet.", deleteConfirm: "Delete this event?",
      metaLine: function (e) { return e.date + (e.location ? " \\u00b7 " + e.location : ""); },
      onEdit: function (e) {
        idEl.value = e.id; dateEl.value = e.date; titleEl.value = e.title; locationEl.value = e.location || "";
        addHeading.textContent = "Edit event";
        cancelBtn.hidden = false;
        window.scrollTo(0, 0);
      },
    });

    saveBtn.addEventListener("click", function () {
      var body = { date: dateEl.value, title: titleEl.value.trim(), location: locationEl.value.trim() };
      if (!body.date || !body.title) {
        formError.textContent = "Date and title are required.";
        formError.hidden = false;
        return;
      }
      var id = idEl.value;
      var api = location.origin + "/api/events";
      var req = id
        ? fetch(api + "/" + id, { method: "PUT", headers: authHeaders(), body: JSON.stringify(body) })
        : fetch(api, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
      req.then(function (r) {
        if (!r.ok) throw new Error();
        resetForm();
        pager.reload();
      }).catch(function () {
        formError.textContent = "Could not save \\u2014 try again.";
        formError.hidden = false;
      });
    });
    cancelBtn.addEventListener("click", resetForm);

    pager.reload();
  };`;

  return shell("events", "Events", body, script, true);
}

function newsPage() {
  const body = `
    <h2 style="margin-top:0;">Add a news item</h2>
    <div class="panel">
      <input type="hidden" id="newsId">
      <label for="newsLabel">Label</label>
      <input type="text" id="newsLabel" placeholder="Week of August 23, 2026 (or &quot;Ongoing&quot;)">
      <label for="newsTitle">Title</label>
      <input type="text" id="newsTitle" placeholder="Communion and Feast Day next Sunday">
      <label for="newsBody">Body</label>
      <textarea id="newsBody" placeholder="A sentence or two."></textarea>
      <p id="newsFormError" class="error" hidden></p>
      <button id="newsSaveBtn">Save news item</button>
      <button id="newsCancelBtn" class="secondary" hidden>Cancel edit</button>
    </div>

    <h2 id="newsFormTitle">All news items</h2>
    <div class="panel">
      ${searchPagerHtml("news")}
    </div>`;

  const script = `${PAGER_JS}
  window.onAdminReady = function () {
    var idEl = document.getElementById("newsId");
    var labelEl = document.getElementById("newsLabel");
    var titleEl = document.getElementById("newsTitle");
    var bodyEl = document.getElementById("newsBody");
    var saveBtn = document.getElementById("newsSaveBtn");
    var cancelBtn = document.getElementById("newsCancelBtn");
    var formError = document.getElementById("newsFormError");
    var addHeading = document.querySelector("main h2");

    function resetForm() {
      idEl.value = ""; labelEl.value = ""; titleEl.value = ""; bodyEl.value = "";
      addHeading.textContent = "Add a news item";
      cancelBtn.hidden = true;
      formError.hidden = true;
    }

    var pager = makePager({
      api: location.origin + "/api/news",
      searchField: "newsSearch", countField: "newsCount", listField: "newsList", pagerField: "newsPager",
      searchFields: ["title", "label", "body"], titleField: "title",
      emptyLabel: "No news items yet.", deleteConfirm: "Delete this news item?",
      metaLine: function (n) { return n.label; },
      onEdit: function (n) {
        idEl.value = n.id; labelEl.value = n.label; titleEl.value = n.title; bodyEl.value = n.body;
        addHeading.textContent = "Edit news item";
        cancelBtn.hidden = false;
        window.scrollTo(0, 0);
      },
    });

    saveBtn.addEventListener("click", function () {
      var body = { label: labelEl.value.trim(), title: titleEl.value.trim(), body: bodyEl.value.trim() };
      if (!body.label || !body.title || !body.body) {
        formError.textContent = "Label, title, and body are all required.";
        formError.hidden = false;
        return;
      }
      var id = idEl.value;
      var api = location.origin + "/api/news";
      var req = id
        ? fetch(api + "/" + id, { method: "PUT", headers: authHeaders(), body: JSON.stringify(body) })
        : fetch(api, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
      req.then(function (r) {
        if (!r.ok) throw new Error();
        resetForm();
        pager.reload();
      }).catch(function () {
        formError.textContent = "Could not save \\u2014 try again.";
        formError.hidden = false;
      });
    });
    cancelBtn.addEventListener("click", resetForm);

    pager.reload();
  };`;

  return shell("news", "News", body, script, false);
}

function sermonPage() {
  const body = `
    <h2 style="margin-top:0;">Most recent sermon</h2>
    <div class="panel">
      <p style="margin-top:0;color:var(--muted);font-size:.92rem;">The video on the sermons
      page always shows whatever's actually most recent on YouTube automatically — nothing
      to do there. This is just an optional line of text shown beside it (who preached, the
      passage, anything else). Leave it blank and the site simply won't show anything extra;
      nothing breaks either way.</p>
      <label for="sermonDescription">Description (optional)</label>
      <textarea id="sermonDescription" placeholder="Preached by John Joseph Matandika on Zephaniah 1:1-6."></textarea>
      <p id="sermonFormError" class="error" hidden></p>
      <p id="sermonSaved" class="error" style="color:var(--green);" hidden>Saved.</p>
      <button id="sermonSaveBtn">Save</button>
    </div>`;

  const script = `
  window.onAdminReady = function () {
    var descEl = document.getElementById("sermonDescription");
    var saveBtn = document.getElementById("sermonSaveBtn");
    var formError = document.getElementById("sermonFormError");
    var saved = document.getElementById("sermonSaved");
    var api = location.origin + "/api/sermon-note";

    fetch(api).then(function (r) { return r.json(); }).then(function (note) {
      descEl.value = note.description || "";
    });

    saveBtn.addEventListener("click", function () {
      formError.hidden = true;
      saved.hidden = true;
      fetch(api, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ description: descEl.value.trim() }) })
        .then(function (r) {
          if (!r.ok) throw new Error();
          saved.hidden = false;
        })
        .catch(function () {
          formError.textContent = "Could not save \\u2014 try again.";
          formError.hidden = false;
        });
    });
  };`;

  return shell("sermon", "Sermon", body, script, false);
}

function settingsPage() {
  const body = `
    <h2 style="margin-top:0;">Wednesday Bible study location</h2>
    <div class="panel">
      <p style="margin-top:0;color:var(--muted);font-size:.92rem;">Shows up in several spots
      across the site — the footer on every page and the weekly schedule on the Events
      page. Change it here and it updates everywhere at once. This only affects the current,
      ongoing Wednesday meeting — it does not change any past event already recorded on
      the Events page.</p>
      <label for="bibleStudyLocation">Current location</label>
      <input type="text" id="bibleStudyLocation" placeholder="the church">
      <p id="settingsFormError" class="error" hidden></p>
      <p id="settingsSaved" class="error" style="color:var(--green);" hidden>Saved.</p>
      <button id="settingsSaveBtn">Save</button>
    </div>`;

  const script = `
  window.onAdminReady = function () {
    var locEl = document.getElementById("bibleStudyLocation");
    var saveBtn = document.getElementById("settingsSaveBtn");
    var formError = document.getElementById("settingsFormError");
    var saved = document.getElementById("settingsSaved");
    var api = location.origin + "/api/site-settings";

    fetch(api).then(function (r) { return r.json(); }).then(function (s) {
      locEl.value = s.bibleStudyLocation || "";
    });

    saveBtn.addEventListener("click", function () {
      formError.hidden = true;
      saved.hidden = true;
      fetch(api, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ bibleStudyLocation: locEl.value.trim() }) })
        .then(function (r) {
          if (!r.ok) throw new Error();
          saved.hidden = false;
        })
        .catch(function () {
          formError.textContent = "Could not save \\u2014 try again.";
          formError.hidden = false;
        });
    });
  };`;

  return shell("settings", "Settings", body, script, false);
}
