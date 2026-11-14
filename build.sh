#!/usr/bin/env bash
# Build the public site into _site/. Used by Cloudflare Pages (build command: bash build.sh,
# output directory: _site). The site moved from GitHub Pages to Cloudflare Pages on 13 Nov 2026.
# Only the website is published: repo internals (content-studio/, tools/, scripts/, CLAUDE.md,
# README.md, wizard-sections-meta.json, .github/) stay in the repo but are never served.
# New top-level pages (*.html) and files in guides/ or images/ are picked up automatically;
# anything else the site needs must be added here.
set -euo pipefail
rm -rf _site
mkdir _site
cp *.html guides.json sitemap.xml robots.txt CNAME .nojekyll _headers _redirects favicon* _site/
cp -r guides images assets _site/
python3 scripts/build_pages.py _site            # guide pages from pages/*.json, library links, sitemap
python3 scripts/prerender_guides.py _site/guides.html || echo "Guide prerender skipped: the library still renders in the browser"
python3 scripts/check_site.py _site             # stops the publish if anything is missing
echo "Built _site: $(find _site -type f | wc -l) files"
