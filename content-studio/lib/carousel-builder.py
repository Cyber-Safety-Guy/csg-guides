#!/usr/bin/env python3
"""
CSG Carousel Builder
Usage: python3 carousel-builder.py <topic> <json_file> <out_dir>
Outputs: <out_dir>/carousel_pngs.zip
"""

import sys, json, base64, zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

# ── Args ──────────────────────────────────────────────────────────────────────
if len(sys.argv) < 4:
    print("Usage: carousel-builder.py <topic> <json_file> <out_dir>", file=sys.stderr)
    sys.exit(1)

TOPIC    = sys.argv[1]
JSON_FILE = Path(sys.argv[2])
OUT_DIR   = Path(sys.argv[3])
OUT_DIR.mkdir(parents=True, exist_ok=True)
SLIDES_DIR = OUT_DIR / "slides"
SLIDES_DIR.mkdir(exist_ok=True)

# ── Load pack ─────────────────────────────────────────────────────────────────
pack = json.loads(JSON_FILE.read_text())
raw = pack.get("instagram_carousel", [])
SLIDES = raw[:8]
while len(SLIDES) < 8:
    SLIDES.append({"type": "content", "label": "", "headline": "", "accent": "", "body": ""})

# ── Logo ──────────────────────────────────────────────────────────────────────
LOGO_PATH = Path("/app/lib/assets/csg-logo.png")
if LOGO_PATH.exists():
    logo_b64 = "data:image/png;base64," + base64.b64encode(LOGO_PATH.read_bytes()).decode()
else:
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="#00D4C8" stroke-width="3"/><path d="M50 10 L80 25 L80 55 Q80 75 50 90 Q20 75 20 55 L20 25 Z" fill="none" stroke="#00D4C8" stroke-width="2.5"/><text x="50" y="58" font-family="Arial" font-size="10" fill="#00D4C8" text-anchor="middle" font-weight="bold">CSG</text></svg>'
    logo_b64 = "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()

TOTAL = len(SLIDES)

# ── HTML helpers ──────────────────────────────────────────────────────────────
DOT_OVERLAY = '<div style="position:absolute;inset:0;z-index:0;background-image:radial-gradient(circle,rgba(0,212,200,0.12) 1px,transparent 1px);background-size:24px 24px;pointer-events:none"></div>'

def progress_bar(n, total):
    dots = "".join(
        f'<div style="width:28px;height:4px;border-radius:2px;background:{"#00D4C8" if i==n else "rgba(255,255,255,0.15)"}"></div>'
        for i in range(1, total+1)
    )
    return f'<div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;gap:4px;z-index:10">{dots}</div>'

def chrome(n, total, label=""):
    num = f'<div style="position:absolute;top:18px;left:18px;width:32px;height:32px;border-radius:50%;background:#00D4C8;display:flex;align-items:center;justify-content:center;z-index:10"><span style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:900;color:#060A14;line-height:1">0{n}</span></div>'
    logo = f'<div style="position:absolute;top:14px;right:14px;width:50px;height:50px;border-radius:50%;overflow:hidden;filter:drop-shadow(0 0 6px #00D4C8);z-index:10"><img src="{logo_b64}" style="width:100%;height:100%;object-fit:cover;display:block" /></div>'
    lbl = f'<div style="position:absolute;top:66px;left:18px;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:700;color:#00D4C8;letter-spacing:3px;opacity:0.85;z-index:10">{label.upper()}</div>' if label else ""
    return progress_bar(n, total) + num + logo + lbl

def bg(style="dark"):
    bgs = {
        "dark":   "radial-gradient(ellipse at 80% 20%,#0D1F3C 0%,#060A14 60%)",
        "darker": "radial-gradient(ellipse at 20% 80%,#0A1628 0%,#060A14 65%)",
        "red":    "radial-gradient(ellipse at 75% 15%,#1A0810 0%,#060A14 60%)",
        "teal":   "radial-gradient(ellipse at 25% 75%,#051918 0%,#060A14 60%)",
    }
    return bgs.get(style, bgs["dark"])

def divider():
    return '<div style="margin-top:18px;width:48px;height:3px;background:#00D4C8;border-radius:2px"></div>'

# ── Slide builders ────────────────────────────────────────────────────────────
def build_cover(s, n):
    headline = s.get("headline","")
    accent   = s.get("highlight","") or s.get("accent","")
    # Split headline on accent for two-colour effect
    if accent and accent.upper() in headline.upper():
        idx = headline.upper().index(accent.upper())
        white_part  = headline[:idx]
        accent_part = headline[idx:idx+len(accent)]
        rest_part   = headline[idx+len(accent):]
    else:
        white_part = headline; accent_part = ""; rest_part = ""

    body = s.get("body","").replace("\n","<br>")
    return f'''<div class="slide" style="background:{bg('dark')};position:relative;overflow:hidden">
      {DOT_OVERLAY}
      <div style="position:absolute;right:-40px;bottom:-40px;width:300px;height:300px;opacity:0.05;z-index:0">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 5 L90 22 L90 55 Q90 80 50 95 Q10 80 10 55 L10 22 Z" fill="#00D4C8"/></svg>
      </div>
      {chrome(n, TOTAL, s.get("label",""))}
      <div style="position:absolute;top:96px;left:18px;right:18px;z-index:5">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:68px;font-weight:900;line-height:0.88;text-transform:uppercase;letter-spacing:-1px">
          <span style="color:#fff">{white_part}</span><span style="color:#00D4C8">{accent_part}</span><span style="color:#fff">{rest_part}</span>
        </div>
        {divider()}
        <div style="margin-top:16px;font-family:'Barlow',sans-serif;font-size:17px;font-weight:400;color:rgba(255,255,255,0.55);line-height:1.5">{body}</div>
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#00D4C8,transparent)"></div>
    </div>'''

def build_stat(s, n):
    stat     = s.get("headline","")
    stat_sub = s.get("body","").split("\n")[0] if s.get("body") else ""
    rest     = "\n".join(s.get("body","").split("\n")[1:]).strip().replace("\n","<br>")
    return f'''<div class="slide" style="background:{bg('darker')};position:relative;overflow:hidden">
      {DOT_OVERLAY}{chrome(n, TOTAL, s.get("label",""))}
      <div style="position:absolute;top:88px;left:18px;right:18px;z-index:5">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:100px;font-weight:900;line-height:0.85;color:#00D4C8;letter-spacing:-2px">{stat}</div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:21px;font-weight:600;color:rgba(255,255,255,0.7);margin-top:8px;text-transform:uppercase;letter-spacing:1px">{stat_sub}</div>
        {divider()}
        <div style="margin-top:16px;font-family:'Barlow',sans-serif;font-size:16px;font-weight:400;color:rgba(255,255,255,0.55);line-height:1.55">{rest}</div>
      </div>
    </div>'''

def build_list(s, n):
    headline = s.get("headline","")
    accent   = s.get("highlight","") or s.get("accent","")
    if accent and accent.upper() in headline.upper():
        idx = headline.upper().index(accent.upper())
        white_part = headline[:idx]; accent_part = headline[idx:idx+len(accent)]
    else:
        white_part = headline; accent_part = ""
    items = s.get("body","").split("\n") if not isinstance(s.get("body"), list) else s["body"]
    items = [i.strip() for i in items if i.strip()]
    items_html = "".join(f'<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:13px"><div style="flex-shrink:0;width:8px;height:8px;border-radius:50%;background:#00D4C8;margin-top:5px"></div><div style="font-family:\'Barlow\',sans-serif;font-size:16px;font-weight:400;color:rgba(255,255,255,0.72);line-height:1.4">{item}</div></div>' for item in items)
    return f'''<div class="slide" style="background:{bg('red')};position:relative;overflow:hidden">
      {DOT_OVERLAY}{chrome(n, TOTAL, s.get("label",""))}
      <div style="position:absolute;top:88px;left:18px;right:18px;z-index:5">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:54px;font-weight:900;line-height:0.9;text-transform:uppercase;letter-spacing:-0.5px">
          <span style="color:#fff">{white_part}</span><span style="color:#00D4C8">{accent_part}</span>
        </div>
        {divider()}
        <div style="margin-top:18px">{items_html}</div>
      </div>
    </div>'''

def build_quote(s, n):
    quote = s.get("headline", s.get("body","")).replace("\n","<br>")
    attr  = s.get("body","") if s.get("headline") else ""
    return f'''<div class="slide" style="background:{bg('teal')};position:relative;overflow:hidden">
      {DOT_OVERLAY}{chrome(n, TOTAL, s.get("label","MY TAKE"))}
      <div style="position:absolute;top:72px;left:14px;font-family:'Barlow Condensed',sans-serif;font-size:160px;font-weight:900;color:#00D4C8;opacity:0.2;line-height:1;z-index:1">"</div>
      <div style="position:absolute;top:108px;left:18px;right:18px;z-index:5">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:36px;font-weight:700;color:#fff;line-height:1.1;font-style:italic;text-transform:uppercase">{quote}</div>
        {divider()}
        <div style="margin-top:14px;font-family:'Barlow',sans-serif;font-size:14px;font-weight:400;color:rgba(255,255,255,0.5);font-style:italic">{attr}</div>
      </div>
    </div>'''

def build_content(s, n):
    headline = s.get("headline","")
    accent   = s.get("highlight","") or s.get("accent","")
    if accent and accent.upper() in headline.upper():
        idx = headline.upper().index(accent.upper())
        white_part = headline[:idx]; accent_part = headline[idx:idx+len(accent)]
    else:
        white_part = headline; accent_part = ""
    body = s.get("body","").replace("\n","<br>")
    return f'''<div class="slide" style="background:{bg('darker')};position:relative;overflow:hidden">
      {DOT_OVERLAY}{chrome(n, TOTAL, s.get("label",""))}
      <div style="position:absolute;top:88px;left:18px;right:18px;z-index:5">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:56px;font-weight:900;line-height:0.9;text-transform:uppercase;letter-spacing:-0.5px">
          <span style="color:#fff">{white_part}</span><span style="color:#00D4C8">{accent_part}</span>
        </div>
        {divider()}
        <div style="margin-top:18px;font-family:'Barlow',sans-serif;font-size:16px;font-weight:400;color:rgba(255,255,255,0.65);line-height:1.55">{body}</div>
      </div>
    </div>'''

def build_action(s, n):
    headline = s.get("headline","")
    accent   = s.get("highlight","") or s.get("accent","")
    if accent and accent.upper() in headline.upper():
        idx = headline.upper().index(accent.upper())
        white_part = headline[:idx]; accent_part = headline[idx:idx+len(accent)]
    else:
        white_part = headline; accent_part = ""
    lines = s.get("body","").split("\n") if s.get("body") else []
    lines = [l.strip() for l in lines if l.strip()]
    actions_html = "".join(f'<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:14px"><div style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:#00D4C8;display:flex;align-items:center;justify-content:center"><span style="font-family:\'Barlow Condensed\',sans-serif;font-size:14px;font-weight:900;color:#060A14">{i+1}</span></div><div style="font-family:\'Barlow\',sans-serif;font-size:15px;font-weight:400;color:rgba(255,255,255,0.72);line-height:1.4;padding-top:4px">{line}</div></div>' for i,line in enumerate(lines))
    return f'''<div class="slide" style="background:{bg('dark')};position:relative;overflow:hidden">
      {DOT_OVERLAY}{chrome(n, TOTAL, s.get("label",""))}
      <div style="position:absolute;top:88px;left:18px;right:18px;z-index:5">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:56px;font-weight:900;line-height:0.9;text-transform:uppercase;letter-spacing:-0.5px">
          <span style="color:#fff">{white_part}</span><span style="color:#00D4C8">{accent_part}</span>
        </div>
        {divider()}
        <div style="margin-top:18px;background:#0C1526;border:1px solid rgba(0,212,200,0.2);border-radius:10px;padding:18px 16px">{actions_html}</div>
      </div>
    </div>'''

def build_close(s, n):
    cta = s.get("headline", s.get("body","Share this with every parent you know."))
    pdots = progress_bar(n, TOTAL)
    return f'''<div class="slide" style="background:{bg('teal')};position:relative;overflow:hidden">
      {DOT_OVERLAY}{pdots}
      <div style="position:absolute;top:52px;left:50%;transform:translateX(-50%);width:120px;height:120px;z-index:5">
        <div style="width:120px;height:120px;border-radius:50%;overflow:hidden;filter:drop-shadow(0 0 16px rgba(0,212,200,0.6))"><img src="{logo_b64}" style="width:100%;height:100%;object-fit:cover;display:block" /></div>
      </div>
      <div style="position:absolute;top:190px;left:18px;right:18px;text-align:center;z-index:5">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:30px;font-weight:800;color:#fff">Cyber Safety Guy</div>
        <div style="font-family:'Barlow',sans-serif;font-size:16px;font-weight:600;color:#00D4C8;margin-top:4px">@cybersafetyguy</div>
        <div style="margin:16px auto 0;font-family:'Barlow',sans-serif;font-size:15px;font-weight:400;color:rgba(255,255,255,0.6);max-width:360px;line-height:1.5">{cta}</div>
        <div style="margin-top:12px;font-family:'Barlow',sans-serif;font-size:13px;color:rgba(255,255,255,0.4)">⚡ Tag a parent or teacher who needs to read this ⚡</div>
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;background:#D32F2F;padding:14px 18px;z-index:10;text-align:center">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:#fff;letter-spacing:0.5px">Childline: 0800 1111 · childline.org.uk</div>
        <div style="font-family:'Barlow',sans-serif;font-size:12px;color:rgba(255,255,255,0.8);margin-top:2px">All subscription income donated to Childline every six months</div>
      </div>
    </div>'''

# ── Build HTML ────────────────────────────────────────────────────────────────
BUILDERS = {
    "cover":   build_cover,
    "stat":    build_stat,
    "list":    build_list,
    "content": build_content,
    "quote":   build_quote,
    "action":  build_action,
    "close":   build_close,
}
# For content type cycles: list → content → list → ...
content_idx = 0
CONTENT_CYCLE = ["list", "content"]

slides_html = []
for i, s in enumerate(SLIDES, 1):
    t = s.get("type", "content").lower()
    if t == "content":
        actual_type = CONTENT_CYCLE[content_idx % len(CONTENT_CYCLE)]
        content_idx += 1
        builder = BUILDERS[actual_type]
    else:
        builder = BUILDERS.get(t, BUILDERS["content"])
    slides_html.append(builder(s, i))

wrappers = "\n".join(
    f'<div id="s{i+1}" style="display:{"block" if i==0 else "none"}">{html}</div>'
    for i, html in enumerate(slides_html)
)

HTML = f'''<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:#000;display:block}}
  .wrap{{width:560px;height:560px;position:relative;overflow:hidden}}
  .slide{{width:560px;height:560px;position:relative;overflow:hidden}}
</style>
</head><body>
<div class="wrap">{wrappers}</div>
</body></html>'''

html_path = OUT_DIR / "carousel.html"
html_path.write_text(HTML)

# ── Render PNGs ───────────────────────────────────────────────────────────────
png_paths = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1080, "height": 1080})
    page.goto(f"file://{html_path.resolve()}")
    page.wait_for_timeout(1800)  # font load
    for i in range(1, TOTAL + 1):
        page.evaluate(f"""
            document.querySelectorAll('.wrap > div').forEach((el,idx) => {{
                el.style.display = idx === {i-1} ? 'block' : 'none';
            }});
            const wrap = document.querySelector('.wrap');
            wrap.style.transform = 'scale(' + (1080/560) + ')';
            wrap.style.transformOrigin = 'top left';
            document.body.style.margin = '0';
            document.body.style.padding = '0';
        """)
        page.wait_for_timeout(400)
        out = SLIDES_DIR / f"slide_{i:02d}.png"
        page.screenshot(path=str(out), clip={"x":0,"y":0,"width":1080,"height":1080})
        png_paths.append(out)
        print(f"slide {i}/{TOTAL}", flush=True)
    browser.close()

# ── ZIP PNGs ──────────────────────────────────────────────────────────────────
zip_path = OUT_DIR / "carousel_pngs.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for p in png_paths:
        zf.write(p, p.name)

# Output path for Node to read
print(f"ZIP:{zip_path}", flush=True)