#!/usr/bin/env node

/**
 * CSG Content Pack Generator
 * Main orchestrator for generating complete content packs
 * Usage: node generate-content-pack.js "Your topic here"
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs').promises;
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const https = require('https');
const { validateAll } = require('./lib/char-validator');
const { build: buildDocx } = require('./lib/docx-builder');
const { uploadDocx, uploadImage } = require('./lib/drive-uploader');

/**
 * Download image from URL to buffer
 */
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Create URL-friendly slug from topic
 */
function createSlug(topic) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Strip markdown code fences from JSON response
 */
function stripMarkdownFences(text) {
  // Remove ```json and ``` fences
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();
}

/**
 * Main execution
 */
async function main() {
  try {
    // 1. Get topic from CLI argument
    const topic = process.argv[2];
    
    if (!topic) {
      console.error('❌ Error: No topic provided');
      console.error('Usage: node generate-content-pack.js "Your topic here"');
      process.exit(1);
    }
    
    console.log(`\n🚀 Generating content pack for: "${topic}"\n`);
    
    // 2. Load system prompt
    console.log('📖 Loading system prompt...');
    const systemPromptPath = path.join(__dirname, 'prompts', 'content-pack-system.md');
    const systemPrompt = await fs.readFile(systemPromptPath, 'utf8');
    console.log('✓ System prompt loaded\n');
    
    // 3. Call Anthropic API
    console.log('🤖 Calling Claude API to generate content...');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: topic
        }
      ]
    });
    
    const responseText = message.content[0].text;
    console.log('✓ Content generated\n');
    
    // 4. Parse JSON response
    console.log('📝 Parsing JSON response...');
    const cleanedResponse = stripMarkdownFences(responseText);
    let contentPack;
    
    try {
      contentPack = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response');
      console.error('Response preview:', cleanedResponse.substring(0, 500));
      throw new Error(`JSON parse error: ${parseError.message}`);
    }
    
    console.log('✓ JSON parsed successfully\n');
    
    // 5. Validate character limits
    console.log('🔍 Validating character limits...');
    const validation = validateAll(contentPack);
    
    if (!validation.allValid) {
      console.warn('⚠️  Warning: Some posts exceed character limits:\n');
      
      validation.bluesky.forEach(post => {
        if (!post.valid) {
          console.warn(`   BlueSky post ${post.post}: ${post.length} chars (over by ${post.overage})`);
        }
      });
      
      if (validation.x && !validation.x.valid) {
        console.warn(`   X post: ${validation.x.length} chars (over by ${validation.x.overage})`);
      }
      
      console.warn('\n   Continuing anyway...\n');
    } else {
      console.log('✓ All character limits validated\n');
    }
    
    // 6. Build DOCX
    console.log('📄 Building DOCX document...');
    const slug = createSlug(topic);
    const docxPath = `/tmp/${slug}.docx`;
    
    await buildDocx(contentPack, topic, docxPath);
    console.log(`✓ DOCX built: ${docxPath}\n`);
    
    // 7. Generate image with gpt-image-1
    console.log('🎨 Generating blog header image...');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const imageResponse = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: contentPack.image_prompt,
      n: 1,
      size: '1792x1024',
      output_format: 'png'
    });
    
    const imageUrl = imageResponse.data[0].url;
    const imageBuffer = await downloadImage(imageUrl);
    console.log('✓ Image generated\n');
    
    // 9. Upload DOCX to Google Drive
    console.log('☁️  Uploading DOCX to Google Drive...');
    const docxFilename = `CSG_${slug}.docx`;
    const docxDriveUrl = await uploadDocx(docxPath, docxFilename);
    console.log(`✓ DOCX uploaded: ${docxDriveUrl}\n`);
    
    // 10. Upload image to Google Drive
    console.log('☁️  Uploading image to Google Drive...');
    const imageFilename = `${slug}-header.png`;
    const imageDriveUrl = await uploadImage(imageBuffer, imageFilename);
    console.log(`✓ Image uploaded: ${imageDriveUrl}\n`);
    
    // 11. Success summary
    console.log('✅ Content pack generation complete!\n');
    console.log('📦 Results:');
    console.log(`   Topic: ${topic}`);
    console.log(`   DOCX: ${docxDriveUrl}`);
    console.log(`   Image: ${imageDriveUrl}`);
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run main function
main();
