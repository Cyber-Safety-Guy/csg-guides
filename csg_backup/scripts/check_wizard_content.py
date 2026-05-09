#!/usr/bin/env python3
"""
check_wizard_content.py
Cyber Safety Guy — Wizard Content Freshness Checker

Reads wizard-sections-meta.json, searches Google Custom Search API for recent
news about each platform/device's parental controls, and flags any sections
where results newer than DAYS_THRESHOLD exist.

Outputs a Markdown report to GITHUB_OUTPUT for use in a GitHub Actions workflow
that creates an issue if any sections are flagged.

Environment variables required:
  GOOGLE_CSE_API_KEY   — Google Custom Search JSON API key
  GOOGLE_CSE_ID        — Google Custom Search Engine ID (cx parameter)

Optional:
  DAYS_THRESHOLD       — How many days back to search (default: 35)
  DRY_RUN              — Set to "true" to print output without creating issue
"""

import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone, timedelta


# ── Config ────────────────────────────────────────────────────────────────────
API_KEY       = os.environ.get("GOOGLE_CSE_API_KEY", "")
CSE_ID        = os.environ.get("GOOGLE_CSE_ID", "")
DAYS_THRESHOLD = int(os.environ.get("DAYS_THRESHOLD", "35"))
DRY_RUN       = os.environ.get("DRY_RUN", "false").lower() == "true"
META_FILE     = os.environ.get("META_FILE", "wizard-sections-meta.json")

CSE_ENDPOINT  = "https://www.googleapis.com/customsearch/v1"
RATE_LIMIT_SLEEP = 1.2   # seconds between requests (100/day free tier)


def load_meta():
    with open(META_FILE) as f:
        return json.load(f)


def build_date_restrict(days):
    """Google dateRestrict parameter: d[N] = past N days."""
    return f"d{days}"


def search(query, days):
    """
    Query Google Custom Search API.
    Returns list of result dicts with keys: title, link, snippet, published_date.
    Returns empty list on any error (we flag but don't crash).
    """
    params = {
        "key": API_KEY,
        "cx":  CSE_ID,
        "q":   query,
        "num": 5,
        "dateRestrict": build_date_restrict(days),
        "fields": "items(title,link,snippet)",
    }
    url = f"{CSE_ENDPOINT}?{urllib.parse.urlencode(params)}"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            return data.get("items", [])
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  [HTTP {e.code}] {query[:60]} — {body[:200]}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"  [ERROR] {query[:60]} — {e}", file=sys.stderr)
        return []


def check_section(section, days):
    """
    Run all search queries for a section. Return list of flagged results.
    """
    flagged = []
    for query in section["search_queries"]:
        time.sleep(RATE_LIMIT_SLEEP)
        results = search(query, days)
        for r in results:
            flagged.append({
                "query":   query,
                "title":   r.get("title", ""),
                "link":    r.get("link", ""),
                "snippet": r.get("snippet", ""),
            })
    return flagged


def build_issue_body(flagged_sections, run_date, days):
    lines = [
        f"## 🛡️ Wizard Content Freshness Check — {run_date}",
        f"",
        f"Searched for results published in the last **{days} days**.",
        f"Sections with recent results may need their steps reviewing.",
        f"",
        f"---",
        f"",
    ]

    if not flagged_sections:
        lines += [
            "## ✅ All sections look up to date",
            "",
            "No recent results found for any section. No action required.",
            "",
        ]
    else:
        lines += [
            f"## ⚠️ {len(flagged_sections)} section(s) flagged for review",
            "",
            "> **Note:** A result appearing here does not mean the wizard content is wrong.",
            "> It means something relevant was published recently and is worth a quick check.",
            "",
        ]
        for sec in flagged_sections:
            lines += [
                f"### {sec['label']} ({sec['tool']})",
                f"**Last verified:** {sec['last_verified']}  ",
                f"**Help page:** [{sec['help_url']}]({sec['help_url']})",
                f"",
                f"Recent results found:",
                f"",
            ]
            for r in sec["results"]:
                lines += [
                    f"- **[{r['title']}]({r['link']})**",
                    f"  *Query: `{r['query']}`*  ",
                    f"  {r['snippet']}",
                    f"",
                ]
            lines += [
                f"**Action:** Review the steps for `{sec['id']}` in `wizard-content.json`.",
                f"If steps are still accurate, update `last_verified` to today's date.",
                f"",
                f"---",
                f"",
            ]

    lines += [
        "## How to update",
        "",
        "1. Click the links above and check the relevant help pages",
        "2. If steps have changed, update `wizard-content.json` with corrected steps",
        "3. Update `last_verified` for each reviewed section in `wizard-sections-meta.json`",
        "4. Close this issue",
        "",
        "---",
        f"*This issue was created automatically by the Wizard Content Checker.*  ",
        f"*Run date: {run_date}*",
    ]
    return "\n".join(lines)


def write_github_output(key, value):
    """Write multiline output to GitHub Actions output file."""
    output_file = os.environ.get("GITHUB_OUTPUT", "")
    if output_file:
        delimiter = "EOF_DELIMITER"
        with open(output_file, "a") as f:
            f.write(f"{key}<<{delimiter}\n{value}\n{delimiter}\n")
    else:
        print(f"\n--- {key} ---\n{value}\n")


def main():
    if not API_KEY or not CSE_ID:
        print("ERROR: GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID must be set.", file=sys.stderr)
        sys.exit(1)

    meta = load_meta()
    sections = meta["sections"]
    run_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    print(f"Wizard Content Freshness Check — {run_date}")
    print(f"Checking {len(sections)} sections, past {DAYS_THRESHOLD} days")
    print(f"{'DRY RUN — ' if DRY_RUN else ''}Rate limit sleep: {RATE_LIMIT_SLEEP}s per query")
    print()

    flagged_sections = []

    for section in sections:
        sid    = section["id"]
        label  = section["label"]
        queries = section["search_queries"]
        print(f"  Checking {sid} — {label} ({len(queries)} queries)...")

        results = check_section(section, DAYS_THRESHOLD)
        if results:
            print(f"    ⚠️  {len(results)} result(s) found — flagged for review")
            flagged_sections.append({
                "id":            sid,
                "label":         label,
                "tool":          section["tool"],
                "last_verified": section["last_verified"],
                "help_url":      section["help_url"],
                "results":       results,
            })
        else:
            print(f"    ✅ No recent results — looks good")

    print()
    print(f"Done. {len(flagged_sections)}/{len(sections)} sections flagged.")

    issue_body   = build_issue_body(flagged_sections, run_date, DAYS_THRESHOLD)
    has_flags    = len(flagged_sections) > 0
    issue_title  = (
        f"⚠️ Wizard Content Check — {len(flagged_sections)} section(s) need review ({run_date})"
        if has_flags else
        f"✅ Wizard Content Check — All sections up to date ({run_date})"
    )

    # Write outputs for the GitHub Action to consume
    write_github_output("has_flags",    "true" if has_flags else "false")
    write_github_output("issue_title",  issue_title)
    write_github_output("issue_body",   issue_body)
    write_github_output("flagged_count", str(len(flagged_sections)))

    if DRY_RUN:
        print("\n--- ISSUE BODY PREVIEW ---")
        print(issue_body)

    # Exit 0 always — the Action decides whether to create an issue
    sys.exit(0)


if __name__ == "__main__":
    main()
