# GreyZone Monitor: instructions for Claude Code

A static website mapping suspected Russian sabotage in Europe since February 2022. The owner is not a developer: explain changes in plain language, keep the setup simple, and work in small pull requests.

**Read `BUILD_BRIEF.md` first.** It holds the signed-off design, the data contract and the build order. Copy the design; don't redesign it. If something is unclear, ask.

## Files
- `data/incidents.json`: every published incident.
- `data/held.json`: incidents on hold. Never render these.
- `scripts/validate.py`: the data checker. Run it after every data change. Before launch, run `python3 scripts/validate.py --launch`.
- `BUILD_BRIEF.md`: design, rules and acceptance checklist.

## Adding or changing an incident
1. Work from sources the owner gives you, or that you find. Every entry links at least one https source you actually opened.
2. Write the summary, impact and note in your own words. Never copy article sentences or bulk-import other datasets.
3. Fill every field in the shape used in `incidents.json`. Set `verified` to false; only the owner sets it to true.
4. Add a `history` row for every grade change; the last row must match `status`.
5. Drone incidents need `droneConfirmedBy` (police, military, airport operator or air traffic control). If no official body has confirmed drones were present, put the entry in `held.json` instead.
6. Run the checker and fix every error.
7. Tell the owner what you added or changed, the grade you chose, and why.

## Grading (do not change without the owner)
- **attributed:** a government, prosecutor or court has publicly said Russia or its proxies were behind it.
- **suspected:** officials link it to Russia or decline to rule Russia out, without a formal attribution.
- **unattributed:** deliberate sabotage fitting a pattern officials have linked to Russia, with no official link for this incident. No Russia link at all means it stays out.
- **withdrawn:** officials treated it as suspected sabotage and later ruled it out or could not confirm it. Keep it, with the reason.
- If sources disagree, choose the weaker grade and explain the disagreement in `note`.

## Hard limits
- No names of individuals anywhere, including people charged or convicted.
- Nearest town only; coordinates to at most 3 decimals.
- Incidents only. Never add lists, maps or analysis of sites that have not been attacked.

## Working conventions
- No frameworks, build tools or new external scripts without asking.
- Preview changes with `python3 -m http.server` and check the phone and desktop layouts, both themes, and a deep link (for example `/#pl-2024-05-12-warsaw-marywilska`).
- Keep commits small, with plain messages such as "Add 2025 Gotland water pump entry".
