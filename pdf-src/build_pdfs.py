"""Render the one-page guide PDFs in pdf-src/ to guides/, plus their library images.

Usage (from the repo root): python3 pdf-src/build_pdfs.py [name ...]
Needs: pip install playwright pillow  (and `playwright install chromium`).
Each entry: source HTML -> PDF in guides/ and, if an image name is given, a 1024x1536 top crop of the
page in images/ plus a 560px thumbnail in images/thumbs/ (library cards show the top of the image).
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
GUIDES = {
    "iphone": ("CSG_iPhone_iPad_parental_controls.pdf", None),  # library image is a title card; left as is
    "roblox": ("CSG_Roblox.pdf", "CSG_Roblox"),
}


def build(name, page):
    pdf_name, image = GUIDES[name]
    page.goto((ROOT / "pdf-src" / f"{name}.html").as_uri())
    page.wait_for_load_state("networkidle")
    page.evaluate("document.fonts.ready")
    height = page.evaluate("Math.ceil(document.documentElement.scrollHeight)")
    page.pdf(path=str(ROOT / "guides" / pdf_name), width="900px", height=f"{height + 2}px",
             print_background=True, margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})
    print(f"{name}: guides/{pdf_name} ({height}px tall)")
    if not image:
        return
    shot = ROOT / "pdf-src" / f".{name}.png"
    page.screenshot(path=str(shot), full_page=True)
    im = Image.open(shot).convert("RGB")
    im = im.crop((0, 0, im.width, round(im.width * 1.5))).resize((1024, 1536), Image.LANCZOS)
    im.save(ROOT / "images" / f"{image}.png", optimize=True)
    im.resize((560, 840), Image.LANCZOS).save(ROOT / "images" / "thumbs" / f"{image}.webp", quality=80)
    shot.unlink()
    print(f"  images/{image}.png, images/thumbs/{image}.webp")


if __name__ == "__main__":
    names = sys.argv[1:] or list(GUIDES)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 900, "height": 1200}, device_scale_factor=2)
        for n in names:
            build(n, page)
        browser.close()
