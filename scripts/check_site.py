"""Publishing safety check, run by build.sh after the site is built. If anything is missing the
build fails, Cloudflare doesn't publish, and the message says exactly what to fix.

Checks:
- every guide in guides.json: image and small thumbnail exist, its PDF exists and has a Title
- every guide page content file (pages/*.json): the format Content Studio produces (docs/GUIDE_PAGES.md),
  SEO limits, house rules (no em dashes, Childline in the help line), and that its PDF, image and
  internal links exist
- every built page: title, description, canonical link, and an entry in the sitemap

Usage: python3 scripts/check_site.py _site
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "_site"
BASE = "https://guides.cybersafetyguy.com"
errors = []


def err(where, msg):
    errors.append(f"{where}: {msg}")


def pdf_has_title(path):
    data = path.read_bytes()
    m = re.findall(rb"/Title\s*(\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f]*>)", data)
    return any(len(t) > 2 for t in m)


def local_target_ok(href):
    """Internal links must point at something that exists."""
    if href.startswith("/download?"):
        m = re.search(r"file=(guides/[A-Za-z0-9_.\-]+\.pdf)", href)
        return bool(m) and (ROOT / m.group(1)).is_file()
    if href.startswith("/guides/") and not href.endswith(".pdf"):
        return (ROOT / "pages" / (href.split("/")[2] + ".json")).is_file()
    if href.startswith("/"):
        name = href.strip("/").split("?")[0] or "index"
        return (ROOT / (name + ".html")).is_file() or (ROOT / name).exists()
    return True


# ---- guides.json ------------------------------------------------------------------------------
for g in json.loads((ROOT / "guides.json").read_text(encoding="utf-8")):
    if g.get("type") != "guide":
        continue
    where = f'guides.json "{g.get("title")}"'
    img = g.get("image")
    if not img or not (ROOT / "images" / img).is_file():
        err(where, f"image images/{img} is missing")
    elif not (ROOT / "images/thumbs" / (Path(img).stem + ".webp")).is_file():
        err(where, f"thumbnail images/thumbs/{Path(img).stem}.webp is missing (make a 560px WebP from the image)")
    m = re.search(r"(guides/[A-Za-z0-9_.\-]+\.pdf)$", g.get("link", ""))
    if m:
        pdf = ROOT / m.group(1)
        if not pdf.is_file():
            err(where, f"PDF {m.group(1)} is missing")
        elif not pdf_has_title(pdf):
            err(where, f"PDF {m.group(1)} has no Title in its properties (Google shows it in results)")

# ---- guide page content files -----------------------------------------------------------------
REQUIRED = ["slug", "name", "seo_title", "seo_description", "h1", "lead", "answer_question", "answer",
            "sections", "faq", "help", "sources", "updated"]
for f in sorted((ROOT / "pages").glob("*.json")):
    where = f"pages/{f.name}"
    try:
        p = json.loads(f.read_text(encoding="utf-8"))
    except ValueError as e:
        err(where, f"not valid JSON ({e})")
        continue
    for k in REQUIRED:
        if not p.get(k):
            err(where, f'"{k}" is missing')
    if p.get("slug") != f.stem or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", f.stem):
        err(where, f'"slug" must be lowercase-hyphenated and match the file name ({f.stem})')
    title = p.get("seo_title", "")
    if len(title) > 48:
        err(where, f'"seo_title" is {len(title)} characters; keep it to 48 so the full title with " | Cyber Safety Guy" fits in Google')
    d = len(p.get("seo_description", ""))
    if not 120 <= d <= 155:
        err(where, f'"seo_description" is {d} characters; it must be 120-155')
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", p.get("updated", "")):
        err(where, '"updated" must be a date like 2026-11-14')
    text = json.dumps(p, ensure_ascii=False)
    if "—" in text:
        err(where, "contains an em dash")
    if "0800 1111" not in p.get("help", ""):
        err(where, '"help" must include Childline, 0800 1111')
    if not 3 <= len(p.get("faq", [])) <= 8:
        err(where, '"faq" needs 3 to 8 questions')
    for i, s in enumerate(p.get("sections", [])):
        if not s.get("heading"):
            err(where, f"section {i + 1} has no heading")
    if p.get("pdf") and not (ROOT / p["pdf"]).is_file():
        err(where, f'PDF {p["pdf"]} is missing')
    if p.get("image") and not (ROOT / "images/thumbs" / f'{p["image"]}.webp').is_file():
        err(where, f'thumbnail images/thumbs/{p["image"]}.webp is missing')
    hrefs = [r.get("href", "") for r in p.get("related", [])] + re.findall(r"\]\((/[^)\s]+)\)", text)
    for h in hrefs:
        if not local_target_ok(h):
            err(where, f"link {h} points at something that doesn't exist")

# ---- built pages ------------------------------------------------------------------------------
sitemap = (SITE / "sitemap.xml").read_text(encoding="utf-8")
for f in sorted(list(SITE.glob("*.html")) + list((SITE / "guides").glob("*.html"))):
    rel = f.relative_to(SITE).as_posix()
    s = f.read_text(encoding="utf-8")
    for tag, label in ((r"<title>[^<]{10,}</title>", "title"), (r'<meta name="description" content="[^"]{50,}"', "description")):
        if not re.search(tag, s):
            err(rel, f"missing {label}")
    if rel in ("404.html", "download.html"):
        continue
    url = BASE + "/" + ("" if rel == "index.html" else rel[:-5])
    if f'<link rel="canonical" href="{url}">' not in s:
        err(rel, f"canonical link should be {url}")
    if f"<loc>{url}</loc>" not in sitemap:
        err(rel, f"not in sitemap.xml ({url})")

if errors:
    print("PUBLISHING CHECK FAILED. Fix these and push again:")
    for e in errors:
        print("  - " + e)
    sys.exit(1)
print("publishing check passed")
