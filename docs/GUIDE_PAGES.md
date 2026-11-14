# Guide pages: format and publishing process

Every app or risk guide can have a web page at `https://guides.cybersafetyguy.com/guides/<slug>`.
The PDF stays as the printable poster; the page is what Google ranks, and it links to the PDF,
Dale's Substack article, related guides and Academy packs.

A page is one content file, `pages/<slug>.json`. `scripts/build_pages.py` turns it into the page
when the site is built and adds everything search engines need: the title with " | Cyber Safety Guy",
description, canonical link, share tags, Article, Breadcrumb and FAQ structured data, the library
link (the guide's card opens the page, with the PDF as a second button) and the sitemap entry.
`scripts/check_site.py` stops the publish if anything is missing.

Content Studio's "Guide page" output produces this same format (the fields marked Studio).

## Fields

| Field | Who | Rule |
|---|---|---|
| `slug` | Studio | lowercase-hyphenated, same as the file name (`omoggle`, `locket-widget`) |
| `name` | Studio | short name for breadcrumbs and cards (`Omoggle`) |
| `eyebrow` | Studio | `App guide`, `Risk guide` or `Settings guide` |
| `seo_title` | Studio | 48 characters max, written how parents search ("Is X Safe for Kids? ...", "What Is X? ...") |
| `seo_description` | Studio | 120 to 155 characters; answers the search |
| `h1` | Studio | the page heading, sentence case |
| `lead` | Studio | one or two sentences, first person |
| `answer_question` / `answer` | Studio | the short answer box ("Is X safe for children?") |
| `sections` | Studio | list of `{heading, body: [paragraphs], subsections: [{heading, body}], list: [items], terms: [{term, meaning}], after: [paragraphs]}`; all keys except `heading` optional |
| `teachers` | Studio | one paragraph for teachers and DSLs |
| `faq` | Studio | 3 to 8 `{q, a}`, the questions people search |
| `help` | Studio | must include Childline 0800 1111 |
| `sources` | Studio | at least one, from the post's footnotes |
| `article_url` | Studio | the Substack post (`https://www.cybersafetyguy.com/p/<slug>`) |
| `updated`, `published` | Studio | dates, `2026-11-14` |
| `pdf`, `image` | Claude | `guides/CSG_X.pdf` and the image name without extension, when there's a poster |
| `related` | Claude | 2 to 4 `{title, text, href}`: guide PDFs (`/download?file=...`), pages (`/guides/...`) or Academy packs |

Text may contain links as `[words](https://...)`, `[words](/path)` or `[words](tel:08001111)`.
Nothing else is interpreted: no HTML. House rules apply: UK English, no em dashes, Dale's voice.

## Process for a new guide

1. Dale runs Content Studio with the "Guide page" chip on. Studio writes the Substack post (with its
   SEO block and a "Quick guide" link line) and the guide page file.
2. Dale publishes the Substack post, then drops the guide page file (and any new PDF poster) in the
   shared inbox.
3. Claude opens one PR: `pages/<slug>.json` (adding `pdf`, `image`, `related`), and for a new poster
   the PDF (with a Title in its properties), the image, the 560px WebP thumbnail and the guides.json
   entry. The build check must pass; Cloudflare posts a preview link.
4. Dale merges. Claude checks the live page.
5. Dale requests indexing for `https://guides.cybersafetyguy.com/guides/<slug>` in Search Console and
   makes the "Quick guide" line in the Substack post a link to the page.
