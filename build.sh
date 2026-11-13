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
cp *.html guides.json style.css sitemap.xml CNAME .nojekyll _headers _redirects favicon* _site/
cp -r guides images _site/
echo "Built _site: $(find _site -type f | wc -l) files"
