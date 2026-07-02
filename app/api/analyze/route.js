// app/api/analyze/route.js
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { question, systemPrompt, maxTokens, useWebSearch, model } = await req.json();

    let context = "";

    // ─── WEB SEARCH VIA TAVILY ──────────────────────────────────────────────
    if (useWebSearch) {
      try {
        const searchRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: process.env.TAVILY_API_KEY,
            query: question,
            search_depth: "basic",
            max_results: 4,
          }),
        });
        const searchData = await searchRes.json();
        context = "REAL-TIME WEB SEARCH RESULTS:\n" + 
                  (searchData.results || []).map(r => 
                    `- ${r.title}: ${r.content}`
                  ).join("\n") + "\n\n";
      } catch (e) {
        context = "(Web search unavailable. Relying on training data.)\n\n";
      }
    }

    // ─── BUILD THE FULL USER MESSAGE ──────────────────────────────────────
    const userMessage = context 
      ? `${context}User Question: ${question}` 
      : question;

    // ─── ROUTE TO SELECTED MODEL ─────────────────────────────────────────────
    const selected = model || 'groq';
    let result;

    switch (selected) {
      case 'openai':
        result = await callOpenAI(systemPrompt, userMessage, maxTokens);
        break;
      case 'claude':
        result = await callClaude(systemPrompt, userMessage, maxTokens);
        break;
      case 'gemini':
        result = await callGemini(systemPrompt, userMessage, maxTokens);
        break;
      case 'groq':
      default:
        result = await callGroq(systemPrompt, userMessage, maxTokens);
        break;
    }

    if (!result.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.raw?.error?.message || 'Model API error',
          rateLimited: false,
          contextTooLong: false,
          retryAfterMs: null,
        },
        { status: 500 }
      );
    }

    const text = result.text;

    // ─── RETURN IN THE FORMAT THE FRONTEND EXPECTS ──────────────────────────
    return NextResponse.json({ 
      success: true, 
      data: { content: [{ text }] } 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ─── HELPER FUNCTIONS FOR EACH MODEL ──────────────────────────────────────────

// Groq (Llama 3.3 70B)
async function callGroq(systemPrompt, userMessage, maxTokens) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: maxTokens || 1000,
      }),
      signal: controller.signal,
    });
    const data = await response.json();
    return { 
      text: data.choices?.[0]?.message?.content || '', 
      raw: data, 
      ok: response.ok 
    };
  } catch (fetchErr) {
    if (fetchErr.name === 'AbortError') {
      throw new Error('Groq request timed out after 30s');
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }
}

// OpenAI (GPT-4o)
async function callOpenAI(systemPrompt, userMessage, maxTokens) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // or 'gpt-4-turbo', 'gpt-3.5-turbo'
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: maxTokens || 1000,
      }),
      signal: controller.signal,
    });
    const data = await response.json();
    return { 
      text: data.choices?.[0]?.message?.content || '', 
      raw: data, 
      ok: response.ok 
    };
  } catch (fetchErr) {
    if (fetchErr.name === 'AbortError') {
      throw new Error('OpenAI request timed out after 30s');
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Anthropic Claude (Sonnet 3.5)
async function callClaude(systemPrompt, userMessage, maxTokens) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens || 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: controller.signal,
    });
    const data = await response.json();
    return { 
      text: data.content?.[0]?.text || '', 
      raw: data, 
      ok: response.ok 
    };
  } catch (fetchErr) {
    if (fetchErr.name === 'AbortError') {
      throw new Error('Claude request timed out after 30s');
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Google Gemini (1.5 Pro)
async function callGemini(systemPrompt, userMessage, maxTokens) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt },
              { text: userMessage }
            ]
          }],
          generationConfig: { maxOutputTokens: maxTokens || 1000 },
        }),
        signal: controller.signal,
      }
    );
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { 
      text, 
      raw: data, 
      ok: response.ok 
    };
  } catch (fetchErr) {
    if (fetchErr.name === 'AbortError') {
      throw new Error('Gemini request timed out after 30s');
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }
}