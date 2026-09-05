import PptxGenJS from 'pptxgenjs';

// Palette
const BG        = '060D1A';
const TEAL      = '42CED0';
const GOLD      = 'D4A843';
const RED       = 'C0392B';
const OFF_WHITE = 'E8F4F5';
const GREY      = '7B9EA0';
const CARD_BG   = '0D1F35';

const W = 10;
const H = 10;

// ── chrome elements ──────────────────────────────────────────────────────────

function addSlideNum(slide, n) {
  slide.addShape('ellipse', {
    x: 0.30, y: 0.28, w: 0.36, h: 0.36,
    fill: { color: TEAL }, line: { type: 'none' },
  });
  slide.addText(String(n), {
    x: 0.30, y: 0.28, w: 0.36, h: 0.36,
    fontSize: 9, color: BG, fontFace: 'Arial', bold: true,
    align: 'center', valign: 'middle', margin: 0,
  });
}

function addBadge(slide) {
  slide.addShape('ellipse', {
    x: W - 0.78, y: 0.22, w: 0.54, h: 0.54,
    fill: { type: 'none' }, line: { color: TEAL, width: 1.5 },
  });
  slide.addText('CSG', {
    x: W - 0.78, y: 0.22, w: 0.54, h: 0.54,
    fontSize: 7, color: TEAL, fontFace: 'Arial', bold: true,
    align: 'center', valign: 'middle', margin: 0,
  });
}

function addSectionLabel(slide, label) {
  if (!label) return;
  slide.addText(label.toUpperCase(), {
    x: 0.55, y: 1.05, w: W - 1.1, h: 0.32,
    fontSize: 10, color: TEAL, fontFace: 'Arial',
    valign: 'top', charSpacing: 2,
  });
}

// Headline split into white + teal runs based on optional highlight phrase
function addHeadline(slide, headline, highlight, x, y, w, h, fontSize) {
  const hl  = (headline || '').toUpperCase();
  const hi  = (highlight || '').toUpperCase().trim();

  if (hi && hl.includes(hi)) {
    const idx  = hl.indexOf(hi);
    const runs = [];
    if (idx > 0)           runs.push({ text: hl.slice(0, idx),         options: { color: OFF_WHITE, bold: true } });
    runs.push(              { text: hi,                                  options: { color: TEAL,      bold: true } });
    if (idx + hi.length < hl.length) runs.push({ text: hl.slice(idx + hi.length), options: { color: OFF_WHITE, bold: true } });
    slide.addText(runs, { x, y, w, h, fontSize, fontFace: 'Arial', valign: 'top', wrap: true, lineSpacingMultiple: 1.1 });
  } else {
    slide.addText(hl, { x, y, w, h, fontSize, color: OFF_WHITE, fontFace: 'Arial', bold: true, valign: 'top', wrap: true, lineSpacingMultiple: 1.1 });
  }
}

// ── slide builders ───────────────────────────────────────────────────────────

// Slide 1 — Cover: large left-aligned headline, teal highlight, subtitle below
function buildCoverSlide(pptx, slide, data, topic) {
  slide.background = { color: BG };

  // Subtle triangle watermark — right side, ghosted
  slide.addShape('triangle', {
    x: 5.5, y: 3.5, w: 4.2, h: 3.8,
    fill: { type: 'none' },
    line: { color: '142435', width: 1.5 },
  });

  addSlideNum(slide, 1);
  addBadge(slide);

  // Section label (e.g. "ONLINE SAFETY 2025")
  if (data.label) addSectionLabel(slide, data.label);

  const yHead = data.label ? 1.5 : 1.2;
  // Headline: 3 lines max at 48pt ≈ 2.8" — keep to upper half
  addHeadline(slide, data.headline || topic, data.highlight,
    0.55, yHead, W - 1.1, 3.2, 48);

  if (data.body) {
    slide.addText(data.body, {
      x: 0.55, y: 5.55, w: W - 1.1, h: 4.0,
      fontSize: 19, color: GREY, fontFace: 'Arial',
      valign: 'top', wrap: true, lineSpacingMultiple: 1.55,
    });
  }
}

// Content slide A — headline + em-dash bullet list (body = \n-separated lines)
function buildContentListSlide(pptx, slide, data, n) {
  slide.background = { color: BG };
  addSlideNum(slide, n);
  addBadge(slide);
  if (data.label) addSectionLabel(slide, data.label);

  const yHead = data.label ? 1.5 : 1.2;
  addHeadline(slide, data.headline, data.highlight, 0.55, yHead, W - 1.1, 1.8, 30);

  const lines = (data.body || '').split('\n').filter(Boolean);
  const yList = yHead + 2.0;
  const available = H - yList - 0.5;
  const rowH = lines.length > 0 ? Math.min(1.05, available / lines.length) : 1.05;
  const fontSize = rowH >= 0.85 ? 17 : 15;
  lines.forEach((line, i) => {
    slide.addText([
      { text: '— ', options: { color: TEAL, bold: true } },
      { text: line,           options: { color: OFF_WHITE } },
    ], {
      x: 0.55, y: yList + i * rowH, w: W - 1.1, h: rowH,
      fontSize, fontFace: 'Arial', valign: 'middle', wrap: true,
    });
  });
}

// Content slide B — large centred impact text (two-part, teal bottom half)
function buildContentImpactSlide(pptx, slide, data, n) {
  slide.background = { color: BG };
  addSlideNum(slide, n);
  addBadge(slide);
  if (data.label) addSectionLabel(slide, data.label);

  // If body is short enough, render as two stacked centred blocks (slide 2/5 style)
  const top  = data.headline || '';
  const bot  = data.body     || '';

  slide.addText(top.toUpperCase(), {
    x: 0.55, y: 1.5, w: W - 1.1, h: 3.5,
    fontSize: 34, color: OFF_WHITE, fontFace: 'Arial', bold: true,
    align: 'center', valign: 'middle', wrap: true, lineSpacingMultiple: 1.15,
  });

  // Short teal separator
  slide.addShape('rect', {
    x: (W - 0.8) / 2, y: 5.3, w: 0.8, h: 0.05,
    fill: { color: TEAL }, line: { type: 'none' },
  });

  if (bot) {
    slide.addText(bot.toUpperCase(), {
      x: 0.55, y: 5.55, w: W - 1.1, h: 3.8,
      fontSize: 28, color: TEAL, fontFace: 'Arial', bold: true,
      align: 'center', valign: 'top', wrap: true, lineSpacingMultiple: 1.2,
    });
  }
}

// Content slide C — headline + paragraph (standard)
function buildContentParaSlide(pptx, slide, data, n) {
  slide.background = { color: BG };
  addSlideNum(slide, n);
  addBadge(slide);
  if (data.label) addSectionLabel(slide, data.label);

  const yHead = data.label ? 1.5 : 1.2;
  addHeadline(slide, data.headline, data.highlight, 0.55, yHead, W - 1.1, 1.8, 30);

  if (data.body) {
    slide.addText(data.body, {
      x: 0.55, y: yHead + 1.95, w: W - 1.1, h: H - (yHead + 1.95) - 0.5,
      fontSize: 26, color: OFF_WHITE, fontFace: 'Arial',
      valign: 'top', wrap: true, lineSpacingMultiple: 1.6,
    });
  }
}

// Quote slide — centred impact quote, attribution below (slide 4 style)
function buildQuoteSlide(pptx, slide, data, n) {
  slide.background = { color: BG };
  addSlideNum(slide, n);
  addBadge(slide);

  // Small icon circle (heart/emphasis)
  slide.addShape('ellipse', {
    x: (W - 0.55) / 2, y: 1.2, w: 0.55, h: 0.55,
    fill: { type: 'none' }, line: { color: TEAL, width: 1.5 },
  });
  slide.addText('♥', {
    x: (W - 0.55) / 2, y: 1.2, w: 0.55, h: 0.55,
    fontSize: 14, color: TEAL, fontFace: 'Arial',
    align: 'center', valign: 'middle', margin: 0,
  });

  const quoteText = data.headline || data.body || '';
  addHeadline(slide, quoteText, data.highlight,
    0.55, 2.1, W - 1.1, 5.5, 34);

  if (data.body && data.headline) {
    slide.addText(data.body, {
      x: 0.55, y: 8.0, w: W - 1.1, h: 1.2,
      fontSize: 14, color: TEAL, fontFace: 'Arial', italic: true,
      align: 'center', valign: 'top',
    });
  }
}

// Stat slide — huge teal number centred
function buildStatSlide(pptx, slide, data, n) {
  slide.background = { color: BG };
  addSlideNum(slide, n);
  addBadge(slide);
  if (data.label) addSectionLabel(slide, data.label);

  slide.addText((data.headline || '').toUpperCase(), {
    x: 0.55, y: 1.5, w: W - 1.1, h: 5.0,
    fontSize: 88, color: TEAL, fontFace: 'Arial', bold: true,
    align: 'center', valign: 'middle', wrap: true,
  });
  if (data.body) {
    slide.addText(data.body, {
      x: 0.55, y: 7.0, w: W - 1.1, h: 2.4,
      fontSize: 18, color: OFF_WHITE, fontFace: 'Arial',
      align: 'center', valign: 'top', wrap: true, lineSpacingMultiple: 1.3,
    });
  }
}

// Action slide — headline + dark quote-card box (slide 7 style)
function buildActionSlide(pptx, slide, data, n) {
  slide.background = { color: BG };
  addSlideNum(slide, n);
  addBadge(slide);
  if (data.label) addSectionLabel(slide, data.label);

  const yHead = data.label ? 1.5 : 1.2;
  addHeadline(slide, data.headline, data.highlight, 0.55, yHead, W - 1.1, 2.0, 30);

  // Quote-card box
  if (data.body) {
    const cardY = yHead + 2.1;
    const cardH = H - cardY - 0.55;
    slide.addShape('roundRect', {
      x: 0.45, y: cardY, w: W - 0.9, h: cardH,
      fill: { color: CARD_BG }, line: { type: 'none' },
      rectRadius: 0.08,
    });
    // Teal left border accent
    slide.addShape('rect', {
      x: 0.45, y: cardY, w: 0.06, h: cardH,
      fill: { color: TEAL }, line: { type: 'none' },
    });
    // Body text inside card — centred vertically
    slide.addText(data.body, {
      x: 0.72, y: cardY + 0.3, w: W - 1.35, h: cardH - 0.6,
      fontSize: 18, color: OFF_WHITE, fontFace: 'Arial', italic: true,
      valign: 'middle', wrap: true, lineSpacingMultiple: 1.55,
    });
  }
}

// Close slide — badge centred, handle, Childline button (slide 8 style)
function buildCloseSlide(pptx, slide, data, n) {
  slide.background = { color: BG };
  addSlideNum(slide, n);

  // Large CSG badge centred
  slide.addShape('ellipse', {
    x: (W - 1.6) / 2, y: 1.4, w: 1.6, h: 1.6,
    fill: { type: 'none' }, line: { color: TEAL, width: 2.5 },
  });
  slide.addText('CYBER\nSAFETY\nGUY', {
    x: (W - 1.6) / 2, y: 1.4, w: 1.6, h: 1.6,
    fontSize: 9, color: TEAL, fontFace: 'Arial', bold: true,
    align: 'center', valign: 'middle', margin: 0,
  });

  // Name
  slide.addText('Cyber Safety Guy', {
    x: 0.55, y: 3.3, w: W - 1.1, h: 0.55,
    fontSize: 22, color: OFF_WHITE, fontFace: 'Arial', bold: true, align: 'center',
  });

  // Handle
  slide.addText('@cybersafetyguy', {
    x: 0.55, y: 3.95, w: W - 1.1, h: 0.4,
    fontSize: 15, color: TEAL, fontFace: 'Arial', align: 'center',
  });

  // CTA headline
  if (data.headline) {
    slide.addText(data.headline, {
      x: 0.55, y: 4.65, w: W - 1.1, h: 1.2,
      fontSize: 17, color: OFF_WHITE, fontFace: 'Arial',
      align: 'center', valign: 'middle', wrap: true,
    });
  }

  // Childline pill button
  slide.addShape('roundRect', {
    x: 1.8, y: 6.1, w: W - 3.6, h: 0.95,
    fill: { color: RED }, line: { type: 'none' },
    rectRadius: 0.12,
  });
  slide.addText('Childline: 0800 1111\nchildline.org.uk', {
    x: 1.8, y: 6.1, w: W - 3.6, h: 0.95,
    fontSize: 14, color: OFF_WHITE, fontFace: 'Arial', bold: true,
    align: 'center', valign: 'middle', margin: 0,
  });

  // Footer CTA
  slide.addText('⚡ Please don\'t forget to react and restack ⚡', {
    x: 0.55, y: 7.4, w: W - 1.1, h: 0.5,
    fontSize: 11, color: GREY, fontFace: 'Arial', align: 'center',
  });

  // cybersafetyguy.com
  slide.addText('cybersafetyguy.com', {
    x: 0.55, y: H - 0.55, w: W - 1.1, h: 0.38,
    fontSize: 11, color: GREY, fontFace: 'Arial', align: 'center',
  });
}

// ── content slide router ─────────────────────────────────────────────────────
// Cycles through 3 layouts for variety
const CONTENT_LAYOUTS = [buildContentListSlide, buildContentParaSlide, buildContentImpactSlide];
let contentSlotIndex = 0;

// ── main export ──────────────────────────────────────────────────────────────

export async function buildCarouselPptx(topic, pack) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'SQUARE', width: W, height: H });
  pptx.layout = 'SQUARE';

  contentSlotIndex = 0;

  const rawSlides = Array.isArray(pack.instagram_carousel) ? pack.instagram_carousel : [];
  const slideData = rawSlides.slice(0, 8);
  while (slideData.length < 8) {
    slideData.push({ slide_number: slideData.length + 1, type: 'content', headline: '', body: '' });
  }

  slideData.forEach((data, i) => {
    const n     = i + 1;
    const slide = pptx.addSlide();
    const type  = (data.type || 'content').toLowerCase();

    switch (type) {
      case 'cover':
        buildCoverSlide(pptx, slide, data, topic);
        break;
      case 'quote':
        buildQuoteSlide(pptx, slide, data, n);
        break;
      case 'stat':
        buildStatSlide(pptx, slide, data, n);
        break;
      case 'action':
        buildActionSlide(pptx, slide, data, n);
        break;
      case 'close':
        buildCloseSlide(pptx, slide, data, n);
        break;
      default: {
        const layout = CONTENT_LAYOUTS[contentSlotIndex % CONTENT_LAYOUTS.length];
        contentSlotIndex++;
        layout(pptx, slide, data, n);
      }
    }
  });

  return await pptx.write({ outputType: 'nodebuffer' });
}