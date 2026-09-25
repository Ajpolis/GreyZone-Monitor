# GreyZone Monitor: build brief

This brief is the handover from design (Stage 1) and research (Stage 2) to the build (Stage 3). The design is signed off, so the job is to copy it faithfully rather than redesign it. When something here is unclear, ask the owner rather than inventing an answer.

The owner's planning doc and the design canvas live on claude.ai and may not be reachable from Claude Code. This file is written to stand on its own.

## What the site is

A map-first website for informed readers and people in the security industry, showing suspected Russian sabotage in Europe since February 2022. Every incident is graded by how strong the evidence of Russian involvement is. Clicking a dot opens the full record.

- **Tone:** sober, precise, transparent and calm. Not alarmist, militaristic, sensational or game-like.
- **Default theme:** light, with a dark option that follows the system setting.
- **No full-screen app feel:** the map sits inside a normal page with a header above and content below.

## Build order

Do one step per pull request, and preview each before moving on.

1. Data files and checker (`data/incidents.json`, `data/held.json`, `scripts/validate.py`) and the GitHub check.
2. Page skeleton, fonts and colour tokens for light and dark.
3. Map with markers for the four grades, plus foiled plots.
4. Left rail: grade toggles, search, "More filters", count, incident list.
5. Incident record in the rail, and per-incident links.
6. Phone layout: Map and List tabs, and the record as a bottom sheet.
7. Method and About pages. There is no Changelog page.
8. Grouping of nearby markers when zoomed out.
9. Accessibility and performance pass, then the acceptance checklist below.

## Layout (desktop)

Page width 1440px reference, 48px side margins.

- **Header (64px):** "GreyZone Monitor" wordmark on the left; links on the right: Map, Method, About.
- **Intro:** heading "Suspected Russian sabotage in Europe", one-line description, and totals by grade on the right.
- **Main area:** a 380px rail on the left and the map on the right, about 780px tall, in one bordered box with 10px radius.
  - **Rail, default view:** four grade toggles (Attributed, Suspected, Unattributed, Withdrawn), each with its count; a search box; a "More filters: type, country, year" button that reveals three dropdowns; a "Showing N of M" line; then the incident list, newest first. Each list item shows the grade marker, "Place, Country", date, headline and type.
  - **Rail, record view:** replaces the list when an incident is selected, with an "All incidents" back button at the top.
  - **Map:** zoom in and out plus "Show all of Europe" at top right; a legend at bottom left reading "Dots sit at the nearest town"; a hint at top left ("Select a dot or a list entry to open its record") that shows only when nothing is selected.
- **Below the map:** three columns. "How grading works" (the four definitions in short form), "About the data" (open sources, checked by hand, nearest town, no names), and "Latest changes" (the 3–5 most recent additions or regrades with dates, taken from each entry's history; no separate page).
- **Footer:** map credits, disclaimer, and a placeholder contact.

## Layout (phone, 390px reference)

- Header with the wordmark and a menu button.
- A compact intro: heading plus "N incidents since Feb 2022. Updated [date]."
- Map and List tabs.
- **Map tab:** the map about 300px tall with the legend beneath; selecting a dot opens the record as a bottom sheet with a drag handle and a close button.
- **List tab:** the grade toggles, search and "More filters" at the top, then the list.

## The incident record

In this order:

1. **Withdrawn banner** (Withdrawn entries only): "This entry has been withdrawn", followed by the reason.
2. Grade pill: the marker shape plus the grade name, on a soft signal-colour background.
3. Headline, in the display typeface.
4. "Place, Country. Date."
5. A fact box on a tinted background with three rows: Type, Target ("Target category: detail"), Impact.
6. What happened.
7. Attribution.
8. Grade history: one row per change.
9. Sources, as links.
10. "Last checked [date]" and a "Copy link" button.

## Visual design (Direction 1, "Research report")

Typefaces, from Google Fonts: **Newsreader** 500/600 for headings, the wordmark and totals; **IBM Plex Sans** 400/500/600 for everything else. Always give a fallback stack (Georgia, serif; system-ui, sans-serif).

| Token | Light | Dark |
| --- | --- | --- |
| Page background | #F6F7F6 | #14191F |
| Surface (rail, cards, header) | #FFFFFF | #1B222A |
| Ink (text) | #1B2430 | #E6EAEE |
| Muted text | #5A636E | #A3ADB8 |
| Lines and borders | #D9DDE1 | #313B46 |
| Sea / map background | #EDF0F2 | #1A2129 |
| Land (if drawing an outline map) | #DCE1E4 | #2A333D |
| Signal (markers) | #A3262A | #E8736C |
| Signal, soft (grade pill background) | #F7E9E9 | #3A2527 |
| Links | #1F4E8C | #8DB6F0 |

Tint the map tiles to match: a greyscale filter in light mode, and an inverted greyscale in dark mode, so the red markers are the loudest thing on screen.

## Markers

The grade must be readable without colour.

| Grade | Marker |
| --- | --- |
| Attributed | Solid circle in the signal colour, with a thin surface-colour outline |
| Suspected | Surface-colour circle with a thick signal ring and a small signal dot in the centre |
| Unattributed | Surface-colour circle with a dashed signal ring |
| Withdrawn | Grey (muted) ring with a diagonal slash |
| Foiled plot (any grade) | Hollow square in the signal colour; the grade shows in the record and the list |

- **Size:** about 16px, inside a 36px tap target.
- **Selection:** the selected marker gets a 30px ink ring.
- **Grouping:** nearby markers merge into a numbered signal circle when zoomed out, and split apart as you zoom in.

## Filters

- **Controls:** grade toggles (all on by default), type, country, year, and text search across place, country, headline, type and target.
- **Foiled plots:** they are a type, and their filter is **off by default**. Show a small "Show foiled plots" toggle near the grade toggles.
- **No results:** "No incidents match these filters", a line of advice, and a "Clear all filters" button.
- **Shareable views:** filters live in the web address (query string), so a filtered view can be shared.
- **Per-incident links:** each incident has its own link: `/#<id>`.

## Data contract

- `data/incidents.json` holds every published incident.
- `data/held.json` holds incidents on hold. **Never render held entries.**
- `scripts/validate.py` enforces every rule below. Run it before every commit; run `--launch` before going live.

Incident fields:

| Field | Meaning |
| --- | --- |
| id | country-date-place slug, unique |
| date | YYYY, YYYY-MM or YYYY-MM-DD |
| country, place | Nearest town or area |
| lat, lon | At most 3 decimals |
| locationPrecision | "town" or "approximate" (say "Location is approximate" in the record) |
| type | One of the agreed types (below) |
| status | attributed, suspected, unattributed or withdrawn |
| targetCategory, target | Category from the agreed list, plus a few words |
| title, summary, impact, note | Headline, what happened, damage and impact, who said what |
| history | List of {date, status, reason}; the last row matches status |
| sources | List of {label, url}; https only |
| verified | true once the owner has checked the sources |
| lastChecked | YYYY-MM-DD |
| droneConfirmedBy | Drone types only: police, military, airport operator or air traffic control |

- **Types:** Arson, Incendiary device, Explosives, Rail sabotage, Undersea cable or pipeline, Cyber-physical attack, Drone disruption, Drone attack, Intimidation, Foiled plot, Other physical sabotage.
- **Target categories:** Transport, Energy, Communications, Logistics and postal, Defence industry and military supply, Military sites, Retail and commercial, Water and utilities, Government and public buildings, Industry.

"Military sites" was added during research for drone flights over bases. It needs the owner's approval.

## Rules (also on the Method page)

**Grades:**
- **Attributed:** a government, prosecutor or court has publicly said Russia or its proxies were behind it.
- **Suspected:** officials have linked it to Russia, or declined to rule Russia out, without a formal attribution.
- **Unattributed:** deliberate sabotage that fits a pattern officials have linked to Russia, where no official has linked this particular incident. Sabotage with no Russia link at all is left out.
- **Withdrawn:** officials treated it as suspected sabotage and later ruled it out or could not confirm it. It stays visible, with the reason.
- When sources disagree, use the weaker grade.

**Drone rule:** a drone incident goes on the map only once police, the military, the airport operator or air traffic control confirms drones were present. Unconfirmed sightings go in `held.json`.

**Scope:** arson, incendiary devices, explosives, rail, cable and pipeline damage, cyber attacks with physical effects, drones at airports or critical sites, intimidation of officials, and foiled plots. The geography is the EU, UK, Norway, Switzerland, Moldova and the Western Balkans, from February 2022; Ukraine is excluded.

**Content:**
- No names of individuals anywhere, including people charged or convicted.
- Nearest town only.
- Summaries in our own words.
- Incidents only: never lists of sites that have not been attacked.

## Method page content

Sections: what counts as an incident; where and when; how attribution is graded (with the marker for each grade); the drone rule; foiled plots; rules for every entry; how incidents are found (checked by hand before publishing); limits (open sources only, attribution takes time, grades change); corrections (contact placeholder). No mention of a changelog.

## About page content

The site is an independent, volunteer-run log, not affiliated with any government, company or political group. It is run under a pseudonym: use the placeholder [NAME]. Contact: [contact address]. Credits: OpenStreetMap contributors. It points to AP, ACLED, IISS and the Leiden dataset (Schuurman, *Russian Operations Against Europe Dataset*, CC BY 4.0) as wider resources.

## Technical constraints

- Plain HTML, CSS and JavaScript; no build step and no framework.
- Leaflet 1.9.4 from cdnjs with integrity hashes; OpenStreetMap standard tiles with visible attribution.
- Ask the owner before adding any other library, including a marker-clustering plugin.
- Accessible: real buttons and links, keyboard navigation, visible focus, WCAG AA contrast in both themes, tap targets of at least 44px, nothing that relies on hover.
- Fast on mobile data: no images apart from map tiles, and fonts loaded with `display=swap`.

## Acceptance checklist

- [ ] Matches the layout, typefaces and colours above on a 375px phone and a large desktop, in light and dark themes
- [ ] Grades can be told apart without colour; foiled plots are squares
- [ ] Every state works: first load, no results, record open, withdrawn record, dense map with grouping
- [ ] Filters and the selected incident survive a page reload via the web address
- [ ] Held entries never appear
- [ ] Keyboard navigation works end to end
- [ ] Method and About pages are complete, with placeholders only for name and contact
- [ ] `python3 scripts/validate.py` passes; `--launch` passes before going live
