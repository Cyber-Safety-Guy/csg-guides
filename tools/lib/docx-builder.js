/**
 * DOCX Builder for CSG Content Packs
 * Builds fully formatted .docx files from content pack JSON
 */

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, PageNumber, Footer, Header, LevelFormat } = require('docx');
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
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '100% of subscription income donated to Childline (NSPCC)',
          size: 18,
          color: COLORS.CHILDLINE_RED
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 }
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
function createSectionHeading(title, sectionNumber) {
  const paragraphs = [];
  
  // Add SECTION N label if section number provided
  if (sectionNumber) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: `SECTION ${sectionNumber}`,
          size: 18,
          color: COLORS.SECONDARY_GREY
        })
      ],
      spacing: { before: 400, after: 100 }
    }));
  }
  
  // Add the main heading
  paragraphs.push(new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 28,
        color: COLORS.TEAL
      })
    ],
    spacing: { before: sectionNumber ? 0 : 400, after: 400 }
  }));
  
  return paragraphs;
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
    spacing: { before: 0, after: 240 }
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
/**
 * Parse SEO block from substack post and format with bold labels
 */
function parseSubstackSEO(content) {
  const paragraphs = [];
  const lines = content.split('\n');
  const seoLines = [];
  const bodyLines = [];
  let inSEO = true;
  
  // Separate SEO block from body content
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (inSEO && (line.match(/^Title:\s*(.+)$/) || line.match(/^Description:\s*(.+)$/) || line.match(/^Slug:\s*(.+)$/))) {
      seoLines.push(line);
    } else if (line) {
      inSEO = false;
      bodyLines.push(line);
    }
  }
  
  // Create SEO box with all SEO metadata
  if (seoLines.length > 0) {
    const seoChildren = [];
    
    seoLines.forEach((line, index) => {
      const titleMatch = line.match(/^Title:\s*(.+)$/);
      const descMatch = line.match(/^Description:\s*(.+)$/);
      const slugMatch = line.match(/^Slug:\s*(.+)$/);
      
      if (index > 0) {
        seoChildren.push(new TextRun({ text: '\n' }));
      }
      
      if (titleMatch) {
        const value = titleMatch[1];
        seoChildren.push(new TextRun({
          text: `Title (${value.length} chars): `,
          bold: true,
          color: COLORS.DARK_TEAL,
          size: 22
        }));
        seoChildren.push(new TextRun({
          text: value,
          color: COLORS.NEAR_BLACK,
          size: 22
        }));
      } else if (descMatch) {
        const value = descMatch[1];
        seoChildren.push(new TextRun({
          text: `Description (${value.length} chars): `,
          bold: true,
          color: COLORS.DARK_TEAL,
          size: 22
        }));
        seoChildren.push(new TextRun({
          text: value,
          color: COLORS.NEAR_BLACK,
          size: 22
        }));
      } else if (slugMatch) {
        const value = slugMatch[1];
        seoChildren.push(new TextRun({
          text: 'URL slug: ',
          bold: true,
          color: COLORS.DARK_TEAL,
          size: 22
        }));
        seoChildren.push(new TextRun({
          text: value,
          color: COLORS.NEAR_BLACK,
          size: 22
        }));
      }
    });
    
    // Add SEO box
    paragraphs.push(new Paragraph({
      children: seoChildren,
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
    }));
    
    // Add divider after SEO block
    paragraphs.push(new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.TEAL }
      },
      spacing: { before: 0, after: 400 }
    }));
  }
  
  // Process body content with markdown formatting
  for (const line of bodyLines) {
    // 1. Horizontal rule (---)
    if (line.trim() === '---') {
      paragraphs.push(new Paragraph({
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.TEAL }
        },
        spacing: { before: 200, after: 200 }
      }));
      continue;
    }
    
    // 2. Standalone **heading** (entire line wrapped in **)
    if (line.startsWith('**') && line.endsWith('**') && line.indexOf('**', 2) === line.length - 2) {
      const headingText = line.slice(2, -2);
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: headingText,
            bold: true,
            color: COLORS.TEAL,
            size: 26
          })
        ],
        spacing: { before: 0, after: 240 }
      }));
      continue;
    }
    
    // 3. Numbered list (1., 2., etc.)
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      const text = numberedMatch[2];
      paragraphs.push(new Paragraph({
        children: parseInlineFormatting(text),
        numbering: {
          reference: 'default-numbering',
          level: 0
        },
        spacing: { before: 0, after: 240 }
      }));
      continue;
    }
    
    // 4. Bullet points (•, -, *)
    const bulletMatch = line.match(/^[•\-\*]\s+(.+)$/);
    if (bulletMatch) {
      const text = bulletMatch[1];
      paragraphs.push(new Paragraph({
        children: parseInlineFormatting(text),
        bullet: {
          level: 0
        },
        spacing: { before: 0, after: 240 }
      }));
      continue;
    }
    
    // 5. Regular paragraph with inline **bold** formatting
    paragraphs.push(new Paragraph({
      children: parseInlineFormatting(line),
      spacing: { before: 0, after: 240 }
    }));
  }
  
  return paragraphs;
}

/**
 * Parse inline markdown formatting (bold, italic, HTML spans, and Childline highlighting)
 */
function parseInlineFormatting(text) {
  const children = [];
  
  // First, handle HTML span tags with color styling
  // Match <span style="color: red;">text</span> or similar patterns
  text = text.replace(/<span\s+style=["']color:\s*red;?["']>([^<]+)<\/span>/gi, (match, innerText) => {
    return innerText; // Strip the HTML, keep the text (will be colored by Childline detection)
  });
  
  // Split by **bold** markers while preserving the markers
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  
  for (const part of boldParts) {
    if (!part) continue;
    
    // Check if this part is wrapped in **
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      children.push(new TextRun({
        text: boldText,
        bold: true,
        color: COLORS.NEAR_BLACK,
        size: 22
      }));
    } else {
      // Split by single asterisk *italic* markers
      const italicParts = part.split(/(\*[^*]+\*)/g);
      
      for (const italicPart of italicParts) {
        if (!italicPart) continue;
        
        // Check if this part is wrapped in single *
        if (italicPart.startsWith('*') && italicPart.endsWith('*') && !italicPart.startsWith('**')) {
          const italicText = italicPart.slice(1, -1);
          
          // Apply Childline highlighting to italic text
          const childlineParts = italicText.split(/(0800 1111|childline\.org\.uk|Childline)/gi);
          for (const childlinePart of childlineParts) {
            if (!childlinePart) continue;
            
            if (childlinePart.match(/0800 1111|childline\.org\.uk|Childline/i)) {
              children.push(new TextRun({
                text: childlinePart,
                italic: true,
                color: COLORS.CHILDLINE_RED,
                size: 22
              }));
            } else {
              children.push(new TextRun({
                text: childlinePart,
                italic: true,
                color: COLORS.NEAR_BLACK,
                size: 22
              }));
            }
          }
        } else {
          // Regular text - apply Childline highlighting
          const childlineParts = italicPart.split(/(0800 1111|childline\.org\.uk|Childline)/gi);
          for (const childlinePart of childlineParts) {
            if (!childlinePart) continue;
            
            if (childlinePart.match(/0800 1111|childline\.org\.uk|Childline/i)) {
              children.push(new TextRun({
                text: childlinePart,
                color: COLORS.CHILDLINE_RED,
                size: 22
              }));
            } else {
              children.push(new TextRun({
                text: childlinePart,
                color: COLORS.NEAR_BLACK,
                size: 22
              }));
            }
          }
        }
      }
    }
  }
  
  return children;
}

async function build(json, topic, outputPath) {
  // Apply footnote year fixes to all content
  let contentStr = JSON.stringify(json);
  contentStr = contentStr.replace(/accessed June 2025/g, 'accessed June 2026')
                         .replace(/accessed May 2025/g, 'accessed May 2026')
                         .replace(/accessed April 2025/g, 'accessed April 2026');
  json = JSON.parse(contentStr);
  
  const sections = [];
  
  // Section 1: Substack Post
  sections.push(...createSectionHeading('1. Substack Blog Post', 1));
  sections.push(...parseSubstackSEO(json.substack_post));
  sections.push(createDivider());
  
  // Section 2: LinkedIn Post
  sections.push(...createSectionHeading('2. LinkedIn Post', 2));
  sections.push(createSubheading(`Mode: ${json.linkedin_post.mode}`));
  sections.push(createBodyParagraph(`Reasoning: ${json.linkedin_post.reasoning}`));
  sections.push(createSubheading('Content:'));
  sections.push(createSocialBox(json.linkedin_post.content));
  sections.push(createDivider());
  
  // Section 3: LinkedIn Teaser
  sections.push(...createSectionHeading('3. LinkedIn Teaser', 3));
  sections.push(createSocialBox(json.linkedin_teaser));
  sections.push(createDivider());
  
  // Section 4: Instagram Post
  sections.push(...createSectionHeading('4. Instagram Post', 4));
  sections.push(createSocialBox(json.instagram_post));
  sections.push(createDivider());
  
  // Section 5: Image Prompt
  sections.push(...createSectionHeading('5. Image Prompt', 5));
  sections.push(createBodyParagraph(json.image_prompt));
  sections.push(createDivider());
  
  // Section 6: Substack Note
  sections.push(...createSectionHeading('6. Substack Note', 6));
  sections.push(createSocialBox(json.substack_note));
  sections.push(createDivider());
  
  // Section 7: BlueSky Thread
  sections.push(...createSectionHeading('7. BlueSky Thread', 7));
  json.bluesky_thread.forEach((post, index) => {
    sections.push(createSubheading(`Post ${index + 1} (${post.char_count} characters)`));
    sections.push(createSocialBox(post.text));
  });
  sections.push(createDivider());
  
  // Section 8: X Post
  sections.push(...createSectionHeading('8. X Post', 8));
  sections.push(createSubheading(`${json.x_post.char_count} characters`));
  sections.push(createSocialBox(json.x_post.text));
  sections.push(createDivider());
  
  // Section 9: Reel Script + YouTube Shorts
  sections.push(...createSectionHeading('9. Reel Script + YouTube Shorts', 9));
  sections.push(createSubheading('Instagram Reel Script:'));
  sections.push(createBodyParagraph(json.reel_script.instagram));
  sections.push(createSubheading('YouTube Shorts:'));
  sections.push(createBodyParagraph(json.reel_script.youtube_shorts));
  
  // Create document
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 }
                }
              }
            }
          ]
        }
      ]
    },
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
