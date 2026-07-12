// app/api/analyze/route.js
import { NextResponse } from 'next/server';
import { getGroundedExcerpt } from '../../../retrieval.js';

export async function POST(req) {
  try {
    const { question, systemPrompt, maxTokens, useWebSearch, model, frameworkId } = await req.json();

    let context = "";
    let groundingUsed = false;
    let groundingSource = null;

    // ─── FIX #2/#3: REAL SOURCE TEXT RETRIEVAL ──────────────────────────────
    // Only attempted when frameworkId is provided (i.e. this call is for a
    // specific thinker's framework, not research/synthesis/etc). Verified
    // sources live in sources.js; getGroundedExcerpt returns null on any
    // failure (unlisted framework, fetch error, extraction failure) rather
    // than ever fabricating an excerpt — callers must treat null as "proceed
    // memory-based," consistent with Fix #1's honesty requirement.
    if (frameworkId) {
      try {
        const grounded = await getGroundedExcerpt(frameworkId, question);
        if (grounded && grounded.excerpt) {
          context += `SOURCE TEXT (from ${grounded.sourceLabel || frameworkId}, ${grounded.sourceUrl}):\n${grounded.excerpt}\n\nUsing the source text above as grounding where relevant, answer the question below.\n\n`;
          groundingUsed = true;
          groundingSource = grounded.sourceUrl;
        }
      } catch (e) {
        // Fetch/extraction failed — proceed without grounding. Do NOT throw;
        // a retrieval failure should degrade to memory-based, not break the
        // whole analysis.
      }
    }

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
        context += "REAL-TIME WEB SEARCH RESULTS:\n" + 
                  (searchData.results || []).map(r => 
                    `- ${r.title}: ${r.content}`
                  ).join("\n") + "\n\n";
      } catch (e) {
        context += "(Web search unavailable. Relying on training data.)\n\n";
      }
    }

    const userMessage = context ? `${context}User Question: ${question}` : question;

    // ─── ROUTE TO SELECTED MODEL ─────────────────────────────────────────────
    const selected = model || 'groq';
    let result;

    try {
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
        case 'deepseek':
          result = await callDeepSeek(systemPrompt, userMessage, maxTokens);
          break;
        case 'groq':
        default:
          result = await callGroq(systemPrompt, userMessage, maxTokens);
          break;
      }
    } catch (fetchErr) {
      // Timeout or network error – we treat these as not rate-limited
      return NextResponse.json(
        { 
          success: false, 
          error: fetchErr.message,
          rateLimited: false,
          contextTooLong: false,
          retryAfterMs: null,
        },
        { status: 500 }
      );
    }

    // ─── CHECK IF THE RESPONSE WAS SUCCESSFUL ──────────────────────────────
    if (!result.ok) {
      // Now we have detailed error info from the helper
      return NextResponse.json(
        { 
          success: false, 
          error: result.errorMessage || 'Model API error',
          rateLimited: result.rateLimited || false,
          contextTooLong: result.contextTooLong || false,
          retryAfterMs: result.retryAfterMs || null,
        },
        { status: result.status || 500 }
      );
    }

    const text = result.text;

    return NextResponse.json({ 
      success: true, 
      data: { content: [{ text }] },
      groundingUsed,
      groundingSource,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        rateLimited: false,
        contextTooLong: false,
        retryAfterMs: null,
      },
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
        // FIXED: llama-3.3-70b-versatile was deprecated by Groq on June 17,
        // 2026 (confirmed via Groq's own official deprecations page). Groq
        // explicitly recommends openai/gpt-oss-120b as the replacement.
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: maxTokens || 1000,
      }),
      signal: controller.signal,
    });
    const data = await response.json();

    if (!response.ok) {
      // Detect Groq rate limit (429)
      const rateLimited = response.status === 429;
      const retryAfter = response.headers.get('retry-after') || 
                         data.error?.message?.match(/(\d+)\s*seconds?/i)?.[1] || 
                         null;
      return {
        ok: false,
        status: response.status,
        errorMessage: data.error?.message || 'Groq API error',
        rateLimited,
        contextTooLong: response.status === 413 || data.error?.message?.includes('context length') || false,
        retryAfterMs: retryAfter ? parseInt(retryAfter) * 1000 : null,
        raw: data,
      };
    }

    return { 
      text: data.choices?.[0]?.message?.content || '', 
      raw: data, 
      ok: true,
      status: response.status,
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
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: maxTokens || 1000,
      }),
      signal: controller.signal,
    });
    const data = await response.json();

    if (!response.ok) {
      const rateLimited = response.status === 429;
      const retryAfter = response.headers.get('retry-after') || 
                         data.error?.message?.match(/(\d+)\s*seconds?/i)?.[1] || 
                         null;
      return {
        ok: false,
        status: response.status,
        errorMessage: data.error?.message || 'OpenAI API error',
        rateLimited,
        contextTooLong: response.status === 413 || data.error?.message?.includes('context length') || false,
        retryAfterMs: retryAfter ? parseInt(retryAfter) * 1000 : null,
        raw: data,
      };
    }

    return { 
      text: data.choices?.[0]?.message?.content || '', 
      raw: data, 
      ok: true,
      status: response.status,
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
        // FIXED: claude-3-5-sonnet-20241022 is a legacy model (Oct 2024).
        // Updated to the current model string, same class of fix as the
        // Gemini deprecated-model bug found and fixed alongside this.
        model: 'claude-sonnet-5',
        max_tokens: maxTokens || 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: controller.signal,
    });
    const data = await response.json();

    if (!response.ok) {
      const rateLimited = response.status === 429;
      const retryAfter = response.headers.get('retry-after') || 
                         data.error?.message?.match(/(\d+)\s*seconds?/i)?.[1] || 
                         null;
      return {
        ok: false,
        status: response.status,
        errorMessage: data.error?.message || 'Claude API error',
        rateLimited,
        contextTooLong: response.status === 413 || data.error?.message?.includes('context length') || false,
        retryAfterMs: retryAfter ? parseInt(retryAfter) * 1000 : null,
        raw: data,
      };
    }

    return { 
      text: data.content?.[0]?.text || '', 
      raw: data, 
      ok: true,
      status: response.status,
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

// Google Gemini (2.5 Flash)
// FIXED: gemini-1.5-pro was retired by Google — confirmed via search that
// "All Gemini 1.0 models and Gemini 1.5 are already shutdown, and all
// requests to these models return a 404 error" (Google's own Firebase AI
// Logic docs, updated within days of this fix). Switched to gemini-2.5-flash
// (current, stable, and covered by Gemini's genuinely-free API tier — Pro
// models are "heavily restricted" on the free tier per current provider
// research). Also switched v1beta -> v1 (the stable API version) since
// v1beta is explicitly documented as "actively being developed" and more
// prone to this kind of breaking change.
async function callGemini(systemPrompt, userMessage, maxTokens) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
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

    if (!response.ok) {
      const rateLimited = response.status === 429 || data.error?.message?.includes('quota') || false;
      const retryAfter = response.headers.get('retry-after') || null;
      return {
        ok: false,
        status: response.status,
        errorMessage: data.error?.message || 'Gemini API error',
        rateLimited,
        contextTooLong: response.status === 413 || data.error?.message?.includes('context length') || false,
        retryAfterMs: retryAfter ? parseInt(retryAfter) * 1000 : (rateLimited ? 60000 : null), // Gemini often wants 60s
        raw: data,
      };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { 
      text, 
      raw: data, 
      ok: true,
      status: response.status,
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

// DeepSeek (OpenAI-compatible)
async function callDeepSeek(systemPrompt, userMessage, maxTokens) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        // FIXED: deepseek-chat is a legacy compatibility alias that DeepSeek's
        // own official docs confirm will be deprecated 2026/07/24 (12 days
        // from when this fix was made). Updated to the real current model
        // name it currently maps to, ahead of the deadline.
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: maxTokens || 1000,
      }),
      signal: controller.signal,
    });
    const data = await response.json();

    if (!response.ok) {
      const rateLimited = response.status === 429;
      const retryAfter = response.headers.get('retry-after') || 
                         data.error?.message?.match(/(\d+)\s*seconds?/i)?.[1] || 
                         null;
      return {
        ok: false,
        status: response.status,
        errorMessage: data.error?.message || 'DeepSeek API error',
        rateLimited,
        contextTooLong: response.status === 413 || data.error?.message?.includes('context length') || false,
        retryAfterMs: retryAfter ? parseInt(retryAfter) * 1000 : null,
        raw: data,
      };
    }

    return { 
      text: data.choices?.[0]?.message?.content || '', 
      raw: data, 
      ok: true,
      status: response.status,
    };
  } catch (fetchErr) {
    if (fetchErr.name === 'AbortError') {
      throw new Error('DeepSeek request timed out after 30s');
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }
}