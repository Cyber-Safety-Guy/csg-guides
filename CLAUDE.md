# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A static website hosted at `guides.cybersafetyguy.com` — a free resource hub for parents on child online safety. It contains no build step, no framework, and no package manager. All pages are plain HTML/CSS/JavaScript files served directly via GitHub Pages.

## Deployment

The site is deployed automatically via GitHub Pages on every push to `main`. The `CNAME` file routes the custom domain. There is no staging environment.

## Site structure

All pages share `style.css` and load Google Fonts. Each HTML page is self-contained (styles are often scoped inline at the top of the file using `<style>` blocks within `<head>`).

- `index.html` — landing hub; dynamically counts guides and presentations by fetching `guides.json`
- `guides.html` — filterable guide library; reads `guides.json` to render cards
- `wizard.html` — 4-step parental controls wizard (age → device → app → concern); content is embedded directly in the HTML
- `conversation.html` — conversation guide generator (role/age/platform/concern inputs)
- `contract.html` — 3-tier printable digital safety contract
- `presentations.html` — school presentations listing; reads `guides.json`
- `social.html` — social media / contact page
- `csg_threat_radar.html` — live threat feed pulling from 11 RSS sources (BBC, Guardian, Gov.uk, Europol, etc.)

## Content data

**`guides.json`** is the single source of truth for all guide cards and presentation entries. Each object has:
- `id` — category bucket (`platform-guides`, `online-risks`, `parental-controls`, `further-resources`, `school-presentations`)
- `type` — `"guide"` or `"presentation"`
- `isNew` — boolean, controls a "New" badge on the card
- `link` — direct URL to the PDF (hosted at `guides.cybersafetyguy.com/guides/`)
- `risks` — array of 3 strings shown as bullet points on the card

To add a new guide: add its PDF to `guides/`, add its thumbnail image to `images/`, then add a new entry to `guides.json`.

## Wizard content freshness

`wizard-sections-meta.json` tracks the last-verified date and Google Custom Search queries for each wizard section (14 sections covering devices D1–D7 and platforms P1–P7).

A GitHub Actions workflow (`.github/workflows/wizard-content-check.yml`) runs on the 1st of each month. It calls `scripts/check_wizard_content.py`, which queries the Google Custom Search API for recent news about each platform's parental controls and opens a GitHub issue if anything looks stale.

**Required secrets** for the workflow: `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_ID`.

To run the freshness check locally:
```bash
GOOGLE_CSE_API_KEY=... GOOGLE_CSE_ID=... DRY_RUN=true python scripts/check_wizard_content.py
```

After verifying a wizard section is still accurate, update `last_verified` to today's date in `wizard-sections-meta.json`.

## Design system

CSS custom properties are defined in `style.css`. Key tokens:
- `--navy-dark`, `--navy`, `--navy-card` — background hierarchy
- `--teal` (`#42CED0`) — primary accent colour
- `--grey` — secondary text
- `--childline-red` (`#C0392B`) — used for Childline donation strip

Fonts: **Orbitron** (headings/numbers), **Exo 2** (UI labels, cards), **IBM Plex Sans** (body copy).

## Sitemap

`sitemap.xml` is maintained manually. Update it when adding new pages.
