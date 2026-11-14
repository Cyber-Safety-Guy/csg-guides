"""Render guide PDFs in the standard layout to guides/, plus their library images.

Two kinds of source:
- hand-written HTML in pdf-src/ (HAND below): python3 pdf-src/build_pdfs.py [name ...]
- generated from a guide page: python3 pdf-src/page_pdf.py <slug> ...  (preferred for new guides)
Needs: pip install playwright==1.49.1 pillow  (and `playwright install chromium`).
If an image name is given, a 1024x1536 top crop of the page goes to images/ and a 560x840
thumbnail to images/thumbs/ (library cards show the top of the image).
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HAND = {
    "iphone": ("CSG_iPhone_iPad_parental_controls.pdf", None),  # library image is a title card; left as is
    "roblox": ("CSG_Roblox.pdf", "CSG_Roblox"),
}


def render(jobs):
    """jobs: list of (source html Path, pdf file name, image name or None)."""
    from playwright.sync_api import sync_playwright
    from PIL import Image
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 900, "height": 1200}, device_scale_factor=2)
        for src, pdf_name, image in jobs:
            page.goto(src.as_uri())
            page.wait_for_load_state("networkidle")
            page.evaluate("document.fonts.ready")
            height = page.evaluate("Math.ceil(document.documentElement.scrollHeight)")
            page.pdf(path=str(ROOT / "guides" / pdf_name), width="900px", height=f"{height + 2}px",
                     print_background=True, margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})
            print(f"{src.name}: guides/{pdf_name} ({height}px tall)")
            if not image:
                continue
            shot = src.with_name(f".{src.stem}.png")
            page.screenshot(path=str(shot), full_page=True)
            im = Image.open(shot).convert("RGB")
            im = im.crop((0, 0, im.width, round(im.width * 1.5))).resize((1024, 1536), Image.LANCZOS)
            im.save(ROOT / "images" / f"{image}.png", optimize=True)
            im.resize((560, 840), Image.LANCZOS).save(ROOT / "images" / "thumbs" / f"{image}.webp", quality=80)
            shot.unlink()
            print(f"  images/{image}.png, images/thumbs/{image}.webp")
        browser.close()


if __name__ == "__main__":
    names = sys.argv[1:] or list(HAND)
    render([(ROOT / "pdf-src" / f"{n}.html", *HAND[n]) for n in names])
