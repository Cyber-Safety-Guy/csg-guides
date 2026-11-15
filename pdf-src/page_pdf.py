"""Build a guide PDF from its guide page (pages/<slug>.json) in the standard PDF layout.

Usage (repo root): python3 pdf-src/page_pdf.py <slug> [<slug> ...]

The page file is the single source of truth for the wording. An optional sidecar,
pdf-src/pages/<slug>.json, adds things only the PDF needs:
  {"eyebrow": "App guide · 2026",            # overrides the page eyebrow
   "title": "Snapchat: what parents need to know",   # overrides the page h1
   "facts": [["Big text", "small text"], ...],        # 4 boxes beside the title (recommended)
   "group": [{"title": "Key settings", "sections": ["Screen time", "Apps"]}],  # merge short sections into one card grid
   "lists": {"What to avoid": "flags"},  # force a list style by section heading: flags, ticks, or quotes (no label)
   "skip": ["Section heading"],               # leave a section out of the PDF
   "source_note": "Sources: ..."}             # footer line (default: generic)
Output: guides/<pdf> (from the page's "pdf"), and if the guide's library image is a 2:3 poster,
a fresh 1024x1536 image and 560x840 thumbnail. 16:9 title cards are left alone.
"""
import html
import json
import re
import sys
from pathlib import Path

from build_pdfs import render  # same renderer as the hand-made sources

ROOT = Path(__file__).resolve().parent.parent
LINK = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
QUOTE = re.compile(r'^["“](.*?)["”]$')


def t(s):
    """Escape and drop link targets (a PDF reader sees the words, the web page has the links)."""
    return html.escape(LINK.sub(lambda m: m.group(1), s), quote=False).replace("'", "’")


def card(title, paras, cls="card"):
    ps = "".join(f"<p>{t(p)}</p>" for p in paras)
    return f'<div class="{cls}"><h3>{t(title)}</h3>{ps}</div>' if title else f'<div class="{cls}">{ps}</div>'


def grid(cards):
    n = len(cards)
    cls = "cols3" if n in (3, 6) else "cols2"
    if n == 1:
        return cards[0]
    return f'<div class="{cls}">{"".join(cards)}</div>'


def lst(items, heading="", style=None):
    quotes = all(QUOTE.match(i.strip()) for i in items)
    if style in ("flags", "ticks"):
        return style, "".join(f"<li>{t(i)}</li>" for i in items)
    if quotes:
        return "qs", "".join(f"<li>{t(QUOTE.match(i.strip()).group(1))}</li>" for i in items)
    kind = "flags" if re.search(r"sign|red flag|watch", heading, re.I) else "ticks"
    return kind, "".join(f"<li>{t(i)}</li>" for i in items)


def section_html(n, s, styles=None):
    style = (styles or {}).get(s["heading"])  # sidecar "lists": {heading: "flags" | "ticks" | "quotes"}
    out = [f'<section><h2><span class="n">{n}</span>{t(s["heading"])}</h2>']
    body, subs, items, terms = s.get("body", []), s.get("subsections", []), s.get("list", []), s.get("terms", [])
    if subs:
        if body:
            out.append("".join(f'<p style="margin-bottom:10px">{t(p)}</p>' for p in body))
        out.append(grid([card(x["heading"], x.get("body", [])) for x in subs]))
    elif terms:
        if body:
            out.append("".join(f'<p style="margin-bottom:10px">{t(p)}</p>' for p in body))
    if terms:
        out.append(grid([card(x["term"], [x["meaning"]]) for x in terms]))
    if items:
        kind, lis = lst(items, s["heading"], style)
        if kind == "qs":
            left = card("", body) if (body and not subs and not terms) else ""
            label = "" if style == "quotes" else '<h3 class="head" style="font-size:15px;margin-bottom:6px">Things you could say</h3>'
            block = f'<div>{label}<ul class="qs">{lis}</ul></div>'
            out.append(f'<div class="cols2">{left}{block}</div>' if left else block)
        else:
            if body and not subs and not terms:
                out.append("".join(f'<p style="margin-bottom:10px">{t(p)}</p>' for p in body))
            cols = ' class="%s cols2" style="display:grid;column-gap:14px"' % kind if len(items) > 4 else f' class="{kind}"'
            out.append(f"<ul{cols}>{lis}</ul>")
    elif body and not subs and not terms:
        out.append(card("", body))
    for p in s.get("after", []):
        out.append(f'<div class="note">{t(p)}</div>')
    out.append("</section>")
    return "".join(out)


def build_html(slug):
    p = json.loads((ROOT / "pages" / f"{slug}.json").read_text(encoding="utf-8"))
    side_f = ROOT / "pdf-src" / "pages" / f"{slug}.json"
    side = json.loads(side_f.read_text(encoding="utf-8")) if side_f.exists() else {}
    sections = [s for s in p["sections"] if s["heading"] not in side.get("skip", [])]
    # merge short sections into card grids
    groups = {g["sections"][0]: g for g in side.get("group", [])}
    grouped = {h for g in side.get("group", []) for h in g["sections"]}
    parts, n = [], 0
    by_head = {s["heading"]: s for s in sections}
    for s in sections:
        h = s["heading"]
        if h in groups:
            n += 1
            g = groups[h]
            cards = [card(x, by_head[x].get("body", [])) for x in g["sections"]]
            parts.append(f'<section><h2><span class="n">{n}</span>{t(g["title"])}</h2>{grid(cards)}</section>')
        elif h in grouped:
            continue
        else:
            n += 1
            parts.append(section_html(n, s, side.get("lists")))
    facts = "".join(f'<div class="fact"><b>{t(a)}</b><span>{t(b)}</span></div>' for a, b in side.get("facts", []))
    answer = (f'<div class="note" style="margin-top:16px"><strong>{t(p["answer_question"])}</strong> {t(p["answer"])}</div>'
              if p.get("answer") else "")
    source = side.get("source_note", "Sources listed in the full guide online. Checked November 2026")
    title = side.get("title", p["h1"])
    eyebrow = side.get("eyebrow", p["eyebrow"])
    return f"""<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<title>{t(p["name"])}: A Parent's Guide | Cyber Safety Guy</title>
<link rel="stylesheet" href="../guide.css">
</head><body><div class="page">
<header class="top"{' style="grid-template-columns:1fr"' if not facts else ''}>
  <div>
    <img class="logo" src="../../assets/brand/csg-header-dark.png" alt="Cyber Safety Guy">
    <div class="eyebrow">{t(eyebrow)}</div>
    <h1>{t(title)}</h1>
    <p class="lead">{t(p["lead"])}</p>
  </div>
  {f'<div class="facts">{facts}</div>' if facts else ''}
</header>
{answer}
{''.join(parts)}
<div class="help">
  <div class="card"><h3>Childline</h3><div class="num">0800 1111</div><p>Free and confidential, any time. childline.org.uk</p></div>
  <div class="card"><h3>The Mix (under 25s)</h3><div class="num">0808 808 4994</div><p>themix.org.uk</p></div>
  <div class="card"><h3>Full guide online</h3><p class="ink" style="font-weight:600">guides.cybersafetyguy.com/guides/{slug}</p></div>
</div>
</div>
<div class="bar"><span>Need to talk? Childline<b>0800 1111</b></span><span>You are not alone</span></div>
<div class="meta"><span>{t(source)}</span><span>Updated {t(month(p["updated"]))} · cybersafetyguy.com</span></div>
</body></html>"""


def month(d):
    y, m, _ = d.split("-")
    return ["January", "February", "March", "April", "May", "June", "July", "August", "September",
            "October", "November", "December"][int(m) - 1] + " " + y


def library_image(pdf):
    guides = json.loads((ROOT / "guides.json").read_text(encoding="utf-8"))
    items = guides if isinstance(guides, list) else guides.get("guides", [])
    for g in items:
        if g.get("link", "").endswith("/" + Path(pdf).name):
            return Path(g["image"]).stem
    return None


if __name__ == "__main__":
    from PIL import Image
    out_dir = ROOT / "pdf-src" / "gen"
    out_dir.mkdir(exist_ok=True)
    jobs = []
    for slug in sys.argv[1:]:
        p = json.loads((ROOT / "pages" / f"{slug}.json").read_text(encoding="utf-8"))
        src = out_dir / f"{slug}.html"
        src.write_text(build_html(slug), encoding="utf-8")
        img = library_image(p["pdf"])
        if img:
            try:
                w, h = Image.open(ROOT / "images" / f"{img}.png").size
                if w > h:
                    img = None  # 16:9 title card: keep it
            except FileNotFoundError:
                pass
        jobs.append((src, Path(p["pdf"]).name, img))
    render(jobs)
