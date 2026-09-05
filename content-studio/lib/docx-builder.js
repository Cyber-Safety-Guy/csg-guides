import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, Header, Footer, PageNumber,
  convertInchesToTwip
} from 'docx';

// ─── Colour constants (no leading #) ─────────────────────────────────────────
const TEAL         = '42CED0';
const DARK_TEAL    = '1A5C5F';
const CHILDLINE_RED = 'C0392B';
const BODY         = '222222';
const GREY         = '7B9EA0';
const BOX_BG       = 'ECF9FA'; // ~10 % teal wash on white

// ─── Inline text helpers ──────────────────────────────────────────────────────

/**
 * Split text on "0800 1111" so every occurrence gets Childline red.
 * @param {string} text
 * @param {{ size?: number, color?: string, bold?: boolean }} opts
 * @returns {TextRun[]}
 */
function childlineRuns(text, { size = 22, color = BODY, bold = false } = {}) {
  return text
    .split(/(0800 1111)/g)
    .filter(p => p.length > 0)
    .map(p =>
      p === '0800 1111'
        ? new TextRun({ text: p, bold: true, color: CHILDLINE_RED, size })
        : new TextRun({ text: p, color, bold, size })
    );
}

/**
 * Parse inline markdown: **bold**, [n] → superscript, 0800 1111 → red.
 * Returns an array of TextRun objects safe to pass to Paragraph.children.
 */
function parseInline(text, { size = 22, color = BODY } = {}) {
  if (!text) return [new TextRun({ text: '', size })];
  const runs = [];
  // Split on bold spans and footnote markers; keep delimiters
  const segments = text.split(/(\*\*[^*]+\*\*|\[\d+\])/g);
  for (const seg of segments) {
    if (!seg) continue;
    if (seg.startsWith('**') && seg.endsWith('**')) {
      runs.push(...childlineRuns(seg.slice(2, -2), { size, color, bold: true }));
    } else if (/^\[\d+\]$/.test(seg)) {
      runs.push(new TextRun({
        text: seg,
        verticalAlign: 'superscript',
        color: GREY,
        size: Math.max(16, size - 4)
      }));
    } else {
      runs.push(...childlineRuns(seg, { size, color }));
    }
  }
  return runs;
}

// ─── Block parsers ────────────────────────────────────────────────────────────

/**
 * Convert a blog post markdown string into an array of docx Paragraph objects.
 * Handles: # h1, ## h2, ### h3, bold, [n] footnotes, --- hr,
 * numbered lists (1.), blank lines, and body paragraphs.
 */
function parseBlogPost(markdown) {
  const lines = (markdown || '').split('\n');
  const elements = [];

  for (const line of lines) {
    // H1  →  Heading 2 (teal) — Heading 1 reserved for section titles in TOC
    if (/^# (?!#)/.test(line)) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line.slice(2).trim(), bold: true, color: TEAL, size: 28 })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 280, after: 120 }
      }));
      continue;
    }

    // H2 / H3  →  Heading 3 (dark teal)
    if (/^#{2,3} /.test(line)) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^#{2,3} /, '').trim(), bold: true, color: DARK_TEAL, size: 24 })],
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 100 }
      }));
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(new Paragraph({
        border: { bottom: { color: TEAL, style: BorderStyle.SINGLE, size: 6 } },
        spacing: { before: 120, after: 120 }
      }));
      continue;
    }

    // Numbered list item  →  indented paragraph with coloured number
    const numMatch = line.match(/^(\d+)\. (.*)$/);
    if (numMatch) {
      elements.push(new Paragraph({
        children: [
          new TextRun({ text: `${numMatch[1]}. `, bold: true, color: TEAL, size: 22 }),
          ...parseInline(numMatch[2])
        ],
        indent: { left: convertInchesToTwip(0.3) },
        spacing: { before: 60, after: 60 }
      }));
      continue;
    }

    // Bullet list item
    if (/^[-*] /.test(line)) {
      elements.push(new Paragraph({
        children: [
          new TextRun({ text: '• ', color: TEAL, size: 22 }),
          ...parseInline(line.replace(/^[-*] /, ''))
        ],
        indent: { left: convertInchesToTwip(0.3) },
        spacing: { before: 60, after: 60 }
      }));
      continue;
    }

    // Blank line  →  minimal spacer, not a full-height empty paragraph
    if (line.trim() === '') {
      elements.push(new Paragraph({
        children: [new TextRun({ text: '' })],
        spacing: { before: 0, after: 60 }
      }));
      continue;
    }

    // Body paragraph
    elements.push(new Paragraph({
      children: parseInline(line),
      spacing: { before: 0, after: 120 }
    }));
  }

  return elements;
}

/**
 * Parse social copy text into paragraphs (no heading detection — just inline).
 */
function parseSocial(text) {
  if (!text) return [new Paragraph({ children: [new TextRun({ text: '' })] })];
  return (text || '').split('\n').map(line =>
    line.trim() === ''
      ? new Paragraph({ children: [new TextRun({ text: '' })], spacing: { before: 0, after: 60 } })
      : new Paragraph({ children: parseInline(line), spacing: { before: 0, after: 80 } })
  );
}

// ─── Layout primitives ────────────────────────────────────────────────────────

/**
 * Wrap an array of Paragraph elements in a teal-bordered, lightly-tinted box.
 * NOTE: ShadingType.CLEAR is required — SOLID renders black in docx-js.
 */
function box(children) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA }, // 6.5" content width in DXA
    columnWidths: [9360], // must match table width or Word collapses column to zero
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9360, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, color: BOX_BG, fill: BOX_BG },
            borders: {
              top:    { style: BorderStyle.SINGLE, size: 8, color: TEAL },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: TEAL },
              left:   { style: BorderStyle.SINGLE, size: 8, color: TEAL },
              right:  { style: BorderStyle.SINGLE, size: 8, color: TEAL }
            },
            margins: {
              top:    convertInchesToTwip(0.1),
              bottom: convertInchesToTwip(0.1),
              left:   convertInchesToTwip(0.12),
              right:  convertInchesToTwip(0.12)
            },
            children
          })
        ]
      })
    ]
  });
}

/** Section heading — uses HeadingLevel.HEADING_1 so TOC can index it */
function sectionHeading(num, title) {
  return new Paragraph({
    children: [new TextRun({ text: `${num}. ${title}`, bold: true, color: TEAL, size: 28 })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 140 }
  });
}

/** Sub-heading within a section */
function subHeading(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: DARK_TEAL, size: 24 })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 }
  });
}

/** Italic grey metadata line */
function meta(text) {
  return new Paragraph({
    children: [new TextRun({ text, color: GREY, size: 20, italics: true })],
    spacing: { before: 0, after: 80 }
  });
}

/** Thin gap paragraph */
function gap() {
  return new Paragraph({
    children: [new TextRun({ text: '' })],
    spacing: { before: 0, after: 120 }
  });
}

/** Teal hairline divider between sections */
function divider() {
  return new Paragraph({
    border: { bottom: { color: TEAL, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { before: 200, after: 200 }
  });
}

/** Childline plug paragraph for end of document */
function childlineNote() {
  return new Paragraph({
    children: [
      new TextRun({ text: 'If you are worried about a child, contact ', color: BODY, size: 22 }),
      new TextRun({ text: 'Childline: 0800 1111 | childline.org.uk', bold: true, color: CHILDLINE_RED, size: 22 })
    ],
    spacing: { before: 200, after: 200 }
  });
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export async function buildDocx(topic, date, pack) {
  // Guard optional arrays
  const carouselSlides    = Array.isArray(pack.instagram_carousel) ? pack.instagram_carousel : [];
  const reelActions       = Array.isArray(pack.reel_actions)       ? pack.reel_actions       : [];
  const swipeThroughCaption = pack.swipe_through_caption || '';

  // Use content_pack_title from JSON if present; fall back to raw topic string
  const packTitle      = pack.content_pack_title || topic;
  // Strip "CSG Content Pack: " prefix for the running header to avoid redundancy
  const packTitleShort = packTitle.replace(/^CSG Content Pack:\s*/i, '');

  const doc = new Document({
    features: { updateFields: true }, // triggers TOC update on open in Word
    sections: [{
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({
              text: `CYBER SAFETY GUY | Content Pack | ${packTitleShort} | ${date}`,
              color: GREY, size: 18
            })],
            alignment: AlignmentType.CENTER
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: 'cybersafetyguy.com | Childline: ', color: GREY, size: 18 }),
              new TextRun({ text: '0800 1111', bold: true, color: CHILDLINE_RED, size: 18 }),
              new TextRun({ text: ' | childline.org.uk | Page ', color: GREY, size: 18 }),
              new TextRun({ children: [PageNumber.CURRENT], color: GREY, size: 18 })
            ],
            alignment: AlignmentType.CENTER
          })]
        })
      },
      children: [

        // ── COVER ─────────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: 'CYBER SAFETY GUY', bold: true, color: TEAL, size: 48 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Content Pack', color: GREY, size: 32 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: packTitle, bold: true, color: BODY, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: date, color: GREY, size: 22 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 }
        }),
        divider(),

        // ── TABLE OF CONTENTS (manual — TableOfContents not in this docx build) ──
        new Paragraph({
          children: [new TextRun({ text: 'Contents', bold: true, color: TEAL, size: 32 })],
          spacing: { before: 200, after: 160 }
        }),
        ...[
          '1. Substack blog post',
          '2. LinkedIn post',
          '3. LinkedIn teaser post',
          '4. Instagram single image post',
          '5. Image prompt (DALL-E 3 — blog header)',
          '6. Substack note',
          '7. Instagram Carousel (see separate .pptx)',
          '8. Swipe-through caption',
          '9. Reel script + YouTube Shorts'
        ].map(entry => new Paragraph({
          children: [new TextRun({ text: entry, color: DARK_TEAL, size: 22 })],
          spacing: { before: 40, after: 40 }
        })),
        // Page break before section content
        new Paragraph({
          children: [new TextRun({ text: '' })],
          pageBreakBefore: true
        }),

        // ── SECTION 1 — BLOG POST ─────────────────────────────────────────
        sectionHeading(1, 'Substack blog post'),
        meta(`SEO Title: ${pack.blog_seo?.title || ''}`),
        meta(`SEO Description: ${pack.blog_seo?.description || ''}`),
        meta(`URL Slug: /${pack.blog_seo?.slug || ''}`),
        gap(),
        ...parseBlogPost(pack.blog_post),
        divider(),

        // ── SECTION 2 — LINKEDIN ──────────────────────────────────────────
        sectionHeading(2, 'LinkedIn post'),
        meta(`Mode: ${pack.linkedin_mode || ''} — ${pack.linkedin_mode_reasoning || ''}`),
        gap(),
        box(parseSocial(pack.linkedin_post)),
        gap(),
        divider(),

        // ── SECTION 3 — LINKEDIN TEASER ───────────────────────────────────
        sectionHeading(3, 'LinkedIn teaser post'),
        box(parseSocial(pack.linkedin_teaser)),
        gap(),
        divider(),

        // ── SECTION 4 — INSTAGRAM ─────────────────────────────────────────
        sectionHeading(4, 'Instagram single image post'),
        box(parseSocial(pack.instagram_post)),
        gap(),
        divider(),

        // ── SECTION 5 — IMAGE PROMPT ──────────────────────────────────────
        sectionHeading(5, 'Image prompt (DALL-E 3 — blog header)'),
        box([new Paragraph({
          children: parseInline(pack.image_prompt || ''),
          spacing: { before: 0, after: 80 }
        })]),
        gap(),
        divider(),

        // ── SECTION 6 — SUBSTACK NOTE ─────────────────────────────────────
        sectionHeading(6, 'Substack note'),
        box(parseSocial(pack.substack_note)),
        gap(),
        divider(),

        // ── SECTION 7 — INSTAGRAM CAROUSEL ───────────────────────────────
        sectionHeading(7, 'Instagram Carousel (slide outline — see separate .pptx)'),
        meta('8 slides, 1080×1080px. Dark navy background (#0A1628). Built separately via pptxgenjs.'),
        gap(),
        ...carouselSlides.flatMap(slide => [
          new Paragraph({
            children: [
              new TextRun({ text: `Slide ${slide.slide_number} `, bold: true, color: TEAL, size: 22 }),
              new TextRun({ text: `[${(slide.type || '').toUpperCase()}]`, bold: true, color: DARK_TEAL, size: 22 })
            ],
            spacing: { before: 120, after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Headline: ', bold: true, color: DARK_TEAL, size: 22 }),
              ...parseInline(slide.headline || '')
            ],
            spacing: { before: 0, after: 40 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Body: ', bold: true, color: DARK_TEAL, size: 22 }),
              ...parseInline(slide.body || '')
            ],
            spacing: { before: 0, after: 80 }
          })
        ]),
        gap(),
        divider(),

        // ── SECTION 8 — SWIPE-THROUGH CAPTION ────────────────────────────
        sectionHeading(8, 'Swipe-through caption'),
        meta('Carousel caption. "Swipe through" hook. Line C engagement prompt. 5 hashtags in caption body.'),
        gap(),
        box(parseSocial(swipeThroughCaption)),
        gap(),
        divider(),

        // ── SECTION 9 — REEL + YOUTUBE ────────────────────────────────────
        sectionHeading(9, 'Reel script + YouTube Shorts'),

        subHeading('Part A — Instagram reel'),
        meta(`Format: ${pack.reel_format || ''}`),
        meta(`Hook (0–3s): ${pack.reel_hook || ''}`),
        gap(),
        box([
          ...parseSocial(pack.reel_script),
          new Paragraph({ children: [new TextRun({ text: '' })], spacing: { before: 0, after: 60 } }),
          new Paragraph({
            children: [new TextRun({ text: 'Actions for parents:', bold: true, color: DARK_TEAL, size: 22 })],
            spacing: { before: 60, after: 60 }
          }),
          ...reelActions.map((a, i) => new Paragraph({
            children: [
              new TextRun({ text: `${i + 1}. `, bold: true, color: TEAL, size: 22 }),
              ...parseInline(a)
            ],
            spacing: { before: 40, after: 60 }
          }))
        ]),
        gap(),

        subHeading('Instagram reel caption'),
        box(parseSocial(pack.instagram_reel_caption)),
        gap(),

        subHeading('Part B — YouTube Shorts'),
        meta(`Title (${(pack.youtube_shorts_title || '').length}/60): ${pack.youtube_shorts_title || ''}`),
        box(parseSocial(pack.youtube_shorts_description)),
        gap(),
        divider(),
        childlineNote()
      ]
    }]
  });

  return await Packer.toBuffer(doc);
}