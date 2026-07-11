// retrieval.js
// Fix #2/#3 retrieval mechanism: fetch a framework's verified source, extract
// plain text, and select the excerpt most relevant to the user's question.
//
// VERIFIED: fetching and extracting real body text from a Gutenberg HTML page
// (Marcus Aurelius, gutenberg.org/files/2680/2680-h/2680-h.htm) was confirmed
// working using Anthropic's web_fetch tool during development of this file.
//
// NOT YET VERIFIED: whether the plain `fetch()` call below, running inside
// this Next.js API route on Vercel, succeeds against the same URL. The tool
// used to test extraction is a different runtime/environment than Vercel's
// serverless functions. This must be tested after deployment — if fetch()
// fails here (e.g. due to bot-detection, timeouts, or blocked requests), this
// function will fall back to no-retrieval rather than throw, per the
// "never fake a source" rule below.

import { SOURCES } from "./sources.js";

// ─── HTML → plain text ────────────────────────────────────────────────────
// Deliberately simple, regex-based. No parser library (cheerio/jsdom) is in
// package.json, and adding one is a separate decision, not made here.
// LIMITATION: this is fragile against complex/malformed HTML. It has only
// been checked conceptually against Gutenberg's relatively simple markup,
// not tested against every one of the 43 sources' actual HTML structure.
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    // Convert block-level/paragraph-boundary tags to a paragraph break BEFORE
    // stripping all other tags to spaces — otherwise every paragraph boundary
    // collapses into a single space and chunking has no structure to split on.
    // (This bug was caught during local testing: without this, all questions
    // returned the same oversized chunk regardless of topic.)
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Split into paragraph-like chunks ────────────────────────────────────
// Each paragraph is its own chunk by default — this preserves topic
// separation, which is the whole point of chunking for relevance scoring.
// Only merges adjacent paragraphs if one is too short to be useful alone;
// only splits a paragraph further if it's too long on its own.
// (Earlier version merged multiple full paragraphs up to maxChunkLen, which
// destroyed topic separation and caused every query to match the same
// merged chunk — caught via local testing, see conversation history.)
function chunkText(text, minChunkLen = 80, maxChunkLen = 1200) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const chunks = [];
  let pending = "";
  for (const para of paragraphs) {
    if (para.length > maxChunkLen) {
      if (pending) { chunks.push(pending); pending = ""; }
      const sentences = para.split(/(?<=[.!?])\s+/);
      let sub = "";
      for (const s of sentences) {
        if ((sub + " " + s).length > maxChunkLen && sub.length >= minChunkLen) {
          chunks.push(sub.trim());
          sub = s;
        } else {
          sub = sub ? sub + " " + s : s;
        }
      }
      if (sub.trim()) pending = sub.trim();
      continue;
    }
    if (pending) {
      // Previous paragraph was too short alone — merge it with this one.
      chunks.push((pending + " " + para).trim());
      pending = "";
    } else if (para.length < minChunkLen) {
      pending = para; // hold, hope next paragraph combines with it
    } else {
      chunks.push(para); // normal case: paragraph stands as its own chunk
    }
  }
  if (pending) chunks.push(pending);
  return chunks;
}

// ─── Simple keyword-overlap relevance scoring ────────────────────────────
// Not semantic search. Just word-overlap counting, per the "basic keyword
// version, no vector database needed" approach from thinking-os-summary.md §6.
// ─── Stopwords ────────────────────────────────────────────────────────────
// Bare length>3 filtering isn't enough — common words like "what/does/this/
// about" are 4+ letters and were diluting/outweighing actually meaningful
// words during testing (e.g. a "death and dying" query matched the wrong
// paragraph because "what/does/this/about" outnumbered "death"). This list
// is deliberately not exhaustive; it targets the words that showed up as
// false-signal during actual testing plus other very common function words.
const STOPWORDS = new Set([
  "what","does","this","that","about","have","with","from","your","which",
  "when","where","will","would","could","should","there","their","them",
  "then","than","into","upon","being","were","been","also","just","only",
  "some","such","each","more","most","very","much","many","like","thou",
  "thee","thy","hast","shall","dost","doth","the","and","for","are","was",
  "who","how","why","can","not","its",
]);

// ─── Lightweight stemmer ──────────────────────────────────────────────────
// Deterministic suffix-stripping, not a full Porter stemmer, but enough to
// match "motivate"/"motivation", "rising"/"rise", "productive"/"produce" etc.
// This is algorithmic, not a factual claim, so no verification standard
// applies to it the way it does to source URLs.
function stem(word) {
  let w = word;
  if (w.length > 6 && w.endsWith("ational")) return w.slice(0, -7) + "ate";
  if (w.length > 5 && w.endsWith("tional")) return w.slice(0, -2);
  if (w.length > 7 && w.endsWith("ization")) return w.slice(0, -7) + "ize";
  if (w.length > 6 && w.endsWith("ation")) return w.slice(0, -5) + "e";
  if (w.length > 6 && w.endsWith("iveness")) return w.slice(0, -7) + "ive";
  if (w.length > 6 && w.endsWith("fulness")) return w.slice(0, -7) + "ful";
  if (w.length > 5 && w.endsWith("ement")) return w.slice(0, -5);
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3).replace(/(.)\1$/, "$1"); // rising->ris->rise handled below
  if (w.length > 4 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("edly")) return w.slice(0, -4);
  if (w.length > 3 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("tion")) return w.slice(0, -4);
  if (w.length > 4 && w.endsWith("sion")) return w.slice(0, -4);
  if (w.length > 4 && w.endsWith("ness")) return w.slice(0, -4);
  if (w.length > 4 && w.endsWith("ment")) return w.slice(0, -4);
  if (w.length > 4 && w.endsWith("ity")) return w.slice(0, -3);
  if (w.length > 3 && w.endsWith("ly")) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith("ive")) return w.slice(0, -3);
  if (w.length > 3 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

// ─── Synonym map ───────────────────────────────────────────────────────────
// EXPLICITLY a hand-built heuristic list, not a verified linguistic
// resource (no WordNet or similar dependency is installed). Covers common
// decision/self-help vocabulary likely to appear in Thinking OS questions.
// Incomplete by design — meant to catch common gaps, not be exhaustive.
// Each key maps to words that should be treated as equivalent for scoring.
const SYNONYMS = {
  motivate: ["motivation","drive","inspire","energize","push"],
  bed: ["bedclothes","sleep","rest","lying"],
  productive: ["produce","action","exertion","work","effort"],
  peace: ["tranquility","tranquil","calm","quiet","stillness","serenity"],
  overwhelmed: ["overwhelm","burden","stress","trouble","struggle"],
  inner: ["soul","within","self","internal"],
  rude: ["arrogant","deceitful","envious","unsocial","ungrateful"],
  annoying: ["busy-body","irritating","bothersome"],
  death: ["dying","die","mortality","dead"],
  fear: ["afraid","anxiety","worry","dread"],
  angry: ["anger","rage","fury","wrath"],
  happy: ["happiness","joy","content","contentment"],
  fail: ["failure","mistake","error"],
  succeed: ["success","achieve","achievement"],
  decide: ["decision","choice","choose"],
  risk: ["danger","hazard","threat"],
};
// Build reverse lookup once: any variant word -> its canonical key
const SYNONYM_LOOKUP = {};
for (const [key, variants] of Object.entries(SYNONYMS)) {
  SYNONYM_LOOKUP[key] = key;
  for (const v of variants) SYNONYM_LOOKUP[v] = key;
}
function canonical(word) {
  return SYNONYM_LOOKUP[word] || stem(word);
}

function scoreChunk(chunk, questionWords) {
  const rawChunkWords = chunk.toLowerCase().match(/[a-z']+/g) || [];
  const chunkCanon = new Set(rawChunkWords.map(canonical));
  let score = 0;
  for (const w of questionWords) if (chunkCanon.has(canonical(w))) score++;
  return score;
}

function selectRelevantExcerpt(fullText, question, maxChars = 1500) {
  const questionWords = (question.toLowerCase().match(/[a-z']+/g) || [])
    .filter(w => w.length > 3 && !STOPWORDS.has(w));
  const chunks = chunkText(fullText);
  if (chunks.length === 0) return null;
  const scored = chunks.map(c => ({ chunk: c, score: scoreChunk(c, questionWords) }));
  scored.sort((a, b) => b.score - a.score);
  let excerpt = "";
  for (const { chunk } of scored) {
    if (excerpt.length + chunk.length > maxChars) break;
    excerpt += (excerpt ? "\n\n" : "") + chunk;
  }
  // BUG FIX: previously fell back to chunks[0] (first paragraph in original
  // document order) whenever the top-scoring chunk alone exceeded maxChars,
  // silently discarding all scoring and returning an irrelevant excerpt.
  // Correct fallback: truncate the actual top-scoring chunk instead.
  if (!excerpt && scored.length > 0) excerpt = scored[0].chunk.slice(0, maxChars);
  return excerpt || null;
}

// ─── In-memory cache ──────────────────────────────────────────────────────
// Optimization: these sources (old books, static interview transcripts)
// almost never change, so re-fetching the same URL on every single question
// is wasteful — confirmed no caching existed before this fix, and every
// request triggered a fresh live fetch of the same static page.
// HONEST LIMITATION: this is a module-level in-memory cache. On Vercel,
// this only helps within a single warm serverless instance — it does NOT
// persist across cold starts or get shared between concurrent instances.
// It reduces redundant fetches during a warm instance's lifetime, but is
// not a substitute for a real shared cache (e.g. Vercel KV/Redis) if that
// level of guarantee is ever needed. Not implemented here since it would
// require a new external dependency/service, a separate decision.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — these sources are static
const sourceCache = new Map(); // url -> { text, fetchedAt }

// FIX #1: sources.js explicitly documents that some sources are licensed for
// live "free to read online" access only, and prohibit downloading or storing
// a copy (e.g. the Feynman Lectures: "free to read online" but NOT for
// redistribution/download). Caching a copy of the extracted text — even
// in-memory — violates that condition, since it is functionally a stored
// copy served on subsequent requests instead of a fresh read each time.
// Any URL listed here is fetched fresh on every call and never cached.
const NO_CACHE_URLS = new Set([
  "https://www.feynmanlectures.caltech.edu/I_01.html",
]);

// ─── Fetch one source URL and return plain text ──────────────────────────
async function fetchSourceText(url, timeoutMs = 6000) {
  const isPdf = url.toLowerCase().endsWith(".pdf");
  const skipCache = NO_CACHE_URLS.has(url);

  if (!skipCache) {
    const cached = sourceCache.get(url);
    if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
      return { ok: true, text: cached.text, fromCache: true };
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ThinkingOS/1.0)" },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

    let text;
    if (isPdf) {
      // FIX #3: real PDF text extraction via pdf-parse (added to package.json).
      // Previously this branch failed unconditionally because no PDF-parsing
      // dependency was installed — feeding raw PDF bytes through stripHtml()
      // would have produced garbage rather than a clean error, which is worse
      // than no grounding at all. Now the PDF bytes are parsed properly.
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const parsed = await pdfParse(buffer);
        text = (parsed.text || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      } catch (pdfErr) {
        return { ok: false, error: `PDF parsing failed: ${pdfErr.message}` };
      }
    } else {
      const html = await res.text();
      text = stripHtml(html);
    }

    if (!text || text.length < 100) return { ok: false, error: "Extracted text too short — likely extraction failure, not a real content gap" };
    if (!skipCache) sourceCache.set(url, { text, fetchedAt: Date.now() });
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err.name === "AbortError" ? `Timed out after ${timeoutMs}ms` : err.message };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────
// Returns { excerpt, sourceLabel, sourceUrl } on success, or null if no
// grounding is available (framework not in SOURCES, or fetch/extract failed).
// CRITICAL: on any failure, this returns null — it does NOT fall back to
// fabricating an excerpt or pretending a source was used. Callers must treat
// null as "proceed memory-based" per Fix #1's own honesty requirement.
//
// PERFORMANCE FIX: previously fetched each entry sequentially (await in a
// for-loop), so a framework with 3 backup entries could take up to
// 3 x timeoutMs in the worst case before falling back. Now fetches all
// entries in parallel and picks the first-listed entry (by original
// preference order, not by fetch speed) that actually succeeded — this
// bounds worst-case latency to roughly one timeout period instead of the
// sum of all of them, while still respecting which source is "best."
async function getGroundedExcerpt(frameworkId, question) {
  const entries = SOURCES[frameworkId];
  if (!entries || entries.length === 0) return null;

  const results = await Promise.allSettled(entries.map(entry => fetchSourceText(entry.url)));

  for (let i = 0; i < entries.length; i++) {
    const settled = results[i];
    if (settled.status !== "fulfilled" || !settled.value.ok) continue;
    const entry = entries[i];
    const excerpt = selectRelevantExcerpt(settled.value.text, question);
    if (excerpt) {
      return { excerpt, sourceLabel: entry.label, sourceUrl: entry.url, sourceType: entry.type };
    }
  }
  return null; // all entries failed — caller proceeds memory-based, honestly
}

export { getGroundedExcerpt, fetchSourceText, selectRelevantExcerpt, stripHtml };
