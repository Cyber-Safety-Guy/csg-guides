"""Build step: turn each guide page content file (pages/<slug>.json) into _site/guides/<slug>.html.

The content files use the same format Content Studio's "Guide page" output produces (see
docs/GUIDE_PAGES.md). This script owns everything search engines care about, so every page gets it
the same way: title, description, canonical, share tags, Article/Breadcrumb/FAQ structured data,
the library link (guides.json "page") and the sitemap entry. Run by build.sh after the copy step.

Usage: python3 scripts/build_pages.py _site
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://guides.cybersafetyguy.com"
SITE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "_site"
LINK = re.compile(r"\[([^\]]+)\]\(((?:https://|/|tel:)[^)\s]+)\)")


def esc(s):
    return html.escape(s or "", quote=True)


def inline(s):
    """Escape text, then turn [words](https://... or /path) into links. Nothing else is allowed."""
    out, pos = [], 0
    for m in LINK.finditer(s or ""):
        out.append(html.escape(s[pos:m.start()], quote=False))
        out.append(f'<a href="{esc(m.group(2))}">{html.escape(m.group(1), quote=False)}</a>')
        pos = m.end()
    out.append(html.escape((s or "")[pos:], quote=False))
    return "".join(out)


def plain(s):
    return LINK.sub(lambda m: m.group(1), s or "")


def head(p, url):
    title = f'{p["seo_title"]} | Cyber Safety Guy'
    img = f'{BASE}/images/{p["image"]}.png' if p.get("image") else f"{BASE}/assets/brand/og-share-1200x630.png"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": p["h1"], "description": p["seo_description"], "url": url, "inLanguage": "en-GB",
         "datePublished": p.get("published", p["updated"]), "dateModified": p["updated"], "image": img,
         "author": {"@type": "Person", "name": "Dale", "alternateName": "Cyber Safety Guy", "url": "https://www.cybersafetyguy.com",
                    "jobTitle": "Child Online Safety Educator"},
         "publisher": {"@type": "Organization", "name": "Cyber Safety Guy", "url": f"{BASE}/",
                       "logo": {"@type": "ImageObject", "url": f"{BASE}/favicon-192.png"}}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{BASE}/"},
            {"@type": "ListItem", "position": 2, "name": "Guides", "item": f"{BASE}/guides"},
            {"@type": "ListItem", "position": 3, "name": p["name"], "item": url}]},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q["q"], "acceptedAnswer": {"@type": "Answer", "text": plain(q["a"])}} for q in p["faq"]]}]}
    return f"""<!DOCTYPE html>
<html lang="en-GB" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<meta name="description" content="{esc(p["seo_description"])}">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(p["seo_description"])}">
<meta property="og:url" content="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Cyber Safety Guy">
<meta property="og:image" content="{img}">
<meta property="og:image:alt" content="{esc(p["name"])} guide from Cyber Safety Guy">
<meta property="article:modified_time" content="{p["updated"]}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{img}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
<link rel="apple-touch-icon" href="/favicon-180.png">
<link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/space-grotesk-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/site.js"></script>
<script type="application/ld+json">
{json.dumps(ld, ensure_ascii=False, indent=1)}
</script>
</head>
"""


def chrome():
    """Header and footer, copied from the shared pages (index.html) so every page matches."""
    idx = (ROOT / "index.html").read_text(encoding="utf-8")
    header = idx[idx.index("<body>"):idx.index("</header>") + len("</header>")]
    header = header.replace(' aria-current="page"', "").replace('<a href="/guides">', '<a href="/guides" aria-current="page">', 1)
    footer = idx[idx.index('<footer class="bottom-footer">'):idx.index("</footer>") + len("</footer>")]
    return header + "\n", footer + "\n</body>\n</html>\n"


def section(s):
    out = [f'    <h2>{esc(s["heading"])}</h2>']
    out += [f"    <p>{inline(t)}</p>" for t in s.get("body", [])]
    for sub in s.get("subsections", []):
        out.append(f'    <h3>{esc(sub["heading"])}</h3>')
        out += [f"    <p>{inline(t)}</p>" for t in sub.get("body", [])]
    if s.get("list"):
        out.append("    <ul>" + "".join(f"<li>{inline(i)}</li>" for i in s["list"]) + "</ul>")
    if s.get("terms"):
        out.append('    <div class="terms">' + "".join(
            f'<div class="card term"><strong>{esc(t["term"])}</strong>{inline(t["meaning"])}</div>' for t in s["terms"]) + "</div>")
    out += [f"    <p>{inline(t)}</p>" for t in s.get("after", [])]
    return "\n".join(out)


def page_html(p):
    url = f'{BASE}/guides/{p["slug"]}'
    header, footer = chrome()
    updated = p["updated"]
    month = __import__("datetime").date.fromisoformat(updated).strftime("%B %Y")
    parts = [head(p, url), header, '<main id="main" class="wrap">',
             f'  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/guides">Guides</a> &rsaquo; {esc(p["name"])}</nav>',
             '  <article class="article">',
             f'    <p class="eyebrow">{esc(p.get("eyebrow", "Guide"))}</p>',
             f'    <h1>{esc(p["h1"])}</h1>',
             f'    <p class="byline">By Dale, Cyber Safety Guy (former RAF Police digital forensics investigator) &middot; Updated {month}</p>',
             f'    <p class="lead">{inline(p["lead"])}</p>',
             '    <section class="card answer" aria-labelledby="quick">',
             f'      <h2 id="quick">{esc(p["answer_question"])}</h2>',
             f'      <p>{inline(p["answer"])}</p>', "    </section>"]
    parts += [section(s) for s in p["sections"]]
    if p.get("teachers"):
        parts += ["    <h2>For teachers and DSLs</h2>", f'    <p>{inline(p["teachers"])}</p>']
    if p.get("pdf") or p.get("article_url"):
        btns = []
        if p.get("pdf"):
            q = f'file={p["pdf"]}&name={p["name"].replace(" ", "+")}'
            btns.append(f'<a class="btn btn-primary" href="/download?{esc(q)}">Download the guide (PDF)</a>')
        if p.get("article_url"):
            btns.append(f'<a class="btn btn-ghost" href="{esc(p["article_url"])}">Read my full article</a>')
        img = (f'<img src="/images/thumbs/{esc(p["image"])}.webp" alt="Cover of the {esc(p["name"])} guide" width="560" height="840" loading="lazy">'
               if p.get("image") else "")
        title = f'The one-page {esc(p["name"])} guide' if p.get("pdf") else "Read more"
        text = "Print it, pin it up or send it to another parent. Free, no sign-up." if p.get("pdf") else "My full article goes deeper, with sources."
        parts.append(f'    <section class="card download" aria-labelledby="dl-h">{img}<div><h2 id="dl-h">{title}</h2>'
                     f'<p>{text}</p><div class="btn-row">{"".join(btns)}</div></div></section>')
    parts.append("    <h2>Common questions</h2>\n    <div class=\"faq\">" + "".join(
        f'<details><summary>{esc(q["q"])}</summary><p>{inline(q["a"])}</p></details>' for q in p["faq"]) + "</div>")
    if p.get("related"):
        parts.append("    <h2>Related guides</h2>\n    <div class=\"related\">" + "".join(
            f'<a class="card" href="{esc(r["href"])}"><strong>{esc(r["title"])}</strong>{esc(r.get("text", ""))}</a>' for r in p["related"]) + "</div>")
    parts.append(f'    <section class="card help-box" aria-label="Where to get help"><p style="margin:0">{inline(p["help"])}</p></section>')
    parts.append("    <h2>Sources</h2>\n    <ol class=\"sources\">" + "".join(f"<li>{inline(s)}</li>" for s in p["sources"]) + "</ol>")
    parts += ["  </article>", "</main>", footer]
    return "\n".join(parts)


def main():
    pages = [json.loads(f.read_text(encoding="utf-8")) for f in sorted((ROOT / "pages").glob("*.json"))]
    (SITE / "guides").mkdir(exist_ok=True)
    for p in pages:
        (SITE / "guides" / f'{p["slug"]}.html').write_text(page_html(p), encoding="utf-8")

    # Library: guides whose PDF has a page get guides.json "page", so the card opens it
    by_pdf = {p["pdf"]: f'/guides/{p["slug"]}' for p in pages if p.get("pdf")}
    gj = SITE / "guides.json"
    guides = json.loads(gj.read_text(encoding="utf-8"))
    for g in guides:
        m = re.search(r"(guides/[A-Za-z0-9_.\-]+\.pdf)$", g.get("link", ""))
        if m and m.group(1) in by_pdf:
            g["page"] = by_pdf[m.group(1)]
    gj.write_text(json.dumps(guides, ensure_ascii=False, indent=2), encoding="utf-8")

    # Sitemap: one entry per page, with its updated date
    sm = SITE / "sitemap.xml"
    s = sm.read_text(encoding="utf-8")
    add = "".join(f'  <url>\n    <loc>{BASE}/guides/{p["slug"]}</loc>\n    <lastmod>{p["updated"]}</lastmod>\n    <priority>0.8</priority>\n  </url>\n'
                  for p in pages if f'{BASE}/guides/{p["slug"]}<' not in s)
    i = s.rindex("</urlset>")
    sm.write_text(s[:i] + add + s[i:], encoding="utf-8")
    print(f"built {len(pages)} guide page(s)")


if __name__ == "__main__":
    main()
