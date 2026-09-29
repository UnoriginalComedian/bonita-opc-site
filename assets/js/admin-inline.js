/* Bonita OPC — admin tools on the public pages.
   Loaded by site.js only for someone who has signed in (or who just clicked
   "Admin sign-in" in the footer). Adds add/edit/delete controls right on
   the Events page, an editable Bible study location, and an editable
   sermon caption, all talking to the same /api the /admin pages use.
   Ordinary visitors never load this file. */
(function () {
  "use strict";

  var API = "https://bonitaopc.org/api";

  if (!document.querySelector('link[href*="admin-inline.css"]')) {
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/assets/css/admin-inline.css?v=20260929c";
    document.head.appendChild(css);
  }
  var KEY = "bopc-admin-pw";
  var site = window.bopcSite || {};
  var esc = site.escapeHtml || function (s) { return String(s); };

  function getPw() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  function setPw(pw) { try { localStorage.setItem(KEY, pw); } catch (e) {} }
  function clearPw() { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (e) {} }

  function checkPassword(pw) {
    // Deleting an id that doesn't exist: 401 means wrong password, anything
    // else (404) means the password was accepted. Nothing is changed.
    return fetch(API + "/events/__check__", { method: "DELETE", headers: { "X-Admin-Password": pw } })
      .then(function (r) { return r.status !== 401; });
  }

  function api(method, path, body) {
    return fetch(API + path, {
      method: method,
      headers: { "Content-Type": "application/json", "X-Admin-Password": getPw() },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (r.status === 401) { clearPw(); throw new Error("Your sign-in has expired. Please sign in again."); }
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.error || "Something went wrong. Try again."); });
      return r.json();
    });
  }

  /* --- Small shared pieces: dialog, menu, toast ----------------------------- */

  var dlg = document.createElement("dialog");
  dlg.className = "adm-dialog";
  document.body.appendChild(dlg);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

  // fields: [{ name, label, type: "text"|"date"|"textarea"|"password", required, placeholder }]
  function openForm(opts) {
    var html = '<form method="dialog" class="adm-form"><h2>' + esc(opts.title) + '</h2>';
    if (opts.message) html += '<p class="adm-form__msg">' + esc(opts.message) + '</p>';
    (opts.fields || []).forEach(function (f) {
      var id = "adm-" + f.name;
      var val = opts.values && opts.values[f.name] != null ? opts.values[f.name] : "";
      html += '<label for="' + id + '">' + esc(f.label) + (f.required ? "" : ' <span class="adm-opt">(optional)</span>') + '</label>';
      html += f.type === "textarea"
        ? '<textarea id="' + id + '" name="' + f.name + '"' + (f.required ? " required" : "") + '>' + esc(val) + '</textarea>'
        : '<input id="' + id + '" name="' + f.name + '" type="' + (f.type || "text") + '" value="' + esc(val) + '"' +
          (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "") + (f.required ? " required" : "") +
          (f.type === "password" ? ' autocomplete="current-password"' : "") + '>';
    });
    html += '<p class="adm-error" hidden></p><div class="adm-form__actions">' +
      '<button type="button" class="btn btn--ghost" data-cancel>Cancel</button>' +
      '<button type="submit" class="btn ' + (opts.danger ? "adm-danger" : "btn--primary") + '">' + esc(opts.submit || "Save") + '</button></div></form>';
    dlg.innerHTML = html;
    var form = dlg.querySelector("form");
    var err = dlg.querySelector(".adm-error");
    var submitBtn = form.querySelector('[type="submit"]');
    dlg.querySelector("[data-cancel]").addEventListener("click", function () { dlg.close(); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var values = {};
      (opts.fields || []).forEach(function (f) { values[f.name] = form.elements[f.name].value.trim(); });
      submitBtn.disabled = true;
      err.hidden = true;
      Promise.resolve(opts.onSubmit(values)).then(function () { dlg.close(); }, function (ex) {
        err.textContent = ex && ex.message ? ex.message : "Something went wrong. Try again.";
        err.hidden = false;
      }).then(function () { submitBtn.disabled = false; });
    });
    dlg.showModal();
    var first = form.querySelector("input, textarea");
    if (first) first.focus();
  }

  var menu = document.createElement("div");
  menu.className = "adm-menu";
  menu.hidden = true;
  document.body.appendChild(menu);
  function closeMenu() { menu.hidden = true; }
  document.addEventListener("click", function (e) { if (!menu.contains(e.target)) closeMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  window.addEventListener("scroll", closeMenu, { passive: true });

  function showMenu(x, y, items) {
    menu.innerHTML = "";
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = it.label;
      if (it.danger) b.className = "is-danger";
      b.addEventListener("click", function (e) { e.stopPropagation(); closeMenu(); it.run(); });
      menu.appendChild(b);
    });
    menu.hidden = false;
    var w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(x, window.innerWidth - w - 8)) + "px";
    menu.style.top = Math.max(8, Math.min(y, window.innerHeight - h - 8)) + "px";
  }

  var toast = document.createElement("div");
  toast.className = "adm-toast";
  toast.setAttribute("role", "status");
  toast.hidden = true;
  document.body.appendChild(toast);
  var toastTimer;
  function say(text, undo) {
    clearTimeout(toastTimer);
    toast.innerHTML = "<span>" + esc(text) + "</span>";
    if (undo) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = "Undo";
      b.addEventListener("click", function () { toast.hidden = true; undo(); });
      toast.appendChild(b);
    }
    toast.hidden = false;
    toastTimer = setTimeout(function () { toast.hidden = true; }, undo ? 8000 : 3500);
  }

  function refresh() { return site.refresh ? site.refresh() : Promise.resolve(); }

  /* --- Sign in / sign out --------------------------------------------------- */

  function signIn() {
    openForm({
      title: "Admin sign-in",
      message: "Stays signed in on this computer until you sign out.",
      fields: [{ name: "pw", label: "Password", type: "password", required: true }],
      submit: "Sign in",
      onSubmit: function (v) {
        return checkPassword(v.pw).then(function (ok) {
          if (!ok) throw new Error("That password isn't right.");
          setPw(v.pw);
          location.reload();
        });
      }
    });
  }

  function signOut() {
    clearPw();
    location.reload();
  }

  window.bopcAdmin = { signIn: signIn, signOut: signOut };

  if (!getPw()) return; // loaded only to show the sign-in form

  /* --- Signed in from here on ---------------------------------------------- */

  document.documentElement.classList.add("is-admin");

  var bar = document.createElement("div");
  bar.className = "adm-bar";
  bar.innerHTML = '<div class="wrap adm-bar__inner"><span class="adm-bar__label">Admin mode</span>' +
    '<span class="adm-bar__hint">Only you can see these controls.</span>' +
    '<a href="/admin/events">Dashboard</a><button type="button" data-signout>Sign out</button></div>';
  document.body.insertBefore(bar, document.body.firstChild);
  bar.querySelector("[data-signout]").addEventListener("click", signOut);

  // Re-check quietly in case the password was changed since signing in.
  checkPassword(getPw()).then(function (ok) {
    if (!ok) { clearPw(); say("The admin password has changed. Please sign in again."); setTimeout(function () { location.reload(); }, 2500); }
  }).catch(function () {});

  var DOTS = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
  var PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  var PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';

  function addButton(label, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn--ghost btn--sm adm-add";
    b.innerHTML = PLUS + "<span>" + esc(label) + "</span>";
    b.addEventListener("click", onClick);
    return b;
  }

  function editButton(label, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "adm-edit";
    b.innerHTML = PEN + "<span>" + esc(label) + "</span>";
    b.addEventListener("click", onClick);
    return b;
  }

  /* --- Events and news: one pattern, two collections ------------------------ */

  var COLL = {
    events: {
      noun: "event",
      fields: [
        { name: "date", label: "Date", type: "date", required: true },
        { name: "title", label: "Title", required: true, placeholder: "e.g. Church Workday" },
        { name: "location", label: "Location", placeholder: "e.g. Bonita OPC" }
      ]
    },
    news: {
      noun: "news item",
      fields: [
        { name: "label", label: "Label", required: true, placeholder: "e.g. Week of October 4, 2026" },
        { name: "title", label: "Headline", required: true },
        { name: "body", label: "Text", type: "textarea", required: true }
      ]
    }
  };
  var cache = { events: [], news: [] };

  function load(name) {
    return fetch(API + "/" + name, { cache: "no-store" }).then(function (r) { return r.json(); })
      .then(function (list) { cache[name] = list; return list; });
  }

  function find(name, id) {
    for (var i = 0; i < cache[name].length; i++) if (cache[name][i].id === id) return cache[name][i];
    return null;
  }

  function addItem(name) {
    var c = COLL[name];
    openForm({
      title: "Add " + c.noun, fields: c.fields, submit: "Add " + c.noun,
      onSubmit: function (v) {
        return api("POST", "/" + name, v).then(function () { say("Added."); return load(name).then(refresh); });
      }
    });
  }

  function editItem(name, id) {
    var c = COLL[name], item = find(name, id);
    if (!item) return;
    openForm({
      title: "Edit " + c.noun, fields: c.fields, values: item,
      onSubmit: function (v) {
        return api("PUT", "/" + name + "/" + id, v).then(function () { say("Saved."); return load(name).then(refresh); });
      }
    });
  }

  function deleteItem(name, id) {
    var c = COLL[name], item = find(name, id);
    if (!item) return;
    openForm({
      title: "Delete this " + c.noun + "?",
      message: "“" + item.title + "” will be removed from the website.",
      submit: "Delete", danger: true,
      onSubmit: function () {
        return api("DELETE", "/" + name + "/" + id).then(function () {
          say("Deleted.", function () {
            var copy = {};
            c.fields.forEach(function (f) { copy[f.name] = item[f.name] || ""; });
            api("POST", "/" + name, copy).then(function () { say("Restored."); return load(name).then(refresh); })
              .catch(function (ex) { say(ex.message); });
          });
          return load(name).then(refresh);
        });
      }
    });
  }

  function wireItems(container, name) {
    if (!container) return;
    container.querySelectorAll("[data-id]").forEach(function (el) {
      var id = el.getAttribute("data-id");
      if (!id || el.classList.contains("adm-item")) return;
      el.classList.add("adm-item");
      var actions = function () {
        return [
          { label: "Edit", run: function () { editItem(name, id); } },
          { label: "Delete", danger: true, run: function () { deleteItem(name, id); } }
        ];
      };
      var dots = document.createElement("button");
      dots.type = "button";
      dots.className = "adm-dots";
      dots.setAttribute("aria-label", "More options");
      dots.innerHTML = DOTS;
      dots.addEventListener("click", function (e) {
        e.stopPropagation();
        var r = dots.getBoundingClientRect();
        showMenu(r.right - 150, r.bottom + 4, actions());
      });
      el.appendChild(dots);
      el.addEventListener("click", function (e) {
        if (e.target.closest("a, button")) return;
        editItem(name, id);
      });
      el.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        e.stopPropagation();
        showMenu(e.clientX, e.clientY, actions());
      });
    });
  }

  var upcoming = document.getElementById("upcoming-events");
  var recent = document.getElementById("recent-events");
  var news = document.getElementById("news-items");

  if (upcoming) upcoming.parentNode.insertBefore(addButton("Add event", function () { addItem("events"); }), upcoming);
  if (news) news.parentNode.insertBefore(addButton("Add news item", function () { addItem("news"); }), news);

  function wireAll() {
    wireItems(upcoming, "events");
    wireItems(recent, "events");
    wireItems(news, "news");
  }
  document.addEventListener("bopc:rendered", wireAll);
  Promise.all([upcoming || recent ? load("events") : null, news ? load("news") : null]).then(refresh);

  /* --- Wednesday Bible study location -------------------------------------- */

  var locSpan = document.querySelector(".panel .js-bible-location");
  if (locSpan) {
    locSpan.closest(".panel").appendChild(editButton("Change location", function () {
      fetch(API + "/site-settings", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (s) {
        openForm({
          title: "Wednesday Bible study location",
          message: "Shown in the footer of every page and on this schedule. Leave it blank to show “the church”.",
          fields: [{ name: "bibleStudyLocation", label: "Location", placeholder: "the church" }],
          values: s,
          onSubmit: function (v) {
            return api("PUT", "/site-settings", v).then(function () {
              document.querySelectorAll(".js-bible-location").forEach(function (el) {
                el.textContent = v.bibleStudyLocation || "the church";
              });
              say("Saved. Every page now shows the new location.");
            });
          }
        });
      });
    }));
  }

  /* --- Sermon caption (sermons page) ---------------------------------------- */

  var note = document.getElementById("sermon-note");
  if (note) {
    note.parentNode.insertBefore(editButton("Edit caption", function () {
      openForm({
        title: "Caption for the latest sermon",
        message: "Optional. Shown beside the video. The video itself always updates from YouTube on its own.",
        fields: [{ name: "description", label: "Caption", type: "textarea" }],
        values: { description: note.hidden ? "" : note.textContent },
        onSubmit: function (v) {
          return api("PUT", "/sermon-note", v).then(function () {
            note.textContent = v.description;
            note.hidden = !v.description;
            say(v.description ? "Caption saved." : "Caption removed.");
          });
        }
      });
    }), note.nextSibling);
  }
})();
