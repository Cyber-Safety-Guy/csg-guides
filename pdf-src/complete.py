"""Build the Complete Parent's Guide (A4 book) from the guide pages.

Usage (repo root): python3 pdf-src/complete.py [dark|light|dyslexic ...] [--only slug,slug]

Every guide in the book comes from its page (pages/<slug>.json) and PDF sidecar
(pdf-src/pages/<slug>.json), the same wording as the website and the one-page PDFs.
Output: guides/CSG_Complete_Parents_Guide_<Dark|Light|Dyslexic>.pdf, plus the cover images
(images/CSG_Complete_Parents_Guide_<Dark|Light>.png, thumbs/..._Dark.webp) and the ?v= tag on
the cover in index.html and guides.html, so the new cover shows straight away.
Two passes: the first finds the page each guide starts on, the second fills the contents.
"""
import json
import sys
from pathlib import Path

from page_pdf import ROOT, section_html, t, month

PARTS = [
    ("Start here", "The conversations that matter most, and a map of the apps.",
     ["why-kids-dont-tell", "everyone-else-has-it", "platforms-your-child-uses"]),
    ("Online risks", "The risks that don't come with obvious warning signs.",
     ["online-grooming", "sextortion", "ai-chatbots", "ai-companions", "group-chats", "online-gaming-voice-chat",
      "online-challenges-trends", "livestreaming", "social-media-footprint", "sharenting", "pimeyes"]),
    ("App guides", "The apps and platforms children use, A to Z.",
     ["bereal", "character-ai", "chat-hour", "discord", "instagram", "kik", "locket-widget", "omoggle", "pinterest",
      "roblox", "snapchat", "tiktok", "whatsapp", "wizz", "x-twitter", "youtube", "youtube-shorts"]),
    ("Parental controls", "Setting up the devices in your home.",
     ["iphone-parental-controls", "ios-27-parental-controls", "android-parental-controls",
      "apple-watch-parental-controls", "screen-time"]),
]

THEMES = {
    "dark": dict(name="Dark", bg="#06192F", surface="#0B2440", text="#C8DCE3", head="#FFFFFF", accent="#1FD0DC",
                 muted="#9FB8C2", line="rgba(31,208,220,0.28)", tint="rgba(31,208,220,0.08)", on_accent="#06192F",
                 body="Inter", heading="Space Grotesk", size="10.5pt", lh="1.5", logo="csg-header-dark.png"),
    "light": dict(name="Light", bg="#FFFFFF", surface="#F2F7F9", text="#1E2B36", head="#06192F", accent="#0B7C86",
                  muted="#5A6B75", line="rgba(11,124,134,0.30)", tint="rgba(11,124,134,0.07)", on_accent="#FFFFFF",
                  body="Inter", heading="Space Grotesk", size="10.5pt", lh="1.5", logo="csg-header-light.png"),
    "dyslexic": dict(name="Dyslexic", bg="#FBF5E6", surface="#F3EAD3", text="#1B1B1B", head="#111111",
                     accent="#0B6B73", muted="#4A4A4A", line="rgba(11,107,115,0.35)", tint="rgba(11,107,115,0.08)",
                     on_accent="#FFFFFF", body="Lexend", heading="Lexend", size="12.5pt", lh="1.75",
                     logo="csg-header-light.png"),
}


def load(slug):
    p = json.loads((ROOT / "pages" / f"{slug}.json").read_text(encoding="utf-8"))
    sf = ROOT / "pdf-src" / "pages" / f"{slug}.json"
    return p, (json.loads(sf.read_text(encoding="utf-8")) if sf.exists() else {})


def guide_html(slug, theme):
    p, side = load(slug)
    sections = [s for s in p["sections"] if s["heading"] not in side.get("skip", [])]
    body = "".join(section_html(i + 1, s, side.get("lists")) for i, s in enumerate(sections))
    facts = "".join(f'<div class="fact"><b>{t(a)}</b><span>{t(b)}</span></div>' for a, b in side.get("facts", []))
    answer = (f'<div class="note"><strong>{t(p["answer_question"])}</strong> {t(p["answer"])}</div>'
              if p.get("answer") else "")
    return f"""<article class="guide">
<span class="marker">@@{slug}@@</span>
<div class="eyebrow">{t(side.get("eyebrow", p["eyebrow"]))}</div>
<h1>{t(side.get("title", p["h1"]))}</h1>
<p class="lead">{t(p["lead"])}</p>
{f'<div class="facts">{facts}</div>' if facts else ''}
{answer}
{body}
<div class="online">Full guide online, with sources: <b>guides.cybersafetyguy.com/guides/{slug}</b> · Updated {t(month(p["updated"]))}</div>
</article>"""


def book_html(theme_key, pages=None, only=None):
    th = THEMES[theme_key]
    pages = pages or {}
    toc, body, num = [], [], 0
    for i, (title, blurb, slugs) in enumerate(PARTS, 1):
        slugs = [s for s in slugs if not only or s in only]
        if not slugs:
            continue
        items = []
        for s in slugs:
            p, _ = load(s)
            num += 1
            items.append(f'<li><span>{t(p["name"])}</span><i></i><b>{pages.get(s, "")}</b></li>')
        toc.append(f'<div class="toc-part"><h3>Part {i}: {t(title)}</h3><ul>{"".join(items)}</ul></div>')
        body.append(f"""<section class="part"><span class="marker">@@part{i}@@</span>
<div class="part-n">Part {i:02d}</div><h1>{t(title)}</h1><p>{t(blurb)}</p>
<ul>{"".join(f"<li>{t(load(s)[0]['name'])}</li>" for s in slugs)}</ul></section>""")
        body += [guide_html(s, th) for s in slugs]
    fonts = ROOT / "assets" / "fonts"
    return f"""<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<title>The Complete Parent's Guide | Cyber Safety Guy</title>
<style>
@font-face {{ font-family: "Inter"; src: url("{(fonts / 'inter-var.woff2').as_uri()}") format("woff2"); font-weight: 100 900; }}
@font-face {{ font-family: "Space Grotesk"; src: url("{(fonts / 'space-grotesk-var.woff2').as_uri()}") format("woff2"); font-weight: 300 700; }}
@font-face {{ font-family: "Lexend"; src: url("{(ROOT / 'pdf-src' / 'fonts' / 'lexend-var.woff2').as_uri()}") format("woff2"); font-weight: 300 700; }}
:root {{ --navy: {th['bg']}; --surface: {th['surface']}; --text: {th['text']}; --white: {th['head']}; --cyan: {th['accent']};
  --muted: {th['muted']}; --line: {th['line']}; --tint: {th['tint']}; --amber: #C9962B; --red: #C0392B; --on: {th['on_accent']}; }}
@page {{ size: A4; margin: 16mm 0 18mm; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{ background: var(--navy); }}
body {{ padding: 0 15mm; font: 400 {th['size']}/{th['lh']} "{th['body']}", sans-serif; color: var(--text); -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
h1, h2, h3 {{ font-family: "{th['heading']}", sans-serif; color: var(--white); break-after: avoid; }}
strong, b {{ color: var(--white); font-weight: 600; }}
.marker {{ position: absolute; font-size: 5px; line-height: 1; color: var(--navy); white-space: nowrap; }}
.guide, .part, .help-page {{ position: relative; }}
.cover {{ height: 250mm; display: flex; flex-direction: column; justify-content: center; text-align: center; break-after: page; }}
.cover img {{ height: 150px; width: 150px; border-radius: 50%; margin: 0 auto 28px; }}
.cover .kicker {{ color: var(--cyan); letter-spacing: .16em; text-transform: uppercase; font-weight: 600; font-size: 10pt; }}
.cover h1 {{ font-size: 34pt; line-height: 1.05; margin: 10px 0 14px; }}
.cover p {{ max-width: 120mm; margin: 0 auto; }}
.cover .charity {{ margin-top: 40px; font-size: 9.5pt; color: var(--muted); }}
.toc {{ break-after: page; }}
.toc > h1 {{ font-size: 24pt; margin-bottom: 14px; }}
.toc-cols {{ columns: 2; column-gap: 10mm; }}
.toc-part {{ margin-bottom: 10px; break-inside: avoid; }}
.toc-part h3 {{ color: var(--cyan); font-size: 11.5pt; margin-bottom: 4px; }}
.toc ul {{ list-style: none; }}
.toc li {{ display: flex; align-items: baseline; gap: 6px; padding: 1.5px 0; }}
.toc li i {{ flex: 1; border-bottom: 1px dotted var(--line); }}
.part {{ break-before: page; break-after: page; padding-top: 70mm; }}
.part-n {{ color: var(--cyan); font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }}
.part h1 {{ font-size: 32pt; margin: 6px 0 10px; }}
.part ul {{ margin-top: 18px; list-style: none; columns: 2; }}
.part li {{ padding: 2px 0; }}
.guide {{ break-before: page; }}
.eyebrow {{ font-weight: 600; font-size: 8.5pt; letter-spacing: .14em; text-transform: uppercase; color: var(--cyan); margin-bottom: 4px; }}
.guide > h1 {{ font-size: 22pt; line-height: 1.1; margin-bottom: 8px; }}
.lead {{ margin-bottom: 12px; }}
.facts {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; break-inside: avoid; }}
.fact {{ background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; }}
.fact b {{ display: block; font: 700 12.5pt/1.15 "{th['heading']}"; color: var(--cyan); margin-bottom: 2px; }}
.fact span {{ font-size: 8.5pt; line-height: 1.35; display: block; }}
section {{ padding: 12px 0; border-top: 1px solid var(--line); }}
h2 {{ font-size: 13.5pt; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }}
h2 .n {{ display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--cyan); color: var(--on); font-size: 10.5pt; flex: none; }}
.cols2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }}
.cols3 {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }}
.cols2 > .card:last-child:nth-child(odd) {{ grid-column: 1 / -1; }}
.card {{ background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; break-inside: avoid; }}
.card h3 {{ font-size: 10.5pt; margin-bottom: 4px; color: var(--cyan); }}
.card p + p {{ margin-top: 5px; }}
.note {{ margin: 8px 0 12px; background: var(--tint); border-left: 3px solid var(--cyan); border-radius: 0 8px 8px 0; padding: 8px 12px; break-inside: avoid; }}
ul.ticks, ul.flags, ul.qs {{ list-style: none; }}
ul.ticks li, ul.flags li, ul.qs li {{ position: relative; padding-left: 20px; margin: 3px 0; break-inside: avoid; }}
ul.ticks li::before {{ content: "✓"; position: absolute; left: 2px; color: var(--cyan); font-weight: 700; }}
ul.flags li::before {{ content: "!"; position: absolute; left: 3px; top: .25em; width: 12px; height: 12px; border-radius: 50%; background: var(--amber); color: #06192F; font: 800 9px/12px "Inter"; text-align: center; }}
ul.qs li::before {{ content: "“"; position: absolute; left: 2px; top: -3px; color: var(--cyan); font: 700 18pt/1 "Space Grotesk"; }}
.online {{ margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--line); font-size: 9pt; color: var(--muted); }}
.online b {{ color: var(--cyan); }}
.help-page {{ break-before: page; }}
.help-page h1 {{ font-size: 24pt; margin-bottom: 10px; }}
.help-page .card {{ margin-bottom: 8px; }}
.help-page .num {{ font: 700 15pt/1.2 "{th['heading']}"; color: var(--cyan); }}
</style></head><body>
<div class="cover">
  <img src="{(ROOT / 'assets' / 'brand' / 'csg-logo-photo-720.png').as_uri()}" alt="Cyber Safety Guy">
  <div class="kicker">{num} guides, one handbook · November 2026</div>
  <h1>The Complete Parent's Guide</h1>
  <p>Plain-English online safety for parents, teachers and safeguarding professionals. Every guide is checked against the latest platform changes and UK guidance.</p>
  <p class="charity">100% of subscription income is donated to Childline (NSPCC)<br>cybersafetyguy.com · Childline 0800 1111 · childline.org.uk</p>
</div>
<div class="toc"><h1>Contents</h1><div class="toc-cols">{"".join(toc)}
  <div class="toc-part"><h3>Help</h3><ul><li><span>Where to get help</span><i></i><b>{pages.get("help", "")}</b></li></ul></div></div></div>
{"".join(body)}
<div class="help-page"><span class="marker">@@help@@</span><h1>Where to get help</h1>
  <div class="cols2">
  <div class="card"><h3>Childline</h3><div class="num">0800 1111</div><p>Free and confidential for children and young people, any time. childline.org.uk</p></div>
  <div class="card"><h3>The Mix (under 25s)</h3><div class="num">0808 808 4994</div><p>Support on anything from mental health to money. themix.org.uk</p></div>
  <div class="card"><h3>CEOP</h3><p>Report online grooming or sexual abuse of a child. ceop.police.uk</p></div>
  <div class="card"><h3>Police</h3><div class="num">999 or 101</div><p>999 if a child is in immediate danger, 101 otherwise.</p></div>
  <div class="card"><h3>Report Remove</h3><p>Childline and the IWF help under-18s get nude images taken down. childline.org.uk/report-remove</p></div>
  <div class="card"><h3>Samaritans</h3><div class="num">116 123</div><p>Free, any time, for anyone who's struggling, including parents. samaritans.org</p></div>
  <div class="card"><h3>NSPCC helpline for adults</h3><div class="num">0808 800 5000</div><p>Advice if you're worried about a child. nspcc.org.uk</p></div>
  </div>
  <p style="margin-top:12px">Every guide in this book is also online, with sources, at guides.cybersafetyguy.com. You are not alone.</p>
</div>
</body></html>"""


FOOTER = """<div style="width:100%;font:8px Inter,sans-serif;color:{muted};padding:0 15mm;display:flex;justify-content:space-between;
height:10mm;align-items:center">
<span>Cyber Safety Guy · The Complete Parent's Guide</span><span>Childline 0800 1111 · Page <span class="pageNumber"></span></span></div>"""
HEADER = "<span></span>"


def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))


def build(theme_key, only=None):
    import fitz
    from playwright.sync_api import sync_playwright
    th = THEMES[theme_key]
    out = ROOT / "guides" / f"CSG_Complete_Parents_Guide_{th['name']}.pdf"
    src = ROOT / "pdf-src" / "gen" / f"complete-{theme_key}.html"
    src.parent.mkdir(exist_ok=True)
    pages = {}
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        for _ in range(2):
            src.write_text(book_html(theme_key, pages, only), encoding="utf-8")
            page.goto(src.as_uri())
            page.wait_for_load_state("networkidle")
            page.evaluate("document.fonts.ready")
            page.pdf(path=str(out), format="A4", print_background=True, display_header_footer=True,
                     header_template=HEADER, footer_template=FOOTER.format(**th),
                     margin={"top": "16mm", "bottom": "18mm", "left": "0", "right": "0"})
            doc = fitz.open(out)
            for i, pg in enumerate(doc):
                pg.draw_rect(pg.rect, color=None, fill=hex_rgb(th["bg"]), overlay=False)
                txt = pg.get_text()
                for chunk in txt.split("@@")[1::2]:
                    pages.setdefault("".join(chunk.split()), i + 1)
            doc.save(str(out) + ".tmp", garbage=3, deflate=True)
            doc.close()
            Path(str(out) + ".tmp").replace(out)
        browser.close()
    print(f"guides/{out.name}: {len(fitz.open(out))} pages")


def cover_images(theme_key):
    import hashlib
    import re
    import fitz
    from PIL import Image
    name = THEMES[theme_key]["name"]
    if name not in ("Dark", "Light"):
        return
    pix = fitz.open(ROOT / "guides" / f"CSG_Complete_Parents_Guide_{name}.pdf")[0].get_pixmap(dpi=200)
    im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    big = im.resize((813, round(im.height * 813 / im.width)), Image.LANCZOS)
    png = ROOT / "images" / f"CSG_Complete_Parents_Guide_{name}.png"
    big.save(png, optimize=True)
    if name != "Dark":
        return
    th = big.resize((560, round(big.height * 560 / 813)), Image.LANCZOS)
    canvas = Image.new("RGB", (560, 840), big.getpixel((5, 5)))
    canvas.paste(th, (0, (840 - th.height) // 2))
    canvas.save(ROOT / "images" / "thumbs" / "CSG_Complete_Parents_Guide_Dark.webp", quality=82)
    v = hashlib.md5(png.read_bytes()).hexdigest()[:8]
    for page in ("index.html", "guides.html"):
        f = ROOT / page
        f.write_text(re.sub(r"CSG_Complete_Parents_Guide_Dark\.png(\?v=[0-9a-f]+)?\"",
                            f'CSG_Complete_Parents_Guide_Dark.png?v={v}"', f.read_text(encoding="utf-8")), encoding="utf-8")
    print(f"  cover images updated (v={v})")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
        args = [a for a in args if a not in only and "," not in a]
    for key in args or list(THEMES):
        build(key, only)
        if not only:
            cover_images(key)
