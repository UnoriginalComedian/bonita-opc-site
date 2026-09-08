# Community features — the "community-first" lens

`ROADMAP.md` already covers a lot of ground (giving, iCal, Sunday School page,
sermon search, the members' app). This is a narrower pass: assuming the church
wants its website and companion app to actively *run* community life —
scheduling, sign-ups, care — rather than just describe it, what's missing?
Ordered the same way as ROADMAP.md, **S/M/L** = afternoon / few days / real project.

---

## Do these first

### 1. A real shared calendar, not a static list · S–M
`events.html` and the app's Events tab are both hand-maintained lists. The
church already has a rhythm — Sunday services, the Wednesday study, monthly
Trustees/Deacons meetings, Feast Days. Publish it as one calendar (Google
Calendar embed is the zero-cost option) with a **Subscribe** button, and every
member's phone calendar stays current without anyone re-typing it. This is the
same idea as ROADMAP's iCal item (#5), pushed further: subscribe once, not
per-event.

### 2. Turn the dish sign-up sheet into the pattern, not the exception · S
The app prototype already nails this for Feast Day and the workday (`app/church-app.html`,
sign-up sheets in the Events tab). The move is to reuse that exact component for
*anything* that needs headcount or hands: nursery rotation, sound booth,
greeters, setup/teardown, meal trains for a new baby or a family in the
hospital. One well-built sign-up-sheet component, reused everywhere, beats five
different Sign-Up Genius links pasted into emails.

### 3. Care requests as a category, not just prayer · S
The Prayer tab conflates two different needs: things to pray about, and things
someone needs *done* (a meal, a ride to an appointment, help moving). Splitting
"Prayer request" from "Practical need" and routing the second to the deacons
(who already exist as an office for exactly this) turns the app into
infrastructure the diaconate actually uses, not a suggestion box.

### 4. Newcomer follow-up, triggered by the visit form · S
`contact.html` posts nowhere yet (ROADMAP / README both flag this). Once it's
wired up, the highest-value version isn't "email lands in an inbox" — it's a
short, honest sequence: same-day thank-you, a name to look for on Sunday, and
one follow-up mid-week. A visitor who is remembered by name is the whole game
for a congregation this size.

---

## Worth a few days

### 5. Small group / fellowship finder · M
If Bonita has (or wants) home Bible studies or fellowship groups beyond the
Wednesday one at Rohr Park, a simple directory — day, neighborhood, contact —
lowers the barrier to showing up somewhere smaller than a Sunday service,
which is usually where actual belonging happens.

### 6. Volunteer rosters with standing reminders · M
Ushers, nursery, sound booth, coffee — these are usually a rotation someone
keeps in their head or a spreadsheet. A roster view ("you're up September 14")
with a reminder a few days out removes the job of remembering whose turn it is
from one overworked volunteer coordinator.

### 7. Room / building-use booking · S–M
Trustees and Deacons already meet on a schedule; if other groups use the
building (baby showers, a men's breakfast, VBS setup), a shared booking view
prevents the double-booked-fellowship-hall problem every church eventually has.

### 8. Milestones the congregation should know about · S
Baptisms, new members, weddings — a short "what's happened lately" list (or a
line in the bulletin-turned-homepage from ROADMAP #7) keeps a congregation of
sixty or seventy feeling like one body rather than several Sunday-morning
audiences.

---

## The delivery mechanism: the companion app, not the website

A website is pulled (someone has to remember to check it); an installed app on
a home screen is pushed. `app/church-app.html` is now a real installable PWA —
manifest, service worker, an install prompt — which matters here specifically
because most of the above (sign-up reminders, "you're on nursery this week,"
a new prayer request) are things people should be *notified* of, not things
they should have to go looking for. Real push notifications are the natural
next step once the app has a shared backend (see ROADMAP's note on
`app/church-app.html` — local-only today, shared storage is the fork in the
road) — background sync and the Notifications API are what turn "install this"
into "and now the deacons' meal train actually reaches people."

---

## Explicitly not reinventing

Before building any of the above: price Breeze or Church Community Builder
(ROADMAP already says this). A seventy-person congregation may get 90% of this
list from a $30/month tool with zero of it built or maintained by anyone here.
The honest recommendation is still "ask what they actually do today and where
it breaks" before writing code for any single item above.
