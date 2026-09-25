#!/usr/bin/env python3
"""Check data/incidents.json and data/held.json before publishing.

Run from the repo root:
    python3 scripts/validate.py            # everyday check: errors fail, warnings print
    python3 scripts/validate.py --launch   # pre-launch check: warnings fail too

Errors are things that must never go live. Warnings are things that must be
cleared before launch: unverified entries and drone incidents without an
official confirmation.
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "incidents.json"
HELD = ROOT / "data" / "held.json"

STATUSES = {"attributed", "suspected", "unattributed", "withdrawn"}
TYPES = {
    "Arson", "Incendiary device", "Explosives", "Rail sabotage", "Undersea cable or pipeline",
    "Cyber-physical attack", "Drone disruption", "Drone attack", "Intimidation", "Foiled plot",
    "Other physical sabotage",
}
DRONE_TYPES = {"Drone disruption", "Drone attack"}
DRONE_CONFIRMERS = {"police", "military", "airport operator", "air traffic control"}
TARGETS = {
    "Transport", "Energy", "Communications", "Logistics and postal",
    "Defence industry and military supply", "Military sites", "Retail and commercial",
    "Water and utilities", "Government and public buildings", "Industry",
}
PRECISIONS = {"town", "approximate"}
REQUIRED = ["id", "date", "country", "place", "lat", "lon", "locationPrecision", "type", "status",
            "targetCategory", "target", "title", "summary", "impact", "note", "history", "sources",
            "verified", "lastChecked"]
OPTIONAL = {"droneConfirmedBy"}
ID_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")


def valid_date(s):
    if not isinstance(s, str) or not DATE_RE.match(s):
        return False
    p = [int(x) for x in s.split("-")]
    try:
        date(p[0], p[1] if len(p) > 1 else 1, p[2] if len(p) > 2 else 1)
    except ValueError:
        return False
    return s[:4] >= "2022"


def check_coords(where, e, errors):
    lat, lon = e.get("lat"), e.get("lon")
    if not isinstance(lat, (int, float)) or not 34 <= lat <= 72:
        errors.append(f"{where}: lat should be between 34 and 72.")
    if not isinstance(lon, (int, float)) or not -25 <= lon <= 45:
        errors.append(f"{where}: lon should be between -25 and 45.")
    for k in ("lat", "lon"):
        v = e.get(k)
        if isinstance(v, float) and len(repr(v).split(".")[-1]) > 3:
            errors.append(f"{where}: {k} has more than 3 decimals; use the nearest town.")


def check_sources(where, e, errors):
    srcs = e.get("sources")
    if not isinstance(srcs, list) or not srcs:
        errors.append(f"{where}: needs at least one source.")
        return
    for s in srcs:
        if not s.get("label") or not str(s.get("url", "")).startswith("https://"):
            errors.append(f"{where}: each source needs a label and an https:// link.")


def check_incidents(entries, errors, warnings):
    seen = set()
    today = date.today().isoformat()
    for n, e in enumerate(entries, 1):
        where = f"Incident {n} ({e.get('id', 'no id')})"
        for k in REQUIRED:
            if k not in e or e[k] in ("", None, []):
                if k != "verified":
                    errors.append(f"{where}: missing {k}.")
        extra = set(e) - set(REQUIRED) - OPTIONAL
        if extra:
            errors.append(f"{where}: unexpected fields {sorted(extra)}.")
        i = e.get("id", "")
        if i and not ID_RE.match(i):
            errors.append(f"{where}: id must be lowercase letters, numbers and hyphens.")
        if i in seen:
            errors.append(f"{where}: duplicate id.")
        seen.add(i)
        if not valid_date(e.get("date")):
            errors.append(f"{where}: date must be YYYY, YYYY-MM or YYYY-MM-DD, from 2022 on.")
        elif e["date"] > today:
            errors.append(f"{where}: date is in the future.")
        if e.get("status") not in STATUSES:
            errors.append(f"{where}: status must be one of {sorted(STATUSES)}.")
        if e.get("type") not in TYPES:
            errors.append(f"{where}: type '{e.get('type')}' is not on the agreed list.")
        if e.get("targetCategory") not in TARGETS:
            errors.append(f"{where}: targetCategory '{e.get('targetCategory')}' is not on the agreed list.")
        if e.get("locationPrecision") not in PRECISIONS:
            errors.append(f"{where}: locationPrecision must be 'town' or 'approximate'.")
        check_coords(where, e, errors)
        check_sources(where, e, errors)
        if len(e.get("summary", "")) > 400:
            errors.append(f"{where}: summary is over 400 characters.")
        hist = e.get("history", [])
        if not isinstance(hist, list) or not hist:
            errors.append(f"{where}: needs at least one history row.")
        else:
            for row in hist:
                if not valid_date(row.get("date")) or row.get("status") not in STATUSES or not row.get("reason"):
                    errors.append(f"{where}: each history row needs a date, a valid status and a reason.")
            if hist[-1].get("status") != e.get("status"):
                errors.append(f"{where}: the last history row must match the current status.")
        if not valid_date(e.get("lastChecked")) or len(e.get("lastChecked", "")) != 10:
            errors.append(f"{where}: lastChecked must be YYYY-MM-DD.")
        # Drone rule: only officially confirmed drone incidents go on the map.
        if e.get("type") in DRONE_TYPES and e.get("status") != "withdrawn":
            c = e.get("droneConfirmedBy")
            if c is None:
                warnings.append(f"{where}: drone incident has no official confirmation yet (droneConfirmedBy).")
            elif c not in DRONE_CONFIRMERS:
                errors.append(f"{where}: droneConfirmedBy must be one of {sorted(DRONE_CONFIRMERS)}.")
        if e.get("verified") is not True:
            warnings.append(f"{where}: not yet verified by the owner.")


def check_held(held, errors):
    for n, e in enumerate(held, 1):
        where = f"Held {n} ({e.get('id', 'no id')})"
        for k in ["id", "date", "country", "place", "lat", "lon", "type", "holdReason", "sources", "lastChecked"]:
            if not e.get(k) and e.get(k) != 0:
                errors.append(f"{where}: missing {k}.")
        check_coords(where, e, errors)
        check_sources(where, e, errors)


def main():
    launch = "--launch" in sys.argv
    errors, warnings = [], []
    try:
        entries = json.loads(DATA.read_text(encoding="utf-8"))
        held = json.loads(HELD.read_text(encoding="utf-8")) if HELD.exists() else []
    except json.JSONDecodeError as err:
        print(f"A data file is not valid JSON: {err}")
        sys.exit(1)
    check_incidents(entries, errors, warnings)
    check_held(held, errors)
    ids = {e.get("id") for e in entries}
    for e in held:
        if e.get("id") in ids:
            errors.append(f"Held entry {e.get('id')} is also in incidents.json.")
    for w in warnings:
        print("WARNING:", w)
    for er in errors:
        print("ERROR:", er)
    if errors or (launch and warnings):
        print(f"\nFailed: {len(errors)} error(s), {len(warnings)} warning(s).")
        sys.exit(1)
    print(f"\nOK: {len(entries)} incidents, {len(held)} held, {len(warnings)} warning(s).")


if __name__ == "__main__":
    main()
