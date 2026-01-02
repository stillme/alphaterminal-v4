export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { model, prompt, useSearch } = req.body;

  try {
    // --- GEMINI HANDLER ---
    if (model === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Server missing GEMINI_API_KEY");

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            // Enable Google Search tool if requested
            tools: useSearch ? [{ google_search: {} }] : undefined
          })
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return res.status(200).json({ text });
    }

    // --- CLAUDE HANDLER ---
    if (model === 'claude') {
      const apiKey = process.env.CLAUDE_API_KEY;
      if (!apiKey) throw new Error("Server missing CLAUDE_API_KEY");

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      return res.status(200).json({ text: data.content?.[0]?.text });
    }

  } catch (error) {
    console.error("AI API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}