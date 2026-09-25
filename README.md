# GreyZone Monitor: Stage 3 handover pack

This folder is the starting point for the build. Copy its contents into the root of the GitHub repository (replacing the earlier prototype files where names match), then open the repository in Claude Code and ask it to read `CLAUDE.md` and `BUILD_BRIEF.md` and start step 1 of the build order.

| File | What it is |
| --- | --- |
| `BUILD_BRIEF.md` | Signed-off design, data contract, rules, build order, acceptance checklist |
| `CLAUDE.md` | Standing instructions Claude Code reads in this folder |
| `data/incidents.json` | 57 incidents (19 verified, 38 awaiting your verification) |
| `data/held.json` | 3 drone incidents on hold until officially confirmed |
| `scripts/validate.py` | Data checker; `--launch` also fails on unverified entries |

Verification: set `"verified": true` on each entry once you've opened its sources. The checker lists every entry still waiting.
