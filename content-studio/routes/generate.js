import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { spawn } from 'child_process';
import { writeFile, readFile, rm, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { SYSTEM_PROMPT } from '../lib/system-prompt.js';
import { buildDocx } from '../lib/docx-builder.js';
import { uploadToDrive } from '../lib/drive-uploader.js';

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Image generation via Replicate (Flux Schnell) ─────────────────────────────
async function generateImage(prompt) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('REPLICATE_API_TOKEN not set');

  // Create prediction
  const createRes = await fetch(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { prompt, aspect_ratio: '16:9', output_format: 'png' } }),
    }
  );
  if (!createRes.ok) throw new Error(`Replicate create failed: ${await createRes.text()}`);
  const prediction = await createRes.json();

  // Poll until done (Flux Schnell is usually ~4s — wait 3s before first poll)
  await new Promise(r => setTimeout(r, 3000));
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    result = await pollRes.json();
  }

  if (result.status === 'failed') throw new Error(`Replicate generation failed: ${result.error}`);

  // Fetch the image buffer
  const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error('Failed to fetch generated image');
  return Buffer.from(await imgRes.arrayBuffer());
}

// ── Research (used only in single-pass mode) ──────────────────────────────────
async function researchTopic(topic) {
  const researchPrompt = `Research the following topic and return a concise summary of current, verified facts relevant to it. Focus on:
- Current dates, timelines, and where things stand right now
- Accurate statistics and figures (with sources)
- Current state of any ongoing legal cases, platform policies, or news events
- Who is currently involved (executives, regulators, attorneys general, etc.)

Topic: ${topic}

Return a short factual briefing (bullet points, 200 words max). If you cannot find current information on something, say so explicitly rather than guessing.`;

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{ role: 'user', content: researchPrompt }],
  });

  // Extract the final text response (after any tool use turns)
  const textBlocks = response.content.filter(b => b.type === 'text');
  return textBlocks.map(b => b.text).join('\n').trim();
}

// ── Step 2: Build carousel PNGs ───────────────────────────────────────────────
async function buildCarousel(topic, pack) {
  const workDir = await mkdtemp(path.join(tmpdir(), `carousel-${Date.now()}-`));
  const jsonFile = path.join(workDir, 'pack.json');

  await writeFile(jsonFile, JSON.stringify(pack));

  const { zipPath } = await new Promise((resolve, reject) => {
    const py = spawn('python3', [
      '/app/lib/carousel-builder.py',
      topic,
      jsonFile,
      workDir,
    ]);

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', d => { stdout += d.toString(); });
    py.stderr.on('data', d => { stderr += d.toString(); });

    py.on('close', code => {
      if (code !== 0) {
        console.error('[carousel] stderr:', stderr);
        return reject(new Error(`carousel-builder exited ${code}: ${stderr.slice(0, 500)}`));
      }

      let zipPath = null;
      for (const line of stdout.split('\n')) {
        if (line.startsWith('ZIP:')) zipPath = line.slice(4).trim();
      }

      if (!zipPath) {
        return reject(new Error(`carousel-builder missing ZIP path. stdout: ${stdout}`));
      }

      resolve({ zipPath });
    });
  });

  return { zipPath, workDir };
}

// ── Output ID → human label map (for prompt injection) ────────────────────────
const OUTPUT_LABELS = {
  blog:           'Blog post (blog_post, blog_seo, content_pack_title)',
  linkedin:       'LinkedIn post + teaser (linkedin_post, linkedin_teaser, linkedin_mode, linkedin_mode_reasoning)',
  substack:       'Substack Note (substack_note)',
  instagram_post: 'Instagram single image post (instagram_post)',
  carousel:       'Instagram carousel + swipe-through caption (instagram_carousel, swipe_through_caption)',
  reel:           'Reel script + YouTube Shorts (reel_script, reel_hook, reel_format, reel_actions, instagram_reel_caption, instagram_reel_hashtags, youtube_shorts_title, youtube_shorts_description)',
  bluesky:        'Bluesky thread (bluesky_thread)',
  x_post:         'X post (x_post)',
};

// Image prompt is generated whenever instagram_post OR carousel is requested
function needsImagePrompt(outputs) {
  return !outputs || outputs.includes('instagram_post') || outputs.includes('carousel') || outputs.includes('blog');
}

router.post('/', async (req, res) => {
  // answers: [{ id, question, answer }] — supplied by two-pass interview flow
  // research: string — pre-done in interview phase; skip research step if present
  // outputs: string[] — which output groups to generate (all if omitted)
  const { topic, notes, research: preResearch, answers, outputs } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic is required' });

  // Normalise outputs: if omitted or empty, treat as "all standard"
  const selectedOutputs = (outputs && outputs.length > 0)
    ? outputs
    : ['blog', 'linkedin', 'substack', 'instagram_post', 'carousel', 'reel'];

  try {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    const sendEvent = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    // ── Research phase (skip if already done in interview step) ────────────────
    let researchBriefing = preResearch || '';
    if (!researchBriefing) {
      sendEvent('status', { message: 'Researching current facts...' });
      try {
        researchBriefing = await researchTopic(topic);
        console.log('[research] briefing:', researchBriefing.slice(0, 300));
      } catch (researchErr) {
        console.warn('[research] failed, proceeding without:', researchErr.message);
        researchBriefing = 'Research step failed — treat any time-sensitive facts with caution.';
      }
    }

    // ── Build interview answers block ──────────────────────────────────────────
    let answersBlock = '';
    if (answers && answers.length > 0) {
      answersBlock = `<dale_voice>
The following are Dale's actual words, gathered in an interview before generation. Use these verbatim or near-verbatim in the relevant sections. Do not paraphrase into smoother prose — his rough phrasing is intentional and is what makes the content sound like him rather than AI.

${answers.map(a => `[${a.section || a.id}]\nQ: ${a.question}\nA: ${a.answer}`).join('\n\n')}
</dale_voice>

`;
    }

    // ── Generation phase ───────────────────────────────────────────────────────
    sendEvent('status', { message: 'Generating content pack with Claude...' });

    const basePrompt = notes
      ? `Topic: ${topic}\n\nAdditional notes: ${notes}`
      : `Topic: ${topic}`;

    // Build outputs instruction block
    const outputLines = selectedOutputs.map(id => `- ${OUTPUT_LABELS[id] || id}`).join('\n');
    const omittedIds = Object.keys(OUTPUT_LABELS).filter(id => !selectedOutputs.includes(id));
    const omittedFields = omittedIds.flatMap(id => {
      const label = OUTPUT_LABELS[id] || id;
      const match = label.match(/\(([^)]+)\)/);
      return match ? match[1].split(',').map(s => s.trim()) : [];
    });

    const outputsBlock = `<outputs_requested>
Generate ONLY the following outputs. For any JSON field NOT listed below, set its value to null (or an empty array for array fields).

${outputLines}
${needsImagePrompt(selectedOutputs) ? '- Image prompt (image_prompt)' : ''}

Fields to set null/empty: ${omittedFields.length ? omittedFields.join(', ') : 'none'}
</outputs_requested>

`;

    const userPrompt = `<research>
The following facts were verified via web search moments ago. Use these as ground truth for any time-sensitive details. Do not contradict them or substitute your own training data.

${researchBriefing}
</research>

${outputsBlock}${answersBlock}${basePrompt}`;

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    sendEvent('status', { message: 'Parsing response...' });
    let pack;
    try {
      const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
      pack = JSON.parse(jsonMatch ? jsonMatch[0] : message.content[0].text);
    } catch (e) {
      sendEvent('error', { message: 'Failed to parse Claude response as JSON.' });
      return res.end();
    }

    // ── Word doc ───────────────────────────────────────────────────────────────
    sendEvent('status', { message: 'Building Word document...' });
    const date = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const docxBuffer = await buildDocx(topic, date, pack);

    sendEvent('status', { message: 'Uploading Word doc to Google Drive...' });
    // Use the pack's clean title for filenames; fall back to truncated topic
    const rawTitle = (pack.content_pack_title || topic)
      .replace(/^CSG Content Pack:\s*/i, '')  // strip prefix if present
      .replace(/[^a-z0-9\s]/gi, '')           // remove special chars
      .trim()
      .slice(0, 50)                           // cap at 50 chars
      .trim();
    const safeFilename = rawTitle.replace(/\s+/g, '_').toLowerCase();
    const docxFilename = `CSG_${safeFilename}.docx`;
    const driveLink = await uploadToDrive(docxFilename, docxBuffer, process.env.GOOGLE_DRIVE_FOLDER_ID);

    // ── Instagram carousel (only if requested) ────────────────────────────────
    let zipDriveLink = null;

    if (selectedOutputs.includes('carousel') && pack.instagram_carousel) {
      sendEvent('status', { message: 'Building Instagram carousel (this takes ~30s)...' });
      let workDir = null;

      try {
        const result = await buildCarousel(topic, pack);
        workDir = result.workDir;

        sendEvent('status', { message: 'Uploading carousel PNGs ZIP to Google Drive...' });
        const zipBuffer = await readFile(result.zipPath);
        const zipFilename = `CSG_Carousel_${safeFilename}.zip`;
        zipDriveLink = await uploadToDrive(zipFilename, zipBuffer, process.env.GOOGLE_DRIVE_FOLDER_ID);

      } catch (carouselErr) {
        console.error('[carousel] Build failed:', carouselErr.message);
        sendEvent('status', { message: `Carousel failed (Word doc still uploaded): ${carouselErr.message}` });
      } finally {
        if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    sendEvent('complete', {
      message: 'Content pack ready!',
      drive_link: driveLink,
      zip_drive_link: zipDriveLink,
      image_prompt: pack.image_prompt || null,
      bluesky_lengths: (pack.bluesky_thread || []).map(p => p.length),
      x_length: (pack.x_post || '').length,
    });

    res.end();
  } catch (err) {
    console.error(err);
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    res.end();
  }
});

export default router;