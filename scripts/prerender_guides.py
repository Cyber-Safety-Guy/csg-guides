"""Build step: write the guide cards from guides.json into _site/guides.html, so search engines
(and visitors without JavaScript) see every guide. assets/library.js re-renders the same cards in
the browser and adds search, chips and copy-link. Run by build.sh; if it fails the page still works
through JavaScript alone."""
import html
import json
import re
import sys
from urllib.parse import urlencode

page = sys.argv[1]
guides = [g for g in json.load(open("guides.json", encoding="utf-8")) if g.get("type") == "guide"]


def pdf_path(link):
    m = re.search(r"(?:^|/)(guides/[A-Za-z0-9_.\-]+\.pdf)$", link or "")
    return m.group(1) if m else None


def thumb(image):
    return "/images/thumbs/" + re.sub(r"\.[a-z]+$", ".webp", image)


def card(g):
    e = lambda s: html.escape(s or "", quote=True)
    p = pdf_path(g.get("link"))
    href = "/download?" + urlencode({"file": p, "name": g["title"]}) if p else g.get("link", "")
    img = f'<img src="{e(thumb(g["image"]))}" alt="" loading="lazy" width="560" height="840">' if g.get("image") else ""
    new = '<span class="pill pill-new">New</span>' if g.get("isNew") else ""
    age = f'<div class="tags"><span class="pill">Age rating {e(g["ageRating"])}</span></div>' if g.get("ageRating") else ""
    return (f'<article class="card guide"><div class="guide-img">{img}{new}</div><div class="guide-body">'
            f'<h3><a href="{e(href)}" target="_blank" rel="noopener">{e(g["title"])}</a></h3>{age}<p>{e(g.get("desc"))}</p>'
            f'<div class="guide-actions"><a class="btn btn-primary btn-small" href="{e(href)}" target="_blank" rel="noopener" '
            f'aria-label="Open the {e(g["title"])} guide">Open the guide</a></div></div></article>')


s = open(page, encoding="utf-8").read()
count = 0
for cat in ("platform-guides", "online-risks", "parental-controls", "further-resources"):
    cards = "".join(card(g) for g in guides if g.get("id") == cat)
    count += cards.count("<article")
    s, n = re.subn(r'(<div class="guide-grid" id="grid-%s">)(</div>)' % cat, lambda m: m.group(1) + cards + m.group(2), s)
    if n != 1:
        sys.exit(f"grid-{cat} not found in {page}")
s = s.replace('<span id="total-line">There are 37 to choose from.</span>',
              f'<span id="total-line">There are {len(guides)} to choose from.</span>')
open(page, "w", encoding="utf-8").write(s)
print(f"prerendered {count} guide cards into {page}")
