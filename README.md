# Bonita OPC — website template

A modern replacement for [bonitaopc.org](https://www.bonitaopc.org), built from the
content already on their site.

Plain HTML, CSS and JavaScript. **No build step, no framework, no dependencies.**
Open `index.html` in a browser and it works. Upload the folder to any web host and
it works there too.

```
bonita-opc-site/
├── index.html          Home
├── visit.html          Plan Your Visit  (new — merges "What to Expect" + "Meeting Times")
├── about.html          About            (Mission + Doctrine + Government + Leadership)
├── sermons.html        Sermons          (featured video + searchable archive of 50)
├── watch-live.html     Watch Live       (auto-plays the channel's live stream + recent uploads)
├── events.html         Events & News
├── contact.html        Contact
├── assets/
│   ├── css/site.css    One stylesheet. All design tokens at the top.
│   ├── js/site.js      ~120 lines. Nav, theme toggle, sermon search, scroll reveal.
│   └── img/            Images pulled from the existing site.
├── tools/
│   ├── build.py        OPTIONAL generator — see "Editing" below.
│   └── sermons.json    The 50 sermons scraped from the current archive.
├── DESIGN.md           The design direction, palette, and type — read before restyling.
├── CONTENT-TODO.md     Everything the church must confirm before launch.
├── ROADMAP.md          Where to take this next, ordered by value.
├── app/                Phone companion prototype (events, sign-ups, prayer, directory).
└── AUDIT.md            What is wrong with the current site, and what changed here.
```

---

## What this fixes

The current site is a 2017 Webflow export dropped into Craft CMS. It still works,
but it shows its age. The short version:

| | Before | After |
|---|---|---|
| Above the fold | Auto-rotating carousel of stock photos | The actual church building, a verse, and one call to action |
| Home page spine | Four cramped columns | This Sunday's order of service, in full |
| History | Not mentioned anywhere | The 1971–1977 founding story, including the nine months the congregation spent building it |
| First-time visitor info | None | A whole page: parking, dress, service length, children, FAQ |
| Type | Condensed Oswald headings, ~14px body | Vollkorn + Alegreya Sans, 18px body, 66-character measure |
| Sermon archive | Unsearchable 50-row table | Searchable, filters as you type, readable as cards on phones |
| Dark mode | No | Yes, following the visitor's system setting |
| Structured data | None | `Church` schema — service times show up in Google and Maps |
| Broken links | `/live-stream-services` 404s but is indexed in Google | Gone; live-stream is a link to YouTube in the top bar |
| Sitemap | `sitemap.xml` returns an empty index | Static pages, nothing to break |

The full list is in `AUDIT.md`.

---

## Viewing it without a server

`preview/` holds the entire six-page site bundled into **one self-contained HTML
file** — every image base64-encoded, CSS and JS inlined, the six pages turned into
hash routes (`#/visit`, `#/about`, …).

- **`preview/bonita-opc-full-site.html`** — 1.8 MB, no dependencies. Double-click it,
  email it, drop it on a USB stick, open it on a phone. It needs no server and no
  internet except for the two Google Fonts (it falls back to Georgia and system sans
  without them).
- **`preview/_artifact-body.html`** — the same bundle minus the `<html>/<head>/<body>`
  wrapper, for publishing as a hosted preview link.

Regenerate both after any edit:

```bash
python3 tools/build.py     # pages
python3 tools/bundle.py    # bundle
```

**One caveat.** The bundle swaps the YouTube and Google Maps iframes for click-through
cards that open the same destination in a new tab. That is a limitation of the preview
sandbox, which blocks external hosts — *not* of the site. The real deployed version in
the project root keeps the live embeds.

---

## Brand guide & next steps

- `docs/BRAND-GUIDE.md` — the identity system (palette, type, signature details,
  voice) written down so it transfers to print, social, and anything else the
  church needs beyond the site. `docs/brand-guide-artifact.html` is the same
  content as a standalone, shareable page for the elders.
- `docs/MODERNIZATION-ROADMAP.md` — what else is worth doing, ordered by value
  for effort: online giving, a real contact-form backend, claiming the Google
  Business Profile, a church-management system, and more.
- `docs/print/` — print-ready templates built on the same palette and type:
  `bulletin.html` (a weekly two-page Sunday bulletin, order of worship and all —
  open it and print with Cmd/Ctrl+P) and `leadership-cards.html` (a sheet of six
  business-card-sized contact cards for the session, diaconate, and whoever is
  preaching that week). Both explain how to edit and print them in a comment at
  the top of the file.

## Before launch

Search the HTML for `class="todo"`. Every one is a **CONFIRM** chip on a piece of
copy that was drafted rather than taken from the church — parking, dress code,
service length, children, and the midweek Bible study time. They render as a
visible amber badge so nothing invented ships by accident.

`CONTENT-TODO.md` lists every one with the question to ask.

Once each is confirmed, delete the `<span class="todo">…</span>` tag. When they are
all gone, the `.todo` rule in `site.css` can go too.

---

## How they host it today

Worth knowing before proposing anything, because it decides how much work handover is.

| Layer | What it is |
|---|---|
| Domain | `bonitaopc.org`, registered 16 Feb 2005 through **eNom**, renews 16 Feb 2027 |
| DNS | **Cloudflare** (`coco.ns.cloudflare.com`, `sam.ns.cloudflare.com`) |
| CDN / proxy | **Cloudflare** in front of the origin |
| Origin server | **LiteSpeed** — the signature of shared cPanel hosting (Namecheap, A2, InMotion, Hostinger and similar all use it) |
| Application | **Craft CMS**, control panel at `/admin/login` |
| Front-end | A **Webflow export** from around 2017, cut into Craft Twig templates |
| Video / streaming | A **YouTube** channel; each sermon page embeds one video |

So: someone built it in Webflow, exported the HTML, and had a developer wire it into
Craft on a LiteSpeed shared host, with Cloudflare bolted on afterwards. Sermons,
events and news are real CMS entries — that part is worth keeping.

**Nobody needs to know the hosting password to evaluate this template.** But to
actually deploy it, someone needs either the cPanel/FTP login or the Craft admin
login. Ask the church for whichever they have; if they have neither, whoever set
it up in 2017 does.

---

## Three ways to put it live

### 1. Keep Craft, swap the templates *(best result, needs a developer)*

Craft keeps managing sermons, events and news — the church carries on adding entries
the way they do now — and these files become the new look. Each `.html` here maps to
a Twig template under `templates/`, with the repeated header and footer pulled into
`_layout.twig`. The loops that already exist in their templates (`{% for sermon in
craft.entries... %}`) drop straight into the markup here.

Roughly a day's work for someone who knows Twig. Nothing about their hosting changes.

### 2. Cloudflare Pages *(cheapest and fastest, loses the CMS)*

Their DNS is already at Cloudflare, so this is close to frictionless: connect a Git
repo or drag the folder into the Pages dashboard, point `bonitaopc.org` at it, done.
Free, fast, HTTPS included, and the LiteSpeed hosting bill goes away.

The catch: no CMS. Adding a sermon means editing `sermons.html`. Fine if one person
is comfortable doing that or `tools/build.py` gets wired to a spreadsheet — a real
problem otherwise. **Ask how they add sermons today before recommending this.**

### 3. Upload over the existing site *(quickest to demo, do not leave it this way)*

FTP the folder into a subdirectory like `/new/` on the current host and send them
`bonitaopc.org/new/`. Good for showing the elders something real without touching the
live site. Not a destination.

**Recommendation:** option 1 if the original developer is reachable, option 2 if they
are not and the church is willing to give up the CMS. Ask them which of those is true
before doing more work.

---

## Making the contact form work

`contact.html` has a form that posts nowhere. Pick one:

- **Formspree** — sign up, replace `action="#"` with the URL they give you. Free tier
  covers a church's volume. No server needed.
- **Netlify / Cloudflare Pages Forms** — add `data-netlify="true"` to the `<form>` tag
  if hosting there.
- **Craft's built-in forms** — if staying on Craft, whichever form plugin is already
  installed.

Whichever it is, the submissions need to reach a mailbox somebody actually reads.
Worth asking who that is.

---

## Editing

**By hand.** Open the `.html` files and edit. That is the intended way, and it will
not break anything.

**With the generator.** The header, footer and `<head>` are identical on all six pages,
so changing a nav link by hand means changing it six times. `tools/build.py` holds one
copy of each and regenerates every page:

```bash
python3 tools/build.py
```

It needs nothing but Python 3. Church details — address, phone, service times, the
YouTube URL — live in the `C` dictionary at the top; change one there and it updates
on every page including the structured data.

If the generator ever becomes a nuisance, delete `tools/` and keep editing the HTML.
The output does not depend on it.

**Re-skinning.** Every colour, font and spacing value is a custom property in the
`:root` block at the top of `assets/css/site.css`. Changing `--brand` recolours the
entire site, light and dark.

---

## Images

`assets/img/` holds what was already published on bonitaopc.org:

- `church-building-t.jpg` — the actual church. The hero image, and the best asset they have.
- `chism.jpg`, `skidmore.jpg`, `weld.jpg`, `york.jpg`, `0d314f1f-…jpg` — the elders and deacon.
- `hymnal.jpg`, `bible-table.jpg`, `beach-sunset.jpg` — **licensed stock photos.** The
  EXIF says Adobe Stock (`©Melanie`, `©Halfpoint`) and `©2016 David Levin Photography`.
  They are on the church's site already, so a licence presumably exists — but confirm it
  covers continued use before launch.
- `Bonita-Logo-w.png` — the OPC wordmark. White with transparency; the CSS flips it to
  black for the light theme with `filter: brightness(0)`.

**The single highest-value change the church can make is photographs of their own
congregation** — the sanctuary, people talking after the service, the midweek study at
Rohr Park. Stock photos of a family who have never been to Bonita say nothing. One
person with a phone on a Sunday morning would fix it.

---

## Browser support

Modern Chrome, Safari, Firefox and Edge. Uses `color-mix()`, `aspect-ratio` and CSS
nesting-free custom properties — all supported since 2023. No IE, no polyfills.

Accessibility: skip link, visible focus rings, labelled form fields, `aria-current`
on the active nav item, alt text throughout, and `prefers-reduced-motion` honoured
for every animation.
