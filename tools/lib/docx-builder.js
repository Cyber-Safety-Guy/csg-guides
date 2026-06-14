/**
 * DOCX Builder for CSG Content Packs
 * Builds fully formatted .docx files from content pack JSON
 */

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, PageNumber, Footer, Header } = require('docx');
const fs = require('fs').promises;

// Brand colors
const COLORS = {
  DARK_NAVY: '142A46',
  TEAL: '42CED0',
  DARK_TEAL: '1A5C5F',
  NEAR_BLACK: '222222',
  CHILDLINE_RED: 'C0392B',
  SECONDARY_GREY: '7B9EA0',
  OFF_WHITE: 'E8F4F5'
};

/**
 * Create header for all pages
 */
function createHeader(topic) {
  const date = new Date();
  const monthYear = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  
  return new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: `CYBER SAFETY GUY | Content Pack | ${topic} | ${monthYear}`,
            color: COLORS.SECONDARY_GREY,
            size: 18
          })
        ],
        alignment: AlignmentType.CENTER
      })
    ]
  });
}

/**
 * Create footer for all pages
 */
function createFooter() {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: 'cybersafetyguy.com | Childline: ',
            size: 18
          }),
          new TextRun({
            text: '0800 1111',
            color: COLORS.CHILDLINE_RED,
            size: 18
          }),
          new TextRun({
            text: ' | ',
            size: 18
          }),
          new TextRun({
            text: 'childline.org.uk',
            color: COLORS.CHILDLINE_RED,
            size: 18
          }),
          new TextRun({
            text: ' | Page ',
            size: 18
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 18
          })
        ],
        alignment: AlignmentType.CENTER
      })
    ]
  });
}

/**
 * Create cover page
 */
function createCoverPage(topic) {
  const date = new Date();
  const monthYear = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: 'CYBER SAFETY GUY',
          bold: true,
          size: 48,
          color: COLORS.TEAL
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 4000, after: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Content Pack',
          size: 32,
          color: COLORS.OFF_WHITE
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 2000 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: topic,
          bold: true,
          size: 36,
          color: COLORS.TEAL
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: monthYear,
          size: 24,
          color: COLORS.SECONDARY_GREY
        })
      ],
      alignment: AlignmentType.CENTER
    })
  ];
}

/**
 * Create contents page
 */
function createContentsPage() {
  return [
    new Paragraph({
      text: 'Contents',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 400 },
      color: COLORS.TEAL
    }),
    new Paragraph({ text: '1. Substack Blog Post', spacing: { after: 200 } }),
    new Paragraph({ text: '2. LinkedIn Post', spacing: { after: 200 } }),
    new Paragraph({ text: '3. LinkedIn Teaser', spacing: { after: 200 } }),
    new Paragraph({ text: '4. Instagram Post', spacing: { after: 200 } }),
    new Paragraph({ text: '5. Image Prompt', spacing: { after: 200 } }),
    new Paragraph({ text: '6. Substack Note', spacing: { after: 200 } }),
    new Paragraph({ text: '7. BlueSky Thread', spacing: { after: 200 } }),
    new Paragraph({ text: '8. X Post', spacing: { after: 200 } }),
    new Paragraph({ text: '9. Reel Script + YouTube Shorts', spacing: { after: 200 } })
  ];
}

/**
 * Create section heading
 */
function createSectionHeading(title) {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 28,
        color: COLORS.TEAL
      })
    ],
    spacing: { before: 400, after: 400 }
  });
}

/**
 * Create subheading
 */
function createSubheading(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 24,
        color: COLORS.DARK_TEAL
      })
    ],
    spacing: { before: 300, after: 200 }
  });
}

/**
 * Create body paragraph
 */
function createBodyParagraph(text, options = {}) {
  const children = [];
  
  if (options.highlight) {
    // Highlight Childline references in red
    const parts = text.split(/(0800 1111|childline\.org\.uk|Childline)/gi);
    parts.forEach(part => {
      if (part.match(/0800 1111|childline\.org\.uk|Childline/i)) {
        children.push(new TextRun({
          text: part,
          color: COLORS.CHILDLINE_RED,
          size: 22
        }));
      } else {
        children.push(new TextRun({
          text: part,
          color: COLORS.NEAR_BLACK,
          size: 22
        }));
      }
    });
  } else {
    children.push(new TextRun({
      text: text,
      color: options.color || COLORS.NEAR_BLACK,
      size: 22,
      bold: options.bold || false
    }));
  }
  
  return new Paragraph({
    children: children,
    spacing: { before: 0, after: 200 }
  });
}

/**
 * Create social media box (teal border, off-white background)
 */
function createSocialBox(content) {
  return new Paragraph({
    children: [
      new TextRun({
        text: content,
        color: COLORS.NEAR_BLACK,
        size: 22
      })
    ],
    border: {
      top: { style: BorderStyle.SINGLE, size: 6, color: COLORS.TEAL },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.TEAL },
      left: { style: BorderStyle.SINGLE, size: 6, color: COLORS.TEAL },
      right: { style: BorderStyle.SINGLE, size: 6, color: COLORS.TEAL }
    },
    shading: {
      fill: COLORS.OFF_WHITE
    },
    spacing: { before: 200, after: 200 }
  });
}

/**
 * Create divider line
 */
function createDivider() {
  return new Paragraph({
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.TEAL }
    },
    spacing: { before: 400, after: 400 }
  });
}

/**
 * Build complete DOCX document
 */
async function build(json, topic, outputPath) {
  const sections = [];
  
  // Section 1: Substack Post
  sections.push(createSectionHeading('1. Substack Blog Post'));
  sections.push(createBodyParagraph(json.substack_post, { highlight: true }));
  sections.push(createDivider());
  
  // Section 2: LinkedIn Post
  sections.push(createSectionHeading('2. LinkedIn Post'));
  sections.push(createSubheading(`Mode: ${json.linkedin_post.mode}`));
  sections.push(createBodyParagraph(`Reasoning: ${json.linkedin_post.reasoning}`));
  sections.push(createSubheading('Content:'));
  sections.push(createSocialBox(json.linkedin_post.content));
  sections.push(createDivider());
  
  // Section 3: LinkedIn Teaser
  sections.push(createSectionHeading('3. LinkedIn Teaser'));
  sections.push(createSocialBox(json.linkedin_teaser));
  sections.push(createDivider());
  
  // Section 4: Instagram Post
  sections.push(createSectionHeading('4. Instagram Post'));
  sections.push(createSocialBox(json.instagram_post));
  sections.push(createDivider());
  
  // Section 5: Image Prompt
  sections.push(createSectionHeading('5. Image Prompt'));
  sections.push(createBodyParagraph(json.image_prompt));
  sections.push(createDivider());
  
  // Section 6: Substack Note
  sections.push(createSectionHeading('6. Substack Note'));
  sections.push(createSocialBox(json.substack_note));
  sections.push(createDivider());
  
  // Section 7: BlueSky Thread
  sections.push(createSectionHeading('7. BlueSky Thread'));
  json.bluesky_thread.forEach((post, index) => {
    sections.push(createSubheading(`Post ${index + 1} (${post.char_count} characters)`));
    sections.push(createSocialBox(post.text));
  });
  sections.push(createDivider());
  
  // Section 8: X Post
  sections.push(createSectionHeading('8. X Post'));
  sections.push(createSubheading(`${json.x_post.char_count} characters`));
  sections.push(createSocialBox(json.x_post.text));
  sections.push(createDivider());
  
  // Section 9: Reel Script + YouTube Shorts
  sections.push(createSectionHeading('9. Reel Script + YouTube Shorts'));
  sections.push(createSubheading('Instagram Reel Script:'));
  sections.push(createBodyParagraph(json.reel_script.instagram));
  sections.push(createSubheading('YouTube Shorts:'));
  sections.push(createBodyParagraph(json.reel_script.youtube_shorts));
  
  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: { default: createHeader(topic) },
        footers: { default: createFooter() },
        children: [
          ...createCoverPage(topic),
          new Paragraph({ text: '', pageBreakBefore: true }),
          ...createContentsPage(),
          new Paragraph({ text: '', pageBreakBefore: true }),
          ...sections
        ]
      }
    ]
  });
  
  // Save to file
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer);
  
  return outputPath;
}

module.exports = { build };
