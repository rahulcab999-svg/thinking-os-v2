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

    // ─── BUILD THE FULL PROMPT ──────────────────────────────────────────────
    const fullPrompt = `${context}System: ${systemPrompt}\n\nUser Question: ${question}`;

    // ─── CALL DEEPSEEK (FREE, 50 REQUESTS/MINUTE) ──────────────────────────
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // Use 'deepseek-reasoner' for deeper thinking
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_tokens: maxTokens || 1000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'DeepSeek API error');
    }

    const text = data.choices?.[0]?.message?.content || 'No analysis generated.';

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
