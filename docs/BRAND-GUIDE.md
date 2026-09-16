# Bonita OPC — Brand Guide

This is the identity system behind the redesigned site (`assets/css/site.css`), written
down so it can be reused anywhere else the church needs it: the bulletin, a banner,
a slide, a business card, social media. Every value below is copied straight out of
the stylesheet's `:root` block — if the two ever disagree, the stylesheet is correct
and this file needs updating.

## 1. Idea

**"Parish bulletin, not tech startup."** The reference points are the printed Sunday
bulletin and a hymnal: ruled panels, flat tinted grounds, small-caps labels set in a
serif, and information density that respects a reader's time. Warmth comes from color,
typography and real photography — never from rounded corners, drop shadows, or
gradients. Nothing here should look like it came from a template.

The palette is drawn from the building and the place itself: Bonita stucco, terracotta
roof tile, eucalyptus and chaparral, and the congregation's own orange accent color.

## 2. Logo

`assets/img/Bonita-Logo-w.png` — the OPC wordmark, white with a transparent
background. The stylesheet flips it to black for light backgrounds with
`filter: brightness(0)`; keep that relationship if the mark ever leaves the site.

- **Minimum clear space:** the height of the "b" in "bonita" on all sides.
- **Never:** recolor it, add a drop shadow or glow, stretch it, or place it on a
  busy photograph without the green scrim used in the site's header/footer.
- **On light stock:** use the black flip. **On the green ground or a photo:** use the
  white original.

## 3. Color

| Role | Token | Hex (light) | Hex (dark) | Use |
|---|---|---|---|---|
| Deep green | `--green` | `#2f4436` | `#d5dfcd` | Headings, masthead, footer, structure |
| Green, deepest | `--green-deep` | `#223328` | `#c2cfb8` | Announcement bar, hovers |
| Plaster (ground) | `--plaster` | `#f3ebdd` | `#191611` | Page background |
| Stock (paper) | `--stock` | `#fbf6ec` | `#201c15` | Panels, cards, form fields |
| Ink | `--ink` | `#241f19` | `#f0e8d9` | Body text |
| Tile (primary accent) | `--tile` | `#a6432a` | `#e08059` | Links, primary buttons, CTAs |
| Brass (secondary accent) | `--brass` | `#b8802a` | `#ddab53` | Labels, small-caps eyebrows, rules, emphasis |

Two accents, two jobs — never interchange them. **Tile (terracotta)** always means
"do this" (a link, a button, an action). **Brass** always means "this is a label or a
flourish," never an action. If you're picking a color for a new button, it's tile. For
a section eyebrow or a divider, it's brass.

The whole palette flips automatically for dark mode — see the stylesheet's `@media
(prefers-color-scheme: dark)` block. Don't hand-pick dark-mode colors elsewhere;
reuse these tokens.

### Contrast

Every text/background pairing above already meets WCAG AA (4.5:1 for body text). If a
new use case comes up, check `ink` on `plaster` (13.7:1) and `band-ink` (`#f4efe3`) on
`band-ground` (`#2f4436`, 11.9:1) as the reference pairs — both have generous headroom,
so a new tint should stay close to them rather than drifting toward a lighter gray "for
elegance."

## 4. Type

| Role | Face | Where |
|---|---|---|
| Display | **Vollkorn** (serif) | Headings, the order-of-service panel, small-caps labels, pull quotes, drop caps |
| Body | **Alegreya Sans** (humanist sans) | Paragraphs, nav, buttons, form fields |

Both load from Google Fonts (`assets/css/site.css` line 23) with Georgia/system-sans
fallbacks, so the page never blocks on the font and never goes unstyled if the fonts
fail to load.

- Body copy sits at 18px / 1.6 line-height, capped at a 66-character measure
  (`--measure`) — never let a paragraph run wider than that, even on a huge monitor.
- Headings use `text-wrap: balance` so lines break evenly, not ragged.
- Small-caps labels (`.label` in the CSS) are the site's signature typographic move —
  Vollkorn set in small caps on a rule, standing in for the uppercase-tracked "eyebrow"
  every template site uses. Reuse this, not a plain uppercase sans label, anywhere the
  church needs a section kicker (a bulletin insert, a flyer, a slide).

## 5. Signature details — reuse these, don't reinvent them

- **Ruled panels, not cards.** A bordered block with a flat `--stock` background and a
  1px `--rule` border (`.panel` in the CSS). No shadow, no radius beyond 2px. This is
  what should show up on a printed handout too — a boxed rule, like a bulletin insert.
- **The double rule** (`.rule-double`) — a 3px double border, used the way a hymnal
  uses one to separate sections. Good for a printed program or a slide transition.
- **The order-of-service panel** — brass top border, small-caps date header, dotted
  item dividers. This is the site's most distinctive component; reuse its structure
  (not necessarily its CSS) for the printed bulletin so the two feel like the same
  publication.
- **Drop cap** — used once per long-form page (`.opener::first-letter`), a book/bulletin
  move. Don't overuse it; it works because it's rare.

## 6. Voice

Plain and literal, the way the site's own copy is written — "What Sunday morning is
actually like," not "Experience Worship." A few working rules pulled from the existing
pages:

- Say what happens, not how it feels. "Communion, followed by the Feast Day fellowship
  meal" beats "Join us for a special time of fellowship."
- Scripture leads; slogans don't. The homepage hero is a Psalm, not a tagline — keep
  that pattern anywhere new copy is needed.
- No churchy jargon left unexplained for a first-time visitor. The "Plan Your Visit"
  page is the model: parking, dress, length, kids, answered directly.
- Confirm before publishing. Anything drafted rather than confirmed by the church gets
  the `.todo` "CONFIRM" marker in the HTML — the same discipline should carry to print:
  don't guess at a time or a policy and put it in front of the congregation.

## 7. Photography

- **Real people, real building, over stock.** `church-building-t.jpg` (the actual
  sanctuary) is the strongest asset the church owns — everything stock
  (`hymnal.jpg`, `bible-table.jpg`, `beach-sunset.jpg`) is a placeholder, not a
  destination. See §"Photography" in the project README for licensing notes on those
  three.
- The single highest-leverage thing the church can do for this brand: photos of their
  own congregation on an ordinary Sunday. One phone photo of people talking after the
  service does more for the brand than any stock library.
- Crop for the ruled, editorial feel — not overly soft, not filtered. The hero image
  uses a green-tinted gradient scrim (see `.hero::after`), not a flat dark overlay —
  reuse that scrim recipe for any new full-bleed photo so new pages match.

## 8. Applications beyond the website

Everything above is written to transfer directly to non-digital and third-party
material without a redesign:

- **Printed bulletin:** plaster/stock paper stock (or as close as the printer offers),
  Vollkorn for the order of service, brass rule dividers, tile only for a single call
  to action ("Sign up on the back table").
- **Social media graphics:** green ground, brass small-caps label, Vollkorn headline,
  tile accent on one button/link only. Keep the same restraint — one accent color
  doing the work, not a rainbow of highlight colors.
- **Business cards / name badges for elders & deacons:** green background, white
  logo flip, brass rule, Alegreya Sans for the name and role line.
- **Email newsletter:** plaster background, stock-colored content blocks, same type
  pairing. See the Modernization Roadmap for what to send it through.

## 9. What not to do

- Don't add drop shadows, glassmorphism, or rounded corners beyond `--radius: 2px`.
  It reads as a SaaS product, not a congregation.
- Don't introduce a third accent color. Tile and brass are it.
- Don't set headings in Alegreya Sans or body copy in Vollkorn — the contrast between
  the two faces is the point.
- Don't use an emoji as an icon anywhere. The site already draws real stroke-style SVG
  icons (menu, sun/moon, YouTube) — match that style for anything new.
- Don't center everything. The site's asymmetric layouts (`.split-major`,
  `.split-minor`) are deliberate — an off-center order-of-service panel outweighing a
  narrower column beside it reads as designed, not templated.
