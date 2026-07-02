// app/api/analyze/route.js
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { question, systemPrompt, maxTokens, useWebSearch } = await req.json();

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

    // ─── CALL GROQ (with timeout) ──────────────────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s ceiling

    let response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') {
        throw new Error('Model request timed out after 30s');
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Groq API error');
    }

    const text = data.choices?.[0]?.message?.content || 'No analysis generated.';

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