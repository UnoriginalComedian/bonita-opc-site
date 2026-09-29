# Bonita OPC website — handoff (2026-09-29)

Written for the next Claude session doing a full audit. Read this before touching
anything — it covers what exists, why it's built the way it is, what's known-broken,
and what Joel has asked for but isn't built yet.

## 1. What this is

Church website for Bonita Orthodox Presbyterian Church. Static HTML/CSS/JS, no build
step, no framework. Repo: `UnoriginalComedian/bonita-opc-site`, local checkout at
`~/Developer/bonita-opc-site`. Joel is doing this as a favor for the church's elders
(non-technical audience — Lee McMorris approves changes, is "not tech savvy").

## 2. Architecture

- **Site hosting**: GitHub Pages, serving the repo root from `main`. A `CNAME` file
  in the repo root points it at `bonitaopc.org`.
- **DNS**: Cloudflare (account `joelpchism@gmail.com`), zone `bonitaopc.org`. All 5
  DNS records (4 A records to GitHub Pages IPs + `www` CNAME) are **Proxied**
  (orange cloud) — confirmed working, GitHub's own Let's Encrypt cert for
  `bonitaopc.org` (not the generic `*.github.io` fallback) is issued and live.
- **Domain registrar**: Porkbun (transferred there from Enom mid-session; David Guy
  of Pioneer Design was the original builder/host, now fully out of the picture —
  his old hosting is confirmed dead, not just unreachable via DNS).
- **Admin backend**: a Cloudflare Worker, `workers/events-admin/` in this repo,
  deployed as `bonita-events-admin` (account `joelpchism@gmail.com`, same as DNS).
  Routed onto the real domain via `wrangler.toml` routes: `bonitaopc.org/admin`,
  `/admin/*`, `/api/*`. The old `*.workers.dev` URL is disabled now that real routes
  exist.
- **Storage**: one Cloudflare KV namespace (`EVENTS`, id in `wrangler.toml`) holding
  everything — events list, news list, and two singleton settings values. No
  database, no R2, nothing else.

## 3. Admin system

- **URL**: `bonitaopc.org/admin` (redirects to `/admin/events`)
- **Password**: `Bonita-Bells-1972` (set as a Worker secret, not in source). Change
  it with `wrangler secret put ADMIN_PASSWORD` from `workers/events-admin/`.
- **Pages**: `/admin/events`, `/admin/news`, `/admin/sermon`, `/admin/settings` — a
  shared header nav, one login gated by a password stored in `sessionStorage`
  (`bopc-admin-pw`) so it doesn't re-prompt when moving between pages.
- **Events** (`/admin/events`): add/edit/delete, date/title/location, Google Places
  autocomplete on location. List has search + numbered pagination (25/page),
  built to handle low-thousands of records without server-side paging.
- **News** (`/admin/news`): same pattern, fields are label/title/body.
- **Sermon** (`/admin/sermon`): one optional `description` field, shown beside the
  "most recent sermon" video on `sermons.html`. The video itself is a YouTube
  "uploads playlist" embed and **always auto-updates on its own** — this field
  never affects that, it's purely an optional caption. Blank = nothing extra shown,
  nothing breaks.
- **Settings** (`/admin/settings`): one `bibleStudyLocation` field. Drives the
  Wednesday Bible study location across the footer on every page + the homepage
  prose + the Events page schedule, via `.js-bible-location` elements and a fetch
  in `assets/js/site.js`. **Currently blank** — falls back to the hardcoded "the
  church" already in the HTML. Note: an earlier commit (`06ed93a`, before this
  session) says "Wednesday Bible study is back at the church, not Rohr Park" — so
  "the church" is believed correct as of now. Confirm with Joel/Lee before changing.
  Only affects the *current* recurring meeting — past dated events already in the
  admin keep their own recorded location untouched.

### API (all under `/api/`, same Worker)
- `GET /api/events`, `GET /api/news` — public, no auth.
- `POST/PUT/DELETE /api/events[/:id]`, same for `/api/news` — need header
  `X-Admin-Password: <password>`.
- `GET/PUT /api/sermon-note`, `GET/PUT /api/site-settings` — singleton values
  (`{description}` and `{bibleStudyLocation}`), same auth rule on PUT.
- CORS is wide open (`Access-Control-Allow-Origin: *`) since none of the GET data
  is sensitive and writes are password-gated regardless.

### Current KV data (as of this handoff)
- 6 events (migrated from the site's old hardcoded list — see §5)
- 3 news items (same)
- `sermon-note` and `site-settings` both blank/default

## 4. Public site → admin wiring

- `events.html`: `#upcoming-events` (future, ascending), `#recent-events` (past,
  descending, capped at 6 via `data-events-recent`), `#news-items` — all fetch from
  the API on page load via `assets/js/site.js`, and if the fetch fails or returns
  empty, **whatever's already hand-written in the HTML stays as a fallback**. This
  fallback pattern is used everywhere the admin feeds the site — check it's intact
  wherever you see `data-events-api` / `data-news-api` / `.js-bible-location` /
  `#sermon-note`.
- `sermons.html`: `#sermon-note` (starts `hidden`, JS unhides it only if a
  description is set).
- Every page's footer + `index.html` prose + `events.html` "Our rhythm" panel:
  `.js-bible-location` spans.
- `watch-live.html`: separate mechanism, not admin-driven — `site.js` checks the
  current Pacific time against the two Sunday service windows and swaps the
  `live_stream` embed for the "most recent upload" embed outside those windows, so
  it never shows YouTube's bare "video unavailable" placeholder.

## 5. What happened this session (chronological, high-level)

1. Site was already built and mostly polished going in (hero video, brand system,
   print bulletin/cards, photo pages — see `docs/MODERNIZATION-ROADMAP.md` and
   `docs/BRAND-GUIDE.md` for that earlier work).
2. **Domain fire drill**: David (original builder) prematurely took the live site
   offline while "handing off" the domain. Resolved by: transferring
   `bonitaopc.org` from Enom to Porkbun, pointing nameservers at Cloudflare, adding
   the GitHub Pages A/CNAME records, and waiting out GitHub's SSL cert issuance.
   Site is now fully live and the cert is confirmed issued correctly.
3. PageSpeed pass: hero video/image compression, async font loading, contrast
   fixes (brass accent color split into on-light/on-dark variants), click-to-load
   Google Maps embed (was loading unconditionally). Accessibility/Best
   Practices/SEO all 100; Performance in the 80s–90s (the remaining gap is
   GitHub Pages' fixed cache headers, which Cloudflare proxying should improve —
   not fully re-verified after the DNS switch).
4. Photo work: new elder/deacon headshots (Chism, Weld, Skidmore, McMorris),
   consistent tight face-crops, group photo added to About page, Scott York's
   existing photo flipped for orientation consistency.
5. Content/UX cleanup per Joel + an outside reviewer: hero flipped to lead with
   the verse (big) over the "Gathered since 1972" tagline (small), removed
   redundant "Watch Live" banner (was showing 3x on the homepage, now removed
   site-wide entirely), native CSS View Transitions for page-to-page fades,
   CONFIRM/`.todo` badges swept off the live site, internal links cleaned up to
   avoid `/index.html` showing in the address bar.
6. **The admin system** (bulk of the session, see §3) — built from scratch,
   starting as a Google-Sheet idea Joel rejected in favor of a real on-site admin.
   Went through several rounds of scope expansion in real time: events →
   events+news → search/pagination/multi-page nav → Google Maps autocomplete →
   sermon note → site settings.

## 6. Known issues / things to verify

- **`docs/print/leadership-cards.html`** and **`docs/print/bulletin.html`**: still
  reference the *old* hardcoded elder photo filenames/content in places — these are
  print pieces (not the live site), last touched before the photo re-crop work.
  Worth a pass if Joel wants to actually print them.
- **Mailchimp signup form** (`events.html`, "Stay in the loop"): still has
  `CONFIRM` placeholders in the form action URL. Needs a real Mailchimp account
  under the church's Gmail — not something I can set up. Functionally dead until
  configured (form just won't submit anywhere real).
- **PageSpeed**: not re-run since the DNS/Cloudflare-proxy switch. Worth a fresh
  check now that caching should be better.
- **KV write race condition**: discovered during data migration — firing multiple
  POST requests back-to-back (within ~1-2 seconds) can lose writes, because each
  request does read-modify-write on the same KV key without any locking, and KV
  reads aren't always read-your-own-write consistent across rapid requests. Not
  likely to matter for a human clicking "Save" one event at a time, but worth
  knowing if anything ever bulk-imports data again (add a delay between requests,
  several seconds, if so).
- **`app/church-app.html`** and **`app/_artifact-app.html`**: a separate
  self-contained "church app" tool with its own hardcoded `EVENTS` array and
  service worker. Deliberately *not* wired to the new admin/KV system — out of
  scope, treat as a separate artifact unless Joel says otherwise.
- The Worker's admin HTML is all generated from JS template strings in
  `workers/events-admin/src/index.js` (~700 lines) — no separate HTML/CSS files,
  by design (single-file Worker deploy). If this grows further, consider whether
  it still belongs in one file.

## 7. Requested but NOT built yet

Joel asked for these; none are done. Don't assume they exist:

- **Photo upload for events** — explicitly deferred, needs Cloudflare R2 (object
  storage) set up as a new resource, plus design decisions (resize/crop limits,
  storage cost). Joel said "if you would like, that could be great" — soft ask,
  not confirmed priority.
- **Email wiring "through the admin page"** — vague scope as given ("wire up the
  emails"). Could mean notifying subscribers on new events/news, or something
  else. Needs a real conversation before building — flagged for Joel's call with
  himself/elders, not yet discussed in enough detail to build.
- **Admin-only inline controls on the public `events.html` page** ("if an admin is
  signed in, they see an Add button right there on the events page, regular
  visitors don't") — scoped but not implemented. The technical path is clear:
  `sessionStorage` is shared across `bonitaopc.org/*` (same origin as the admin),
  so `events.html` can detect an active admin session the same way the admin pages
  do, and reveal extra UI. Was about to start this when the session moved on to
  other requests.
- **Recovering the ~1500 historical events from the old site** — the old host's
  actual content is confirmed gone (checked directly by IP, not just via DNS).
  Wayback Machine has at least one snapshot (`bonitaopc.org/news`, dated
  2026-06-10) but `archive.org`'s lookup API was down mid-session and this was
  never fully checked. The reliable path is asking David for a real database
  export — not something scrapeable from the live web at this point.
- **YouTube Data API for auto-pulling sermon titles** — explicitly not built by
  design; Joel confirmed he just wants the optional description field instead
  (done, see §3/§4). Don't build this unless he asks again specifically.

## 8. Secrets / credentials in play

- Cloudflare account: `joelpchism@gmail.com` (same account for DNS + Worker + KV).
- Worker secrets (not in source, set via `wrangler secret put` from
  `workers/events-admin/`): `ADMIN_PASSWORD` (see §3), `GOOGLE_MAPS_API_KEY`
  (Joel's own key — client-exposed by design for Maps JS; the real security
  boundary is the HTTP referrer restriction on the key in Google Cloud Console,
  worth confirming that's actually set to `bonitaopc.org` only).
- No other API keys, tokens, or accounts are wired into this repo.

## 9. Suggested audit focus for a fresh pass

- Confirm cache/performance state post-DNS-switch (§6).
- Sanity-check the admin end to end with real admin access (create/edit/delete on
  all four pages, confirm the public site reflects changes, confirm fallbacks work
  if you simulate the Worker being unreachable).
- Look for any other hardcoded content on the live site that duplicates what the
  admin now manages (a second sweep beyond what this session caught).
- Decide/confirm scope on the three open asks in §7 before building any of them.

## 10. Audit pass (2026-09-29)

Fixed:
- **Event dates showed a day early** everywhere (`new Date("YYYY-MM-DD")` is UTC
  midnight = previous afternoon in Pacific). `site.js` now builds dates locally.
  Side effect: the Feast Day event, stored in KV as 2026-08-31 (a Monday), now
  shows as Monday. It should be 2026-08-30. Fix it in /admin/events.
- Upcoming events: shows a plain "nothing else scheduled" line when the API has no
  future events, instead of the stale Sep 30 / Rohr Park fallback.
- Homepage "The Lord's Day · August 23" box and "Next Sunday: Communion" were a
  month stale → now an evergreen "Every Lord's Day" schedule.
- All 50 sermon links pointed at the dead old site (`/sermons/...` → 404). Now
  YouTube channel searches by title. Added the 8 sermons from Aug 30 to Sep 27
  (from the YouTube RSS feed) with direct video links; homepage list updated.
- 404 page: root-relative paths (it rendered unstyled at nested URLs) and
  forwards old-site URLs (`/sermons/*`, `/news`, `/about`, etc.) to the matching page.
- Canonical/OG/JSON-LD/sitemap/robots: `www.bonitaopc.org` → `bonitaopc.org`
  (www 301s to apex). Outreach page added to sitemap.
- Hero verse: much smaller, lighter weight, two lines on desktop.
- Dark mode: orange buttons had 2.8:1 contrast, now dark text (6.5:1).
- Sermons/Watch Live: white-outline buttons were invisible in light mode.
- Watch Live: same video appeared twice outside service hours; repeated
  "nothing to click" copy removed.
- Mailchimp signup section hidden (`hidden` attr) until it is configured.
- Sunday School added to the Events and Contact schedules. Copy plainer on
  Home, Watch Live, Outreach, Events, Sermons, 404; duplicated mission
  statement removed from Visit (still on About).

Open questions are listed in the session summary. The biggest: YouTube
descriptions say Wednesday Bible study is at **7 p.m.**, while the site says 6–8.
