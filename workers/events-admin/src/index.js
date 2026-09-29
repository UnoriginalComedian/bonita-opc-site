/* Bonita OPC — events admin.
   A tiny replacement for the old CMS's admin panel: a password-gated page
   at /admin where a church volunteer can add, edit, and delete upcoming
   events without touching code. Events are stored as a single JSON array
   in Workers KV. The public site (events.html) reads GET /api/events —
   no password needed for that, since the list itself isn't sensitive. */

const KV_KEY = "events";

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

async function readEvents(env) {
  const raw = await env.EVENTS.get(KV_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeEvents(env, events) {
  await env.EVENTS.put(KV_KEY, JSON.stringify(events));
}

function checkAuth(request, env) {
  const supplied = request.headers.get("X-Admin-Password") || "";
  return supplied.length > 0 && supplied === env.ADMIN_PASSWORD;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      return new Response(ADMIN_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (url.pathname === "/api/events") {
      if (request.method === "GET") {
        const events = await readEvents(env);
        return json(events, {}, origin);
      }
      if (request.method === "POST") {
        if (!checkAuth(request, env)) return json({ error: "unauthorized" }, { status: 401 }, origin);
        const body = await request.json().catch(() => null);
        if (!body || !body.date || !body.title) return json({ error: "date and title are required" }, { status: 400 }, origin);
        const events = await readEvents(env);
        const event = {
          id: crypto.randomUUID(),
          date: body.date,
          title: body.title,
          location: body.location || "",
        };
        events.push(event);
        await writeEvents(env, events);
        return json(event, { status: 201 }, origin);
      }
      return json({ error: "method not allowed" }, { status: 405 }, origin);
    }

    const eventMatch = url.pathname.match(/^\/api\/events\/([^/]+)$/);
    if (eventMatch) {
      if (!checkAuth(request, env)) return json({ error: "unauthorized" }, { status: 401 }, origin);
      const id = eventMatch[1];
      const events = await readEvents(env);
      const idx = events.findIndex((e) => e.id === id);
      if (idx === -1) return json({ error: "not found" }, { status: 404 }, origin);

      if (request.method === "PUT") {
        const body = await request.json().catch(() => null);
        if (!body || !body.date || !body.title) return json({ error: "date and title are required" }, { status: 400 }, origin);
        events[idx] = { id, date: body.date, title: body.title, location: body.location || "" };
        await writeEvents(env, events);
        return json(events[idx], {}, origin);
      }
      if (request.method === "DELETE") {
        events.splice(idx, 1);
        await writeEvents(env, events);
        return json({ ok: true }, {}, origin);
      }
      return json({ error: "method not allowed" }, { status: 405 }, origin);
    }

    return json({ error: "not found" }, { status: 404 }, origin);
  },
};

const ADMIN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Events Admin | Bonita OPC</title>
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
    background: var(--green); color: #fff; padding: 1.25rem 1.5rem;
  }
  header h1 { margin: 0; font-size: 1.3rem; }
  main { max-width: 720px; margin: 0 auto; padding: 1.5rem; }
  .panel { background: var(--stock); border: 1px solid var(--rule-strong); padding: 1.25rem; margin-bottom: 1.5rem; }
  label { display: block; font-weight: 600; font-size: .92rem; margin-bottom: .25rem; }
  input {
    width: 100%; padding: .55rem .7rem; margin-bottom: .9rem;
    border: 1px solid var(--rule-strong); border-radius: 2px; font: inherit;
  }
  button {
    background: var(--tile); color: #fff; border: 0; padding: .6rem 1.2rem;
    font: inherit; font-weight: 700; cursor: pointer; border-radius: 2px;
  }
  button:hover { opacity: .9; }
  button.secondary { background: transparent; color: var(--tile); border: 1px solid var(--tile); }
  .event-row {
    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    padding: .8rem 0; border-bottom: 1px solid var(--rule);
  }
  .event-row .meta { font-size: .88rem; color: var(--muted); }
  .event-row .actions { display: flex; gap: .5rem; flex-shrink: 0; }
  .event-row .actions button { padding: .4rem .8rem; font-size: .85rem; }
  #app { display: none; }
  #login { max-width: 360px; margin: 3rem auto 0; }
  .error { color: var(--tile); font-size: .9rem; margin-bottom: .8rem; }
  .empty { color: var(--muted); font-style: italic; padding: 1rem 0; }
</style>
</head>
<body>

<header><h1>Bonita OPC — Events Admin</h1></header>

<main>
  <div id="login" class="panel">
    <p id="loginError" class="error" hidden>Wrong password.</p>
    <label for="pw">Password</label>
    <input type="password" id="pw" autocomplete="current-password">
    <button id="loginBtn">Log in</button>
  </div>

  <div id="app">
    <div class="panel">
      <h2 id="formTitle" style="margin-top:0;">Add an event</h2>
      <input type="hidden" id="eventId">
      <label for="date">Date</label>
      <input type="date" id="date">
      <label for="title">Title</label>
      <input type="text" id="title" placeholder="Family Bible Study &amp; Prayer">
      <label for="location">Location (optional)</label>
      <input type="text" id="location" placeholder="Rohr Park, Gate A">
      <p id="formError" class="error" hidden></p>
      <button id="saveBtn">Save event</button>
      <button id="cancelBtn" class="secondary" hidden>Cancel edit</button>
    </div>

    <div class="panel">
      <h2 style="margin-top:0;">All events</h2>
      <div id="list"></div>
    </div>
  </div>
</main>

<script>
(function () {
  "use strict";
  var API = location.origin + "/api/events";
  var password = "";

  var loginEl = document.getElementById("login");
  var appEl = document.getElementById("app");
  var pwEl = document.getElementById("pw");
  var loginBtn = document.getElementById("loginBtn");
  var loginError = document.getElementById("loginError");
  var listEl = document.getElementById("list");
  var formTitle = document.getElementById("formTitle");
  var eventIdEl = document.getElementById("eventId");
  var dateEl = document.getElementById("date");
  var titleEl = document.getElementById("title");
  var locationEl = document.getElementById("location");
  var saveBtn = document.getElementById("saveBtn");
  var cancelBtn = document.getElementById("cancelBtn");
  var formError = document.getElementById("formError");

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function authHeaders() {
    return { "Content-Type": "application/json", "X-Admin-Password": password };
  }

  function resetForm() {
    eventIdEl.value = "";
    dateEl.value = "";
    titleEl.value = "";
    locationEl.value = "";
    formTitle.textContent = "Add an event";
    cancelBtn.hidden = true;
    formError.hidden = true;
  }

  function loadEvents() {
    fetch(API).then(function (r) { return r.json(); }).then(function (events) {
      events.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      if (!events.length) {
        listEl.innerHTML = '<p class="empty">No events yet.</p>';
        return;
      }
      listEl.innerHTML = events.map(function (e) {
        return '<div class="event-row">' +
          '<div><strong>' + escapeHtml(e.title) + '</strong><br>' +
          '<span class="meta">' + escapeHtml(e.date) + (e.location ? " \\u00b7 " + escapeHtml(e.location) : "") + '</span></div>' +
          '<div class="actions">' +
          '<button type="button" data-edit="' + e.id + '">Edit</button>' +
          '<button type="button" class="secondary" data-delete="' + e.id + '">Delete</button>' +
          '</div></div>';
      }).join("");

      listEl.querySelectorAll("[data-edit]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var e = events.filter(function (ev) { return ev.id === btn.getAttribute("data-edit"); })[0];
          if (!e) return;
          eventIdEl.value = e.id;
          dateEl.value = e.date;
          titleEl.value = e.title;
          locationEl.value = e.location || "";
          formTitle.textContent = "Edit event";
          cancelBtn.hidden = false;
          window.scrollTo(0, 0);
        });
      });
      listEl.querySelectorAll("[data-delete]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!confirm("Delete this event?")) return;
          fetch(API + "/" + btn.getAttribute("data-delete"), { method: "DELETE", headers: authHeaders() })
            .then(loadEvents);
        });
      });
    });
  }

  loginBtn.addEventListener("click", function () {
    password = pwEl.value;
    fetch(API + "/__check__", { method: "DELETE", headers: authHeaders() }).then(function (r) {
      if (r.status === 401) {
        loginError.hidden = false;
        password = "";
        return;
      }
      loginError.hidden = true;
      loginEl.style.display = "none";
      appEl.style.display = "block";
      loadEvents();
    });
  });
  pwEl.addEventListener("keydown", function (e) { if (e.key === "Enter") loginBtn.click(); });

  saveBtn.addEventListener("click", function () {
    var body = { date: dateEl.value, title: titleEl.value.trim(), location: locationEl.value.trim() };
    if (!body.date || !body.title) {
      formError.textContent = "Date and title are required.";
      formError.hidden = false;
      return;
    }
    var id = eventIdEl.value;
    var req = id
      ? fetch(API + "/" + id, { method: "PUT", headers: authHeaders(), body: JSON.stringify(body) })
      : fetch(API, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
    req.then(function (r) {
      if (!r.ok) throw new Error();
      resetForm();
      loadEvents();
    }).catch(function () {
      formError.textContent = "Could not save \\u2014 try again.";
      formError.hidden = false;
    });
  });
  cancelBtn.addEventListener("click", resetForm);
})();
</script>
</body>
</html>`;
