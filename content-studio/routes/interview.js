import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  const textBlocks = response.content.filter(b => b.type === 'text');
  return textBlocks.map(b => b.text).join('\n').trim();
}

async function generateQuestions(topic, research) {
  const prompt = `You are preparing a content pack for Dale McGleenon (Cyber Safety Guy). Dale is a former RAF Police officer with 8 years in DFIR, founder of a child online safety platform. His content must sound like him — not like AI.

The topic is: ${topic}

Here are the verified current facts about this topic:
${research}

Your job is to identify the 4-5 passages in a content pack on this topic that REQUIRE Dale's actual words — his opinions, reactions, analogies, and credibility references — and generate the interview questions to get them.

Focus on:
- His reaction to the core controversy or event (not "what do you think" — something specific)
- His take on the argument the other side is making
- How he'd explain the core issue to a parent in plain terms (an analogy or framing)
- Any connection to his DFIR/RAF background that's actually relevant (don't force it)
- What he wants parents to DO with this information

Rules for questions:
- Ask open questions — never draft a sentence and ask "does this sound right?"
- One question per object
- "Rough words are fine" where relevant
- Make each question specific to THIS topic, not generic

Return a JSON array only, no other text:
[
  {
    "id": "reaction",
    "section": "Blog post opening reaction",
    "question": "..."
  },
  ...
]`;

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : text);
}

// POST /api/interview
// Body: { topic, notes }
// Returns: { research, questions }
router.post('/', async (req, res) => {
  const { topic, notes } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic is required' });

  try {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    const sendEvent = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    sendEvent('status', { message: 'Researching current facts...' });
    const research = await researchTopic(topic);

    sendEvent('status', { message: 'Generating interview questions...' });
    const questions = await generateQuestions(topic, research);

    sendEvent('ready', { research, questions });
    res.end();

  } catch (err) {
    console.error('[interview]', err);
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    res.end();
  }
});

export default router;