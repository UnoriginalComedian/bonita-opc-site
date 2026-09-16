# Bonita OPC — Getting the church's systems back on their feet

Ordered by value-for-effort. Nothing here requires a big budget; most of it is a
free tier plus an afternoon. Items are independent — do them in any order, skip what
doesn't apply.

## Already done in this branch

- Site redesign (see `README.md` and `docs/BRAND-GUIDE.md`)
- Contact form now falls back to a working `mailto:` link instead of posting
  nowhere (`assets/js/site.js` — swap for Formspree/Netlify when ready, five minutes,
  see README "Making the contact form work")
- 404 page, `robots.txt`, `sitemap.xml` (the old Craft site's sitemap returned an
  empty index, invisible to Google)
- `Church` structured data so service times can surface directly in Google/Maps

## Free or near-free, do these first

1. **Claim the Google Business Profile.** Search "Bonita Orthodox Presbyterian
   Church" — if unclaimed, claim it at google.com/business. This is very often
   the *first* thing a newcomer sees, before the website. Add real photos, hours,
   and the phone number; it's free and takes 15 minutes.
2. **Wire up the contact form for real.** Sign up for Formspree (free tier, no
   credit card) and replace the placeholder `action="#"` in `contact.html`. Point
   submissions at whichever elder or the office actually checks email.
3. **Pick a giving/donation platform.** A church with no online giving option
   loses first-time and traveling givers. Options at this scale: **Givelify**
   (church-specific, no monthly fee, takes a per-transaction cut),
   **Tithe.ly**, or **Planning Center Giving**. Any of them embeds a "Give" button
   the site can link to — worth adding to the header nav once chosen.
4. **Decide the hosting path** (see README, "Three ways to put it live"). The
   current LiteSpeed/Craft/cPanel stack is 2017-era and someone is paying for it
   whether or not it's used well. Cloudflare Pages is free and their DNS is
   already on Cloudflare — the path of least resistance if the church is willing
   to give up the CMS and edit `sermons.html`/`events.html` by hand (or have one
   person do it).
5. **Get real congregation photos.** Covered in the Brand Guide — this is the
   single highest-leverage, lowest-cost thing here. One person with a phone on an
   ordinary Sunday.

## Worth doing this year

6. **A real church-management system**, not spreadsheets: **Breeze ChMS**
   ($$/mo, simplest to learn) or **Planning Center** (free tier, more features,
   steeper learning curve). Gets the church a real member directory, attendance,
   giving records, and event sign-ups in one place — and solves the "who updates
   the website" problem, since most of these publish an events widget the site
   can embed.
7. **A sermon podcast feed.** The sermons are already on YouTube — most podcast
   apps (Apple Podcasts, Spotify) can pull an RSS feed from a YouTube channel via
   a free service like **Podbean's YouTube import** or **Transistor**. Puts
   sermons in front of people who never think to open YouTube.
8. **Social media presence**, using the Brand Guide's palette/type so it looks
   like the same organization as the site. Even a low-effort Instagram/Facebook
   with the Sunday photo and the sermon title reaches people search never will.
9. **Email newsletter.** Mailchimp's free tier (up to 500 contacts) covers a
   congregation this size. Weekly bulletin + prayer requests, sent instead of (or
   alongside) a printed insert.
10. **An accessibility statement + real ADA pass.** The rebuilt site already ships
    the fundamentals (skip link, focus rings, alt text, `prefers-reduced-motion`);
    formalizing that with a short public statement protects a small nonprofit from
    the ADA-lawsuit-mill letters that target churches with older sites.

## Later, higher effort

11. **The member companion app** already prototyped in `app/church-app.html` —
    a phone-installable PWA (events, sign-ups, prayer requests, directory). It's
    a real prototype, not a mockup; worth a scoped project once the CMS/hosting
    question above is settled, since the app should read from whatever system of
    record the church lands on.
12. **Migrate off Craft entirely if adopting Breeze/Planning Center** — both
    publish calendars and, in Breeze's case, a directory that can replace what
    Craft is doing today, which would let the church drop the CMS hosting bill
    for good (see README hosting option 2).

## Don't do

- Don't rebuild this in a JS framework. The whole point of "no build step, no
  dependencies" is that a non-developer at the church can open an `.html` file and
  edit it. A framework migration would take that away for no visitor-facing benefit.
- Don't add a chatbot, a stock-photo carousel, or a giving "campaign thermometer."
  None of them fit a congregation this size, and they're exactly the pattern this
  redesign moved away from (see `README.md`, "What this fixes").
