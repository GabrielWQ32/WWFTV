// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

// 1) Set up Express
const app = express();
app.use(cors());
app.use(express.json());

// 2) Serve static files from /public
app.use(express.static('public'));

// 3) Initialize OpenAI (v5 client)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
console.log('🔑 OpenAI key loaded:', Boolean(process.env.OPENAI_API_KEY));

// 4) AI‐powered search endpoint
app.post('/api/ai-search', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'No query provided.' });
  }

  try {
    // 4a) Ask the model for JSON‐only female‐written movie recommendations
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `
You are a strict JSON-only movie curator. When given a topic:
 • ONLY recommend films whose screenwriter is a woman.
 • RESPOND with a JSON array of up to 5 objects, each with EXACTLY these keys:
   - "title"        (string)
   - "director"     (string)
   - "screenwriter" (string; female name)
   - "description"  (string; one or two sentences)
   - "poster_url"   (string; valid URL to the poster image)
Do not include any other keys or commentary—just the JSON array.`
        },
        { role: 'user', content: `Topic: "${query}".` }
      ],
      max_tokens: 600,
      temperature: 0.7
    });

    // 4b) Parse the AI response as JSON
    let movies;
    try {
      movies = JSON.parse(aiResponse.choices[0].message.content.trim());
    } catch (parseErr) {
      console.error('❌ JSON parse error:', parseErr);
      return res.status(500).json({ error: 'Invalid JSON from AI' });
    }

    // 4c) Return that array
    return res.json({ movies });

  } catch (err) {
    console.error('❌ OpenAI error:', err);

    // Optional fallback for quota issues
    if (err.error?.code === 'insufficient_quota') {
      return res.json({
        movies: [
          {
            title: 'When Harry Met Sally…',
            director: 'Rob Reiner',
            screenwriter: 'Nora Ephron',
            description: 'A witty romantic comedy about friendship and love.',
            poster_url: '/images/harry-sally.jpg'
          }
        ]
      });
    }

    return res.status(500).json({ error: 'AI request failed.' });
  }
});

// 5) Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
