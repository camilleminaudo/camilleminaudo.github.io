#!/usr/bin/env python3
"""Refresh data/publications.json from ORCID (works list) and Crossref (metadata).

Runs weekly in GitHub Actions; can also be run by hand:
    python scripts/update_publications.py

Only the Python standard library is used. Edit ORCID below if it changes.
Items you add by hand go in data/publications-manual.json, which this script never touches.
"""
import datetime as dt
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# ---- config ---------------------------------------------------------------
ORCID = "0000-0003-0979-9595"
CONTACT = "https://github.com"  # polite-pool identifier for Crossref; optional
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "publications.json"
# Work types kept on the site (ORCID vocabulary -> site category)
TYPE_MAP = {
    "journal-article": "article",
    "review": "article",
    "conference-paper": "proceedings",
    "book-chapter": "chapter",
    "book": "book",
    "preprint": "preprint",
    "dissertation-thesis": "thesis",
    "data-set": "data",
    "software": "software",
    "conference-abstract": "abstract",
    "conference-poster": "abstract",
    "conference-presentation": "abstract",
}
# DOIs that are never shown (corrections, referee replies, supplements)
SKIP_PATTERNS = [r"-ac\d+$", r"-supplement$", r"-rc\d+$"]
SKIP_TITLE = re.compile(r"^(author correction|correction|erratum|reply to|response to)", re.I)
# ---------------------------------------------------------------------------


def get_json(url, headers=None, retries=3):
    req = urllib.request.Request(url, headers={"User-Agent": f"research-site-updater ({CONTACT})", **(headers or {})})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code in (429, 500, 502, 503) and attempt < retries - 1:
                time.sleep(5 * (attempt + 1))
                continue
            raise
        except urllib.error.URLError:
            if attempt < retries - 1:
                time.sleep(5)
                continue
            raise
    return None


def clean(text):
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def short_author(a):
    family = a.get("family") or a.get("name") or ""
    given = a.get("given") or ""
    initials = "".join(p[0] for p in re.split(r"[\s\-.]+", given) if p)
    return f"{family} {initials}".strip()


def crossref(doi):
    data = get_json("https://api.crossref.org/works/" + urllib.parse.quote(doi))
    return (data or {}).get("message")


def orcid_works():
    data = get_json(f"https://pub.orcid.org/v3.0/{ORCID}/works", {"Accept": "application/json"})
    if not data:
        sys.exit("ORCID returned nothing — check the ORCID iD.")
    for group in data.get("group", []):
        summ = group["work-summary"][0]
        ids = (summ.get("external-ids") or {}).get("external-id") or []
        doi = next((i["external-id-value"] for i in ids if i["external-id-type"] == "doi"), None)
        date = summ.get("publication-date") or {}
        yield {
            "title": clean(((summ.get("title") or {}).get("title") or {}).get("value")),
            "type": summ.get("type", "other"),
            "year": int((date.get("year") or {}).get("value") or 0) or None,
            "journal": clean((summ.get("journal-title") or {}).get("value")),
            "doi": doi.lower().strip() if doi else None,
            "url": (summ.get("url") or {}).get("value"),
        }


def main():
    items = []
    seen = set()
    for w in orcid_works():
        doi = w["doi"]
        if doi and (doi in seen or any(re.search(p, doi) for p in SKIP_PATTERNS)):
            continue
        category = TYPE_MAP.get(w["type"], "other")
        entry = {
            "title": w["title"],
            "authors": [],
            "year": w["year"],
            "journal": w["journal"],
            "doi": doi,
            "url": f"https://doi.org/{doi}" if doi else w["url"],
            "type": category,
        }
        if doi:
            meta = crossref(doi)
            time.sleep(0.2)
            if meta:
                entry["title"] = clean((meta.get("title") or [entry["title"]])[0]) or entry["title"]
                entry["authors"] = [short_author(a) for a in meta.get("author", [])]
                entry["journal"] = clean((meta.get("container-title") or [entry["journal"]])[0]) or entry["journal"]
                parts = ((meta.get("issued") or {}).get("date-parts") or [[None]])[0]
                entry["year"] = parts[0] or entry["year"]
                if "egusphere-egu" in doi:
                    entry["type"] = "abstract"
                elif meta.get("type") == "posted-content" and category == "other":
                    entry["type"] = "preprint"
            seen.add(doi)
        if not entry["title"] or SKIP_TITLE.match(entry["title"]):
            continue
        items.append(entry)

    items.sort(key=lambda x: (-(x["year"] or 0), x["title"].lower()))
    out = {
        "source": f"ORCID {ORCID} + Crossref",
        "updated": dt.date.today().isoformat(),
        "items": items,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(items)} items to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
