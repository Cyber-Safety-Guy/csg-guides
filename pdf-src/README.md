# Guide PDF sources

HTML sources for guide PDFs that are made here rather than designed elsewhere. This folder is not
published (build.sh only copies the site). To change a PDF, edit its HTML, then from the repo root:

    pip install playwright==1.49.1 pillow && playwright install chromium
    python3 pdf-src/build_pdfs.py            # or: python3 pdf-src/build_pdfs.py roblox

That writes the PDF into guides/ and, where set in build_pdfs.py, the library image and thumbnail.
Keep the wording in step with the matching guide page in pages/. House rules: UK English, no em
dashes, Childline in the help footer.

- iphone.html -> guides/CSG_iPhone_iPad_parental_controls.pdf (iOS 27, from pages/iphone-parental-controls.json)
- roblox.html -> guides/CSG_Roblox.pdf (+ images/CSG_Roblox.png, thumbnail; from pages/roblox.json)
