'use client';

import { useState, useRef, useEffect, useCallback } from "react";

// ─── WEB SEARCH MASTER SWITCH ──────────────────────────────────────────────────
// 🔥 Set this to 'true' when you want Tavily web search (free 1000 searches/month)
const ENABLE_WEB_SEARCH = false;  // 👈 Change to true later for real-time search
// ───────────────────────────────────────────────────────────────────────────────

// ─── PROBLEM TYPES ────────────────────────────────────────────────────────────
const PROBLEM_TYPES = [
  { id: "startup",     label: "Startup",     icon: "🚀" },
  { id: "career",      label: "Career",      icon: "🧭" },
  { id: "investment",  label: "Investment",  icon: "📈" },
  { id: "product",     label: "Product",     icon: "📦" },
  { id: "hiring",      label: "Hiring",      icon: "🤝" },
  { id: "strategy",    label: "Strategy",    icon: "♟️" },
  { id: "personal",    label: "Personal",    icon: "🪞" },
  { id: "marketing",   label: "Marketing",   icon: "📣" },
  { id: "operations",  label: "Operations",  icon: "⚙️" },
  { id: "negotiation", label: "Negotiation", icon: "⚖️" },
];

// ─── FRAMEWORKS ───────────────────────────────────────────────────────────────
const ALL_FRAMEWORKS = [
  {
    id: "first_principles", label: "First Principles", icon: "⚗️",
    color: "#6366f1", accent: "#818cf8", thinker: "Aristotle · Elon Musk",
    relevantFor: ["startup","product","strategy","personal","operations"],
    prompt: `You are a first-principles thinker. Use ONLY the verified facts provided. Distinguish clearly between facts and assumptions.
1. DECONSTRUCT: Break to undeniable truths only. Flag everything else as assumption.
2. VERIFY: What is actually known vs assumed? Be explicit.
3. REBUILD: Reason upward from verified fundamentals only.
4. CLAIM: Clearest rational path forward.
5. CONFIDENCE: Rate 0-100. Lower if many unknowns remain.
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""}`
  },
  {
    id: "thiel", label: "Thiel Contrarian", icon: "♟️",
    color: "#0ea5e9", accent: "#38bdf8", thinker: "Peter Thiel · Zero to One",
    relevantFor: ["startup","product","strategy","marketing","investment"],
    prompt: `You are Thiel's contrarian framework. Use ONLY the verified facts provided. Do not treat assumptions as facts.
1. CONSENSUS VIEW: What does everyone believe here?
2. CONTRARIAN QUESTION: What important truth do very few people agree with?
3. NON-CONSENSUS ANGLE: Non-obvious view that could actually be correct?
4. MONOPOLY TEST: Does the obvious solution lead to differentiation or competition?
5. 10X QUESTION: What would a 10x better solution look like?
6. CONFIDENCE: Rate 0-100.
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""}`
  },
  {
    id: "inversion", label: "Inversion", icon: "🔄",
    color: "#f59e0b", accent: "#fbbf24", thinker: "Charlie Munger · Stoics",
    relevantFor: ["startup","strategy","personal","operations","career","negotiation"],
    prompt: `You are the inversion thinker (Munger + Stoics). Use ONLY verified facts. Mark assumptions explicitly.
1. INVERT: How would you guarantee failure? List all failure modes.
2. TRAPS: Top traps to actively avoid.
3. OBSTACLES: What, when removed, makes solution obvious?
4. FORWARD PATH: Failure-free version.
5. CONFIDENCE: Rate 0-100.
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""}`
  },
  {
    id: "second_order", label: "Second-Order", icon: "🌊",
    color: "#10b981", accent: "#34d399", thinker: "Howard Marks · Ray Dalio",
    relevantFor: ["investment","strategy","startup","operations","product","personal"],
    prompt: `You are a second-order thinking analyst. Use ONLY verified facts. Flag assumptions.
1. FIRST-ORDER EFFECTS: Immediate, obvious consequences.
2. SECOND-ORDER EFFECTS: What happens after those play out?
3. THIRD-ORDER EFFECTS: What does that trigger?
4. TIME HORIZONS: Best decision across 1wk / 6mo / 5yr?
5. RECOMMENDATION: Most rational action given all orders.
6. CONFIDENCE: Rate 0-100.
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""}`
  },
  {
    id: "taleb", label: "Taleb Antifragility", icon: "💀",
    color: "#f43f5e", accent: "#fb7185", thinker: "Nassim Taleb · Antifragile",
    relevantFor: ["startup","investment","strategy","operations","personal","negotiation"],
    prompt: `You are Taleb's risk and antifragility framework. Use ONLY verified facts. Never treat assumptions as facts.
1. BLACK SWAN SCAN: Low-probability, high-impact events that destroy everything.
2. FRAGILITY RATING: Fragile / Robust / Antifragile? How to move toward antifragile?
3. VIA NEGATIVA: What to remove or avoid?
4. SKIN IN THE GAME: Who bears the downside? Misaligned risk = red flag.
5. BARBELL STRATEGY: Extreme safety on one end, small high-upside bets on other.
6. OPTIONALITY: Which path preserves most future options?
7. CONFIDENCE: Rate 0-100. Penalize heavily for missing tail-risk data.
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""}`
  },
  {
    id: "bayes", label: "Bayesian Thinking", icon: "📊",
    color: "#1d4ed8", accent: "#60a5fa", thinker: "Thomas Bayes · Probability",
    relevantFor: ["investment","startup","hiring","personal","strategy","operations"],
    prompt: `You are a Bayesian reasoning framework. Use ONLY verified facts and research evidence provided.
1. PRIOR BELIEF: Base rate / prior probability. Use historical data, not intuition.
2. THE EVIDENCE: What new information are we updating on?
3. LIKELIHOOD RATIO: How diagnostic is this evidence?
4. POSTERIOR BELIEF: Revised probability. Has evidence moved the needle significantly?
5. BASE RATE NEGLECT CHECK: Are vivid events overriding priors?
6. WHAT WOULD MOVE YOU: Evidence that would significantly change posterior?
7. CONFIDENCE: State explicitly (e.g. "70% confident X is true"). Rate 0-100.
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""}`
  },
  {
    id: "porter", label: "Porter's Five Forces", icon: "🏭",
    color: "#475569", accent: "#94a3b8", thinker: "Michael Porter · Competitive Strategy",
    relevantFor: ["startup","strategy","investment","product","marketing"],
    prompt: `You are Porter's competitive strategy framework. Use ONLY verified facts and research evidence.
1. THREAT OF NEW ENTRANTS: Barriers to entry?
2. SUPPLIER POWER: How much power do suppliers have?
3. BUYER POWER: How much power do customers have?
4. THREAT OF SUBSTITUTES: What could make this obsolete?
5. COMPETITIVE RIVALRY: How intense is existing competition?
6. GENERIC STRATEGY: Cost Leadership, Differentiation, or Focus?
7. SUSTAINABLE ADVANTAGE: What makes this defensible over 5-10 years?
8. CONFIDENCE: Rate 0-100. Lower if market data is missing.
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""}`
  },
  {
    id: "kahneman", label: "Kahneman: Bias", icon: "⚡",
    color: "#7c3aed", accent: "#a78bfa", thinker: "Daniel Kahneman · Thinking Fast & Slow",
    relevantFor: ["personal","career","hiring","negotiation","investment","startup"],
    prompt: `You are Kahneman's System 1/2 framework. Your job is to detect bias distorting this decision.
1. SYSTEM 1 REACTIONS: Fast, intuitive response here?
2. COGNITIVE BIASES IN PLAY: Specific biases distorting thinking (Anchoring, Availability, Confirmation, Overconfidence, Planning Fallacy, Loss Aversion, WYSIATI)?
3. SYSTEM 2 OVERRIDE: What does slow deliberate reasoning say when biases are stripped?
4. PROSPECT THEORY: Are losses being weighted ~2x too heavily?
5. PRE-MORTEM: Imagine 1 year later, this failed. What went wrong?
6. DEBIASED RECOMMENDATION: Rational action after correcting for biases.
7. CONFIDENCE: Rate 0-100.
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""}`
  },
  {
    id: "munger", label: "Munger's Lattice", icon: "🧠",
    color: "#ec4899", accent: "#f472b6", thinker: "Charlie Munger · Poor Charlie's Almanack",
    relevantFor: ["startup","investment","strategy","career","personal","product"],
    prompt: `You are Munger's multi-disciplinary mental model framework. Use verified facts only.
Pick 4-5 most relevant models: Opportunity Cost, Incentives, Confirmation Bias, Regression to Mean, Competitive Advantage, Network Effects, Compounding, Margin of Safety, Pareto, Occam's Razor, Bayes, Supply & Demand.
For each: Name it, apply it, state what it reveals that naive analysis misses.
SYNTHESIS: What do models together suggest?
CONFIDENCE: Rate 0-100.
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""}`
  },
  {
    id: "sun_tzu", label: "Sun Tzu", icon: "⚔️",
    color: "#b45309", accent: "#fbbf24", thinker: "Sun Tzu · The Art of War",
    relevantFor: ["strategy","startup","negotiation","marketing","career"],
    prompt: `You are Sun Tzu's strategic framework. Use verified facts only.
1. KNOW YOURSELF: True strengths, weaknesses, resources, constraints.
2. KNOW THE ENEMY: Competitors/forces — strengths, weaknesses, intentions.
3. WIN WITHOUT FIGHTING: Achieve objective without direct confrontation?
4. TERRAIN & TIMING: What context/timing creates maximum advantage?
5. ASYMMETRY: Where can you exploit an asymmetric advantage?
6. ALREADY-WON BATTLE: Preparation that makes outcome nearly certain before engagement?
7. CONFIDENCE: Rate 0-100.
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""}`
  },
  {
    id: "feynman", label: "Feynman Technique", icon: "🔬",
    color: "#f97316", accent: "#fb923c", thinker: "Richard Feynman · Physicist",
    relevantFor: ["product","startup","operations","personal","career","strategy"],
    prompt: `You are Feynman's thinking framework. Expose gaps in understanding ruthlessly.
1. PLAIN LANGUAGE TEST: Explain core problem as if to a curious 12-year-old.
2. LOCATE THE GAP: Where did the plain explanation break down? That IS the real problem.
3. QUESTION EVERYTHING: What assumptions does "everyone know" but nobody has verified?
4. FIRST EXPERIMENT: One small, cheap, fast experiment to learn the most important unknown?
5. ELEGANT SIMPLICITY: Simplest explanation that accounts for all known facts?
6. WHAT WOULD BREAK THIS: Single fact that completely invalidates this?
7. CONFIDENCE: Rate 0-100.
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""}`
  },
  {
    id: "popper", label: "Popper: Falsifiability", icon: "🔭",
    color: "#0f766e", accent: "#2dd4bf", thinker: "Karl Popper · Critical Rationalism",
    relevantFor: ["startup","product","strategy","investment","personal"],
    prompt: `You are Popper's falsifiability framework. Test claims rigorously.
1. STATE THE HYPOTHESIS: Core claim or belief driving this problem.
2. FALSIFIABILITY TEST: Can you conceive of an observation that would prove it wrong?
3. WHAT WOULD FALSIFY THIS: 3-5 concrete observations that would disprove the hypothesis.
4. CORROBORATION vs PROOF: Has this survived serious attempts to disprove it?
5. UNFALSIFIABLE RED FLAGS: Elements that cannot be proven wrong no matter what?
6. RECOMMENDATION: Most intellectually honest position given what can/cannot be falsified.
7. CONFIDENCE: Rate 0-100.
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""}`
  },
  {
    id: "bias_checker", label: "Bias Audit", icon: "🪲",
    color: "#dc2626", accent: "#f87171", thinker: "Kahneman · Munger · Cialdini · Taleb",
    relevantFor: ["personal","career","hiring","investment","startup","negotiation","strategy"],
    prompt: `You are a forensic cognitive bias auditor. Scan specifically for active biases in this situation.
INFORMATION BIASES: Confirmation Bias, Availability Heuristic, Anchoring, Framing Effect, Survivorship Bias
SELF-SERVING BIASES: Overconfidence, Dunning-Kruger, Planning Fallacy, Optimism Bias
SOCIAL BIASES: Bandwagon Effect, Authority Bias, Halo Effect, Groupthink
DECISION BIASES: Sunk Cost Fallacy, Loss Aversion, Status Quo Bias, Hyperbolic Discounting
OUTPUT: List active biases, rank top 3 by severity, debiasing protocol for each, clean reframe after stripping biases.
CONFIDENCE: Rate 0-100.
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""}`
  },
];

// ─── STORAGE ──────────────────────────────────────────────────────────────────
// ✅ SSR FIX: Added typeof window check
function loadJournal() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("tos_v2_journal") || "[]"); } catch { return []; }
}
function saveJournal(e) {
  try { localStorage.setItem("tos_v2_journal", JSON.stringify(e)); } catch {}
}
function loadScores() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("tos_v2_scores") || "{}"); } catch { return {}; }
}
function saveScores(s) {
  try { localStorage.setItem("tos_v2_scores", JSON.stringify(s)); } catch {}
}

// ─── FRAMEWORK SCORING ────────────────────────────────────────────────────────
function recordFrameworkUse(scores, fwIds, confidence) {
  const updated = { ...scores };
  fwIds.forEach(id => {
    if (!updated[id]) updated[id] = { uses: 0, successes: 0, totalConfidence: 0 };
    updated[id].uses += 1;
    updated[id].totalConfidence += (confidence || 0);
  });
  return updated;
}
function recordFrameworkOutcome(scores, fwIds, success) {
  const updated = { ...scores };
  fwIds.forEach(id => {
    if (!updated[id]) updated[id] = { uses: 0, successes: 0, totalConfidence: 0 };
    if (success) updated[id].successes += 1;
  });
  return updated;
}
function fwSuccessRate(s) {
  if (!s || s.uses === 0) return null;
  return Math.round((s.successes / s.uses) * 100);
}
function fwAvgConf(s) {
  if (!s || s.uses === 0) return null;
  return Math.round(s.totalConfidence / s.uses);
}

// ─── API CALL ──────────────────────────────────────────────────────────────────
// 🔥 Calls YOUR backend, NOT Anthropic
async function callClaude(systemPrompt, userContent, maxTokens = 1200, useWebSearch = false) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: userContent,
      systemPrompt,
      maxTokens,
      useWebSearch
    })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || "API call failed");
  return result.data.content?.map(c => c.text || "").join("") || "";
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function parseJSON(raw) {
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { return null; }
}
function safeJSON(raw, fallback) {
  return parseJSON(raw) || fallback;
}
function confColor(c) {
  if (c >= 70) return "#22c55e";
  if (c >= 45) return "#f59e0b";
  return "#ef4444";
}
function confLabel(c) {
  if (c >= 70) return "HIGH";
  if (c >= 45) return "MEDIUM";
  return "LOW";
}// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────

const RESEARCH_SYSTEM = `You are an evidence collection engine. Your job: gather real, verifiable information about the question before any analysis begins. Use web search to collect:
- Market size and trends (if applicable)
- Industry statistics and benchmarks
- Competitor information (if applicable)
- Regulatory context (if applicable)
- Base rates for similar decisions
- Any publicly available data directly relevant to this question

Be rigorous. Distinguish what you found from what you're inferring. Do not treat inferences as facts.

Return ONLY a JSON object (no markdown fences):
{
  "facts": [],
  "sources": [],
  "assumptions": [],
  "unknowns": [],
  "research_confidence": 0,
  "research_summary": ""
}

- facts: verified information with evidence
- sources: where each fact came from (publication, domain, or "general knowledge")
- assumptions: things inferred but not verified
- unknowns: information needed for a reliable decision that could not be found
- research_confidence: 0-100 how complete the evidence base is
- research_summary: 1-2 sentence summary of what was and was not found`;

const REALITY_SYSTEM = `You are a reality extraction engine. You receive raw research data. Your job:
1. Classify the problem type
2. Separate verified facts from assumptions from unknowns
3. Select 4-6 frameworks most relevant to this specific problem type

Available frameworks: first_principles, thiel, inversion, second_order, taleb, bayes, porter, kahneman, munger, sun_tzu, feynman, popper, bias_checker

Return ONLY a JSON object (no fences):
{
  "facts": [],
  "assumptions": [],
  "unknowns": [],
  "problem_type": "startup|career|investment|product|hiring|strategy|personal|marketing|operations|negotiation",
  "recommended_frameworks": [],
  "extraction_confidence": 0
}`;

const CROSS_EXAM_SYSTEM = `You are the cross-examination engine. Frameworks challenge each other. Your job:
1. ATTACKS: Find contradictions between frameworks. Have Bayes attack overconfident claims. Taleb attacks anything that ignores tail risk. Kahneman flags anything that reeks of bias.
2. UPGRADES: Claims that survive attack get MORE weight.
3. DOWNGRADES: Claims that crumble under scrutiny get LESS weight.
4. CONSENSUS TALLY: Count framework support for each recommended action.
5. MAJOR DISAGREEMENTS: Where do frameworks fundamentally conflict? This often contains the most valuable insight.

Return ONLY a JSON object (no fences):
{
  "attacks": [{"attacker":"","target":"","attack":"","verdict":"upgraded|downgraded|neutral"}],
  "upgraded_claims": [],
  "downgraded_claims": [],
  "consensus": [{"recommendation":"","support_count":0,"framework_names":[]}],
  "major_disagreements": [{"framework_a":"","framework_b":"","disagreement":"","why_this_matters":""}],
  "agreement_score": 0,
  "conflict_score": 0,
  "hidden_insight": ""
}`;

const RED_TEAM_SYSTEM = `You are a red team auditor. Assume the final recommendation FAILS. Attack it ruthlessly.

Return ONLY a JSON object (no fences):
{
  "failure_modes": [{"mode":"","severity":"Critical|High|Medium|Low","warning_signal":"","mitigation":""}],
  "early_warning_signals": [],
  "risk_severity": [{"risk":"","severity":"Critical|High|Medium|Low","probability":"High|Medium|Low"}],
  "mitigation_plan": [{"risk":"","action":"","owner":"","timeline":""}],
  "kill_shot": "",
  "survivability": "Yes|Conditional|No",
  "survivability_condition": ""
}`;

const SYNTHESIS_SYSTEM = `You are the final decision synthesizer. You have: research evidence, reality extraction, framework analyses, cross-examination, and red team results.

CRITICAL RULE: If evidence is insufficient for a reliable decision, set investigation_needed=true and return status="insufficient_information". Do NOT manufacture a confident recommendation when the evidence doesn't support one. Prefer uncertainty over false certainty.

Confidence calibration — penalize for:
- Many unknowns remaining
- Framework disagreement (high conflict_score)
- Missing critical data
- Red team finding survivability=No

Return ONLY a JSON object (no fences):
{
  "status": "ready|insufficient_information",
  "recommendation": "",
  "confidence": 0,
  "confidence_reasoning": [],
  "risk_level": "Low|Medium|High",
  "why": [],
  "top_risks": [],
  "what_would_change_positive": [],
  "what_would_change_negative": [],
  "next_actions": [],
  "missing_information": [],
  "recommended_research": [],
  "investigation_needed": false
}`;

// ─── PHASES ───────────────────────────────────────────────────────────────────
const PHASES = [
  { id: "research",  label: "Research",           icon: "🔎", color: "#22c55e"  },
  { id: "reality",   label: "Reality Extraction", icon: "🔍", color: "#f59e0b"  },
  { id: "analysis",  label: "Framework Analysis", icon: "⚙️", color: "#6366f1"  },
  { id: "crossexam", label: "Cross-Examination",  icon: "⚔️", color: "#ec4899"  },
  { id: "redteam",   label: "Red Team",           icon: "🛡️", color: "#ef4444"  },
  { id: "synthesis", label: "Decision Synthesis", icon: "✦",  color: "#f1c40f"  },
];

// ─── CONFIDENCE BADGE ─────────────────────────────────────────────────────────
function ConfidenceBadge({ value, small }) {
  if (value == null) return null;
  const color = confColor(value);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
      <div style={{ fontSize: small ? "9px" : "10px", fontWeight: "700", color, letterSpacing: "0.06em" }}>
        {confLabel(value)} {value}%
      </div>
      <div style={{ width: small ? "48px" : "60px", height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: "2px", transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

// ─── SEVERITY BADGE ───────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
  const map = { Critical: "#ef4444", High: "#f97316", Medium: "#f59e0b", Low: "#64748b" };
  const c = map[severity] || "#64748b";
  return (
    <div style={{ fontSize: "9px", fontWeight: "700", color: c, background: `${c}18`, border: `1px solid ${c}35`, borderRadius: "4px", padding: "2px 5px", flexShrink: 0, whiteSpace: "nowrap" }}>
      {severity}
    </div>
  );
}

// ─── MINI SECTION ─────────────────────────────────────────────────────────────
function MiniSection({ title, items, color }) {
  if (!items?.length) return null;
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "7px", padding: "8px 10px" }}>
      <div style={{ fontSize: "9px", fontWeight: "600", color: "#475569", letterSpacing: "0.08em", marginBottom: "6px" }}>{title}</div>
      {items.slice(0, 3).map((item, i) => (
        <div key={i} style={{ fontSize: "11px", color, lineHeight: "1.5", marginBottom: "3px" }}>· {item}</div>
      ))}
    </div>
  );
}

// ─── FRAMEWORK LIST ───────────────────────────────────────────────────────────
function FrameworkList({ title, items, color }) {
  if (!items?.length) return null;
  return (
    <div>
      <div style={{ fontSize: "9px", fontWeight: "600", color: "#475569", letterSpacing: "0.08em", marginBottom: "5px" }}>{title}</div>
      {items.slice(0, 4).map((item, i) => (
        <div key={i} style={{ fontSize: "11px", color, lineHeight: "1.55", marginBottom: "3px" }}>· {item}</div>
      ))}
    </div>
  );
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────
function LoadingSkeleton({ color, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", color, fontSize: "12px" }}>
        <div style={{ width: "12px", height: "12px", border: `2px solid ${color}33`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        {label}
      </div>
      {[75, 55, 65, 45, 60].map((w, i) => (
        <div key={i} style={{ height: "10px", width: `${w}%`, background: "rgba(255,255,255,0.04)", borderRadius: "4px", animation: "pulse 1.5s ease infinite", animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────
function Spinner({ color }) {
  return (
    <div style={{ width: "8px", height: "8px", border: `1.5px solid ${color}44`, borderTop: `1.5px solid ${color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
  );
}// ─── JOURNAL VIEW ─────────────────────────────────────────────────────────────
function JournalView({ journal, scores, onBack, onUpdateOutcome }) {
  const [editingId, setEditingId] = useState(null);
  const [editOutcome, setEditOutcome] = useState("");
  const [editAccuracy, setEditAccuracy] = useState("success");

  const totalEntries = journal.length;
  const withOutcomes = journal.filter(e => e.accuracy != null).length;
  const successCount = journal.filter(e => e.accuracy === true).length;
  const calibrationScore = withOutcomes > 0 ? Math.round((successCount / withOutcomes) * 100) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#060a12", color: "#e2e8f0", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={onBack} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "5px 12px", cursor: "pointer", color: "#64748b", fontSize: "11px", fontFamily: "'Inter',sans-serif" }}>← Back</button>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9" }}>📓 Decision Journal</div>
        <div style={{ fontSize: "10px", color: "#334155" }}>{totalEntries} entries</div>
        {calibrationScore != null && (
          <div style={{ marginLeft: "auto", fontSize: "10px", background: confColor(calibrationScore) + "15", border: `1px solid ${confColor(calibrationScore)}35`, borderRadius: "5px", padding: "3px 9px", color: confColor(calibrationScore), fontWeight: "700" }}>
            Calibration {calibrationScore}% ({withOutcomes} tracked)
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 260px", gap: "16px", alignItems: "start" }}>
        <div>
          {journal.length === 0 ? (
            <div style={{ textAlign: "center", color: "#334155", fontSize: "13px", padding: "60px 20px" }}>No decisions recorded yet.</div>
          ) : journal.map(entry => (
            <div key={entry.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "14px 16px", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "10px", color: "#334155", marginBottom: "3px" }}>
                    {new Date(entry.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    {" · "}{entry.problem_type || "strategy"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic", marginBottom: "6px" }}>"{entry.question}"</div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#e2e8f0", lineHeight: "1.4" }}>{entry.prediction}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                  <ConfidenceBadge value={entry.confidence} small />
                  {entry.risk_level && (
                    <span style={{ fontSize: "9px", fontWeight: "700", padding: "2px 6px", borderRadius: "4px",
                      background: entry.risk_level === "High" ? "#ef444415" : entry.risk_level === "Medium" ? "#f59e0b15" : "#22c55e15",
                      color: entry.risk_level === "High" ? "#ef4444" : entry.risk_level === "Medium" ? "#f59e0b" : "#22c55e"
                    }}>{entry.risk_level} RISK</span>
                  )}
                  {entry.accuracy != null && (
                    <span style={{ fontSize: "9px", fontWeight: "700", padding: "2px 6px", borderRadius: "4px",
                      background: entry.accuracy === true ? "#22c55e15" : entry.accuracy === "partial" ? "#f59e0b15" : "#ef444415",
                      color: entry.accuracy === true ? "#22c55e" : entry.accuracy === "partial" ? "#f59e0b" : "#ef4444"
                    }}>
                      {entry.accuracy === true ? "✓ Correct" : entry.accuracy === "partial" ? "~ Partial" : "✕ Incorrect"}
                    </span>
                  )}
                </div>
              </div>

              {entry.reasoning && (
                <div style={{ fontSize: "10px", color: "#475569", lineHeight: "1.5", marginBottom: "8px" }}>
                  {entry.reasoning.slice(0, 180)}{entry.reasoning.length > 180 ? "…" : ""}
                </div>
              )}

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px", marginTop: "4px" }}>
                <div style={{ fontSize: "9px", color: "#334155", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "5px" }}>OUTCOME</div>
                {editingId === entry.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <input value={editOutcome} onChange={e => setEditOutcome(e.target.value)} placeholder="What actually happened?" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "5px", padding: "6px 8px", color: "#e2e8f0", fontSize: "11px", fontFamily: "'Inter',sans-serif" }} />
                    <div style={{ display: "flex", gap: "5px" }}>
                      {["success","partial","failure"].map(v => (
                        <button key={v} onClick={() => setEditAccuracy(v)} style={{ flex: 1, background: editAccuracy === v ? (v === "success" ? "#22c55e20" : v === "partial" ? "#f59e0b20" : "#ef444420") : "transparent", border: `1px solid ${editAccuracy === v ? (v === "success" ? "#22c55e50" : v === "partial" ? "#f59e0b50" : "#ef444450") : "rgba(255,255,255,0.08)"}`, borderRadius: "5px", padding: "4px 6px", cursor: "pointer", color: editAccuracy === v ? (v === "success" ? "#22c55e" : v === "partial" ? "#f59e0b" : "#ef4444") : "#475569", fontSize: "10px", fontFamily: "'Inter',sans-serif", textTransform: "capitalize" }}>{v}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "5px" }}>
                      <button onClick={() => { onUpdateOutcome(entry.id, editOutcome, editAccuracy); setEditingId(null); }} style={{ background: "#6366f120", border: "1px solid #6366f140", borderRadius: "5px", padding: "5px 12px", cursor: "pointer", color: "#818cf8", fontSize: "10px", fontFamily: "'Inter',sans-serif" }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", padding: "5px 10px", cursor: "pointer", color: "#475569", fontSize: "10px", fontFamily: "'Inter',sans-serif" }}>✕</button>
                    </div>
                  </div>
                ) : entry.outcome ? (
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8", flex: 1 }}>{entry.outcome}</div>
                    <button onClick={() => { setEditingId(entry.id); setEditOutcome(entry.outcome); setEditAccuracy(entry.accuracy === true ? "success" : entry.accuracy === "partial" ? "partial" : "failure"); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#334155", fontSize: "10px" }}>✏</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingId(entry.id); setEditOutcome(""); setEditAccuracy("success"); }} style={{ background: "transparent", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "5px", padding: "5px 10px", cursor: "pointer", color: "#334155", fontSize: "10px", fontFamily: "'Inter',sans-serif" }}>+ Record outcome</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ position: "sticky", top: 0 }}>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "12px 14px" }}>
            <div style={{ fontSize: "10px", color: "#475569", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "10px" }}>FRAMEWORK PERFORMANCE</div>
            {ALL_FRAMEWORKS.map(fw => {
              const s = scores[fw.id];
              if (!s || s.uses === 0) return null;
              const rate = fwSuccessRate(s);
              const avgConf = fwAvgConf(s);
              return (
                <div key={fw.id} style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                    <span style={{ fontSize: "10px", color: "#94a3b8" }}>{fw.icon} {fw.label}</span>
                    <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: rate != null ? confColor(rate) : "#334155" }}>
                      {rate != null ? `${rate}%` : "—"} · {s.uses}✗
                    </span>
                  </div>
                  {rate != null && (
                    <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
                      <div style={{ height: "100%", width: `${rate}%`, background: confColor(rate), borderRadius: "2px", transition: "width 0.5s ease" }} />
                    </div>
                  )}
                  {avgConf != null && <div style={{ fontSize: "9px", color: "#334155", marginTop: "1px" }}>Avg conf: {avgConf}%</div>}
                </div>
              );
            })}
            {Object.keys(scores).length === 0 && <div style={{ fontSize: "10px", color: "#334155" }}>No framework data yet. Complete analyses and record outcomes to build scorecards.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ThinkingOSv2() {
  const [view, setView]                       = useState("main");
  const [question, setQuestion]               = useState("");
  const [manualProblemType, setManualType]    = useState(null);
  const [activePhase, setActivePhase]         = useState(null);
  const [completedPhases, setCompletedPhases] = useState({});
  const [phaseData, setPhaseData]             = useState({});
  const [activeFrameworkId, setActiveFwId]    = useState(null);
  const [selectedFwIds, setSelectedFwIds]     = useState([]);
  const [fwResults, setFwResults]             = useState({});
  const [fwLoading, setFwLoading]             = useState({});
  const [isRunning, setIsRunning]             = useState(false);
  const [hasRun, setHasRun]                   = useState(false);
  const [journal, setJournal]                 = useState(loadJournal);
  const [scores, setScores]                   = useState(loadScores);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [journalOutcome, setJournalOutcome]   = useState("");
  const [pendingEntry, setPendingEntry]       = useState(null);
  const textRef = useRef(null);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes spin { to{transform:rotate(360deg)} }
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
      textarea:focus, input:focus { outline: none; }
      textarea { caret-color: #6366f1; }
    `;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  const reset = useCallback(() => {
    setActivePhase(null); setCompletedPhases({}); setPhaseData({});
    setActiveFwId(null); setSelectedFwIds([]); setFwResults({}); setFwLoading({});
    setIsRunning(false); setHasRun(false); setManualType(null);
    setShowJournalForm(false); setPendingEntry(null); setJournalOutcome("");
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!question.trim() || isRunning) return;
    reset();
    setIsRunning(true);
    setHasRun(true);
    const q = question.trim();
    const col = {};

    // ── PHASE 0: RESEARCH ────────────────────────────────────────────────────
    setActivePhase("research");
    let researchData;
    try {
      const raw = await callClaude(
        RESEARCH_SYSTEM,
        `Question / Problem: "${q}"\n\nSearch for relevant evidence now.`,
        1400,
        ENABLE_WEB_SEARCH
      );
      researchData = safeJSON(raw, {
        facts: [], sources: [], assumptions: [], unknowns: [],
        research_confidence: 30, research_summary: "Research incomplete."
      });
    } catch (e) {
      researchData = { facts: [], sources: [], assumptions: [], unknowns: [], research_confidence: 20, research_summary: `Research error: ${e.message}` };
    }
    col.research = researchData;
    setPhaseData(p => ({ ...p, research: researchData }));
    setCompletedPhases(c => ({ ...c, research: true }));

    // ── PHASE 1: REALITY EXTRACTION ──────────────────────────────────────────
    setActivePhase("reality");
    let realityData;
    try {
      const raw = await callClaude(
        REALITY_SYSTEM,
        `Question: "${q}"\n\nResearch data:\n${JSON.stringify(researchData)}\n\nExtract reality now.`
      );
      realityData = safeJSON(raw, {
        facts: researchData.facts, assumptions: researchData.assumptions,
        unknowns: researchData.unknowns, problem_type: "strategy",
        recommended_frameworks: ["first_principles","taleb","bayes","inversion","kahneman"],
        extraction_confidence: 40
      });
    } catch (e) {
      realityData = { facts: [], assumptions: [], unknowns: [], problem_type: "strategy", recommended_frameworks: ["first_principles","taleb","bayes","inversion","kahneman"], extraction_confidence: 35 };
    }
    if (manualProblemType) realityData.problem_type = manualProblemType;
    if (!realityData.recommended_frameworks?.length) {
      realityData.recommended_frameworks = ALL_FRAMEWORKS.filter(f => f.relevantFor.includes(realityData.problem_type)).slice(0, 5).map(f => f.id);
    }
    col.reality = realityData;
    setPhaseData(p => ({ ...p, reality: realityData }));
    setCompletedPhases(c => ({ ...c, reality: true }));

    const fws = ALL_FRAMEWORKS.filter(f => realityData.recommended_frameworks.includes(f.id));
    setSelectedFwIds(fws.map(f => f.id));
    if (fws.length > 0) setActiveFwId(fws[0].id);

    // ── PHASE 2: FRAMEWORK ANALYSIS ──────────────────────────────────────────
    setActivePhase("analysis");
    const loadInit = {};
    fws.forEach(f => { loadInit[f.id] = true; });
    setFwLoading(loadInit);

    const fwRes = {};
    await Promise.all(fws.map(async (fw) => {
      try {
        const raw = await callClaude(
          fw.prompt,
          `Problem: "${q}"\n\nVERIFIED FACTS (from research — treat as factual):\n${JSON.stringify(researchData.facts)}\n\nSources: ${JSON.stringify(researchData.sources)}\n\nASSUMPTIONS (not verified — label clearly):\n${JSON.stringify(realityData.assumptions)}\n\nUNKNOWNS (missing info — lower confidence accordingly):\n${JSON.stringify(realityData.unknowns)}\n\nApply your framework now.`
        );
        fwRes[fw.id] = safeJSON(raw, { key_claim: raw.slice(0, 200), confidence: 40, evidence: [], counterarguments: [], unknowns: [], recommendation: "" });
      } catch (e) {
        fwRes[fw.id] = { key_claim: `Error: ${e.message}`, confidence: 0, evidence: [], counterarguments: [], unknowns: [], recommendation: "" };
      }
      setFwResults(prev => ({ ...prev, [fw.id]: fwRes[fw.id] }));
      setFwLoading(prev => ({ ...prev, [fw.id]: false }));
    }));

    col.frameworks = fwRes;
    setCompletedPhases(c => ({ ...c, analysis: true }));

    const avgFwConf = Object.values(fwRes).reduce((sum, r) => sum + (r?.confidence || 0), 0) / (Object.keys(fwRes).length || 1);
    const updatedScores = recordFrameworkUse(scores, fws.map(f => f.id), avgFwConf);
    setScores(updatedScores);
    saveScores(updatedScores);

    // ── PHASE 3: CROSS-EXAMINATION ────────────────────────────────────────────
    setActivePhase("crossexam");
    let crossData;
    try {
      const summary = fws.map(fw => {
        const r = fwRes[fw.id];
        return `${fw.label}: claim="${r?.key_claim || ""}" conf=${r?.confidence || 0} rec="${r?.recommendation || ""}"`;
      }).join("\n");
      const raw = await callClaude(CROSS_EXAM_SYSTEM, `Problem: "${q}"\n\nFramework results:\n${summary}\n\nRun cross-examination now.`);
      crossData = safeJSON(raw, { attacks: [], upgraded_claims: [], downgraded_claims: [], consensus: [], major_disagreements: [], agreement_score: 50, conflict_score: 50, hidden_insight: "" });
    } catch (e) {
      crossData = { attacks: [], upgraded_claims: [], downgraded_claims: [], consensus: [], major_disagreements: [], agreement_score: 50, conflict_score: 50, hidden_insight: "" };
    }
    col.crossexam = crossData;
    setPhaseData(p => ({ ...p, crossexam: crossData }));
    setCompletedPhases(c => ({ ...c, crossexam: true }));

    // ── PHASE 4: RED TEAM ─────────────────────────────────────────────────────
    setActivePhase("redteam");
    let redData;
    try {
      const topRec = crossData?.consensus?.[0]?.recommendation || Object.values(fwRes)[0]?.recommendation || "proceed with the plan";
      const raw = await callClaude(RED_TEAM_SYSTEM, `Problem: "${q}"\nTop Recommendation: "${topRec}"\n\nRed team this now.`);
      redData = safeJSON(raw, { failure_modes: [], early_warning_signals: [], risk_severity: [], mitigation_plan: [], kill_shot: "Unknown", survivability: "Conditional", survivability_condition: "" });
    } catch (e) {
      redData = { failure_modes: [], early_warning_signals: [], risk_severity: [], mitigation_plan: [], kill_shot: "", survivability: "Conditional", survivability_condition: "" };
    }
    col.redteam = redData;
    setPhaseData(p => ({ ...p, redteam: redData }));
    setCompletedPhases(c => ({ ...c, redteam: true }));

    // ── PHASE 5: SYNTHESIS ────────────────────────────────────────────────────
    setActivePhase("synthesis");
    let synthData;
    try {
      const payload = { question: q, research: col.research, reality: col.reality, frameworks: Object.entries(fwRes).map(([id, r]) => ({ framework: id, ...r })), crossexam: crossData, redteam: redData };
      const raw = await callClaude(SYNTHESIS_SYSTEM, `Full analysis:\n${JSON.stringify(payload)}\n\nGenerate final decision output now.`, 1400);
      synthData = safeJSON(raw, { status: "ready", recommendation: "Analysis failed — retry.", confidence: 0, confidence_reasoning: [], risk_level: "High", why: [], top_risks: [], what_would_change_positive: [], what_would_change_negative: [], next_actions: [], missing_information: [], recommended_research: [], investigation_needed: true });
    } catch (e) {
      synthData = { status: "ready", recommendation: "Synthesis error.", confidence: 0, confidence_reasoning: [], risk_level: "High", why: [], top_risks: [], what_would_change_positive: [], what_would_change_negative: [], next_actions: [], missing_information: [], recommended_research: [], investigation_needed: true };
    }
    col.synthesis = synthData;
    setPhaseData(p => ({ ...p, synthesis: synthData }));
    setCompletedPhases(c => ({ ...c, synthesis: true }));

    setPendingEntry({
      id: Date.now(),
      date: new Date().toISOString(),
      question: q,
      prediction: synthData?.recommendation || "",
      confidence: synthData?.confidence || 0,
      risk_level: synthData?.risk_level || "Unknown",
      problem_type: realityData.problem_type,
      reasoning: synthData?.why?.join("; ") || "",
      framework_ids: fws.map(f => f.id),
      outcome: null,
      accuracy: null,
    });

    setActivePhase("synthesis");
    setIsRunning(false);
  }, [question, isRunning, manualProblemType, scores, reset]);

  const saveToJournal = useCallback(() => {
    if (!pendingEntry) return;
    const entry = { ...pendingEntry, outcome: journalOutcome };
    const updated = [entry, ...journal].slice(0, 50);
    setJournal(updated);
    saveJournal(updated);
    setShowJournalForm(false);
    setJournalOutcome("");
  }, [pendingEntry, journalOutcome, journal]);

  const updateOutcome = useCallback((id, outcome, accuracyStr) => {
    const accuracy = accuracyStr === "success" ? true : accuracyStr === "partial" ? "partial" : false;
    const updated = journal.map(e => e.id === id ? { ...e, outcome, accuracy } : e);
    setJournal(updated);
    saveJournal(updated);
    const entry = journal.find(e => e.id === id);
    if (entry?.framework_ids) {
      const updatedScores = recordFrameworkOutcome(scores, entry.framework_ids, accuracy === true);
      setScores(updatedScores);
      saveScores(updatedScores);
    }
  }, [journal, scores]);

  // ── RENDER ────────────────────────────────────────────────────────────────
  const research  = phaseData.research;
  const reality   = phaseData.reality;
  const crossexam = phaseData.crossexam;
  const redteam   = phaseData.redteam;
  const synthesis = phaseData.synthesis;

  const activeFw        = ALL_FRAMEWORKS.find(f => f.id === activeFrameworkId);
  const activeFwResult  = fwResults[activeFrameworkId];
  const activeFwLoading = fwLoading[activeFrameworkId];
  const consensusItems  = crossexam?.consensus || [];
  const maxSupport      = Math.max(...consensusItems.map(c => c.support_count), 1);
  const insufficientInfo = synthesis?.status === "insufficient_information" || synthesis?.investigation_needed;

  if (view === "journal") {
    return <JournalView journal={journal} scores={scores} onBack={() => setView("main")} onUpdateOutcome={updateOutcome} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060a12", color: "#e2e8f0", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "10px 18px", display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.015)", flexShrink: 0 }}>
        <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0 }}>🧩</div>
        <div>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9", letterSpacing: "-0.02em" }}>Thinking OS <span style={{ color: "#6366f1", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace" }}>v2</span></div>
          <div style={{ fontSize: "9px", color: "#334155", letterSpacing: "0.06em" }}>DECISION INTELLIGENCE · EVIDENCE-FIRST</div>
        </div>

        {hasRun && (
          <div style={{ display: "flex", alignItems: "center", gap: "3px", marginLeft: "14px" }}>
            {PHASES.map((ph, i) => (
              <div key={ph.id} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <div style={{
                  fontSize: "10px", padding: "2px 7px", borderRadius: "4px", fontWeight: "600", whiteSpace: "nowrap",
                  background: completedPhases[ph.id] ? `${ph.color}18` : activePhase === ph.id ? `${ph.color}12` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${completedPhases[ph.id] ? ph.color : activePhase === ph.id ? ph.color + "80" : "rgba(255,255,255,0.06)"}`,
                  color: completedPhases[ph.id] ? ph.color : activePhase === ph.id ? ph.color : "#334155",
                  display: "flex", alignItems: "center", gap: "4px"
                }}>
                  {completedPhases[ph.id] ? "✓" : activePhase === ph.id ? <Spinner color={ph.color} /> : ph.icon}
                  <span style={{ display: "inline" }}>{ph.label}</span>
                </div>
                {i < PHASES.length - 1 && <div style={{ width: "5px", height: "1px", background: "rgba(255,255,255,0.08)" }} />}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
          {hasRun && pendingEntry && !showJournalForm && (
            <button onClick={() => setShowJournalForm(true)} style={{ fontSize: "10px", background: "#f1c40f12", border: "1px solid #f1c40f30", borderRadius: "5px", padding: "4px 10px", cursor: "pointer", color: "#f9e24b", fontFamily: "'Inter',sans-serif", fontWeight: "600" }}>+ Journal</button>
          )}
          <button onClick={() => setView("journal")} style={{ fontSize: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "5px", padding: "4px 10px", cursor: "pointer", color: "#64748b", fontFamily: "'Inter',sans-serif" }}>📓 {journal.length}</button>
          {hasRun && <button onClick={reset} style={{ fontSize: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "5px", padding: "4px 10px", cursor: "pointer", color: "#64748b", fontFamily: "'Inter',sans-serif" }}>↺ Reset</button>}
        </div>
      </div>

      {!hasRun && (
        <div style={{ padding: "20px 18px 0", flexShrink: 0 }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "12px", padding: "14px 16px" }}>
            <div style={{ fontSize: "10px", color: "#475569", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "8px" }}>QUESTION OR DECISION</div>
            <textarea
              ref={textRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runAnalysis(); }}
              placeholder="Describe the problem, decision, or question you need to think through…"
              rows={3}
              style={{ width: "100%", background: "transparent", border: "none", color: "#e2e8f0", fontSize: "14px", fontFamily: "'Inter', sans-serif", resize: "none", lineHeight: "1.65" }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
                <span style={{ fontSize: "9px", color: "#334155", fontWeight: "600", letterSpacing: "0.08em" }}>TYPE (optional)</span>
                {PROBLEM_TYPES.map(pt => (
                  <button key={pt.id} onClick={() => setManualType(manualProblemType === pt.id ? null : pt.id)} style={{
                    padding: "2px 7px", borderRadius: "4px",
                    border: `1px solid ${manualProblemType === pt.id ? "#6366f1" : "rgba(255,255,255,0.07)"}`,
                    background: manualProblemType === pt.id ? "#6366f118" : "transparent",
                    color: manualProblemType === pt.id ? "#818cf8" : "#475569",
                    fontSize: "10px", fontFamily: "'Inter',sans-serif", cursor: "pointer"
                  }}>{pt.icon} {pt.label}</button>
                ))}
              </div>
              <button onClick={runAnalysis} disabled={!question.trim()} style={{
                background: question.trim() ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.05)",
                border: "none", borderRadius: "8px", padding: "9px 18px",
                color: question.trim() ? "#fff" : "#475569", fontSize: "13px", fontWeight: "600",
                cursor: question.trim() ? "pointer" : "not-allowed", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap"
              }}>Analyze →</button>
            </div>
            <div style={{ fontSize: "10px", color: "#1e293b", marginTop: "6px" }}>⌘+Enter to run · Web search: {ENABLE_WEB_SEARCH ? "✅ ON" : "❌ OFF"} · Auto-selects frameworks</div>
          </div>

          <div style={{ padding: "36px 0", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>🧩</div>
            <div style={{ color: "#334155", fontSize: "12px", maxWidth: "480px", margin: "0 auto", lineHeight: "1.75" }}>
              Research → Reality Extraction → Framework Analysis → Cross-Examination → Red Team → Decision Synthesis
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center", marginTop: "14px", maxWidth: "520px", margin: "14px auto 0" }}>
              {ALL_FRAMEWORKS.map(f => (
                <div key={f.id} style={{ padding: "3px 8px", background: `${f.color}10`, border: `1px solid ${f.color}22`, borderRadius: "20px", fontSize: "10px", color: f.accent }}>
                  {f.icon} {f.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {hasRun && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          <div style={{ width: "210px", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "10px", color: "#334155", lineHeight: "1.5", fontStyle: "italic" }}>
              "{question.slice(0, 70)}{question.length > 70 ? "…" : ""}"
            </div>
            <div style={{ padding: "6px 7px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: "2px" }}>
              {PHASES.filter(ph => ph.id !== "analysis").map(ph => (
                <button key={ph.id} onClick={() => setActiveFwId("__" + ph.id)} style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${completedPhases[ph.id] ? ph.color + "55" : "rgba(255,255,255,0.05)"}`,
                  borderRadius: "6px", padding: "6px 9px", cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "7px", transition: "all 0.15s ease"
                }}>
                  <span style={{ fontSize: "11px" }}>
                    {completedPhases[ph.id] ? "✓" : activePhase === ph.id ? <Spinner color={ph.color} /> : ph.icon}
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: "600", color: completedPhases[ph.id] ? ph.color : "#334155" }}>{ph.label}</span>
                </button>
              ))}
            </div>
            <div style={{ padding: "5px 7px 3px", fontSize: "9px", color: "#1e293b", letterSpacing: "0.08em", fontWeight: "600" }}>FRAMEWORKS</div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 7px 7px", display: "flex", flexDirection: "column", gap: "2px" }}>
              {selectedFwIds.map(fid => {
                const fw = ALL_FRAMEWORKS.find(f => f.id === fid);
                if (!fw) return null;
                const res = fwResults[fid];
                const loading = fwLoading[fid];
                const isActive = activeFrameworkId === fid;
                return (
                  <button key={fid} onClick={() => setActiveFwId(fid)} style={{
                    background: isActive ? `${fw.color}18` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isActive ? fw.color : "rgba(255,255,255,0.05)"}`,
                    borderRadius: "6px", padding: "6px 9px", cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", gap: "7px", transition: "all 0.15s ease"
                  }}>
                    <span style={{ fontSize: "13px", flexShrink: 0 }}>{fw.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "10px", fontWeight: "600", color: isActive ? fw.accent : "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fw.label}</div>
                      {res && <div style={{ fontSize: "9px", color: confColor(res.confidence), marginTop: "1px" }}>{res.confidence}%</div>}
                    </div>
                    {loading && <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: fw.accent, animation: "pulse 1s infinite", flexShrink: 0 }} />}
                    {res && !loading && <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", minWidth: 0 }}>
            {showJournalForm && (
              <div style={{ background: "#f1c40f08", border: "1px solid #f1c40f28", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", animation: "fadeUp 0.3s ease" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#f9e24b", marginBottom: "6px" }}>📓 Save to Decision Journal</div>
                <input value={journalOutcome} onChange={e => setJournalOutcome(e.target.value)} placeholder="What outcome are you expecting / betting on?" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "6px", padding: "6px 9px", color: "#e2e8f0", fontSize: "11px", fontFamily: "'Inter',sans-serif" }} />
                <div style={{ display: "flex", gap: "6px", marginTop: "7px" }}>
                  <button onClick={saveToJournal} style={{ background: "#f1c40f18", border: "1px solid #f1c40f35", borderRadius: "6px", padding: "5px 12px", cursor: "pointer", color: "#f9e24b", fontSize: "10px", fontWeight: "600", fontFamily: "'Inter',sans-serif" }}>Save Entry</button>
                  <button onClick={() => setShowJournalForm(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", color: "#475569", fontSize: "10px", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
                </div>
              </div>
            )}

            {synthesis && (
              <div style={{ background: insufficientInfo ? "rgba(239,68,68,0.04)" : "rgba(241,196,15,0.04)", border: `1px solid ${insufficientInfo ? "rgba(239,68,68,0.18)" : "rgba(241,196,15,0.15)"}`, borderRadius: "12px", padding: "16px 18px", marginBottom: "16px", animation: "fadeUp 0.4s ease" }}>
                {insufficientInfo ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                      <div style={{ fontSize: "10px", color: "#ef4444", fontWeight: "700", letterSpacing: "0.08em" }}>⛔ INSUFFICIENT INFORMATION — DO NOT DECIDE YET</div>
                      <ConfidenceBadge value={synthesis.confidence} />
                    </div>
                    <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "12px" }}>{synthesis.recommendation}</div>
                    {synthesis.missing_information?.length > 0 && (
                      <div style={{ marginBottom: "8px" }}>
                        <div style={{ fontSize: "9px", color: "#334155", fontWeight: "600", letterSpacing: "0.1em", marginBottom: "5px" }}>MISSING INFORMATION</div>
                        {synthesis.missing_information.map((m, i) => <div key={i} style={{ fontSize: "11px", color: "#ef4444", marginBottom: "3px" }}>· {m}</div>)}
                      </div>
                    )}
                    {synthesis.recommended_research?.length > 0 && (
                      <div>
                        <div style={{ fontSize: "9px", color: "#334155", fontWeight: "600", letterSpacing: "0.1em", marginBottom: "5px" }}>RECOMMENDED RESEARCH</div>
                        {synthesis.recommended_research.map((r, i) => <div key={i} style={{ fontSize: "11px", color: "#60a5fa", marginBottom: "3px" }}>→ {r}</div>)}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "9px", color: "#64748b", fontWeight: "600", letterSpacing: "0.1em", marginBottom: "4px" }}>FINAL DECISION</div>
                        <div style={{ fontSize: "16px", fontWeight: "700", color: "#f1f5f9", lineHeight: "1.4" }}>{synthesis.recommendation}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px", flexShrink: 0 }}>
                        <ConfidenceBadge value={synthesis.confidence} />
                        <span style={{
                          fontSize: "9px", fontWeight: "700", padding: "2px 7px", borderRadius: "4px",
                          background: synthesis.risk_level === "High" ? "#ef444415" : synthesis.risk_level === "Medium" ? "#f59e0b15" : "#22c55e15",
                          color: synthesis.risk_level === "High" ? "#ef4444" : synthesis.risk_level === "Medium" ? "#f59e0b" : "#22c55e",
                          border: `1px solid ${synthesis.risk_level === "High" ? "#ef444430" : synthesis.risk_level === "Medium" ? "#f59e0b30" : "#22c55e30"}`
                        }}>{synthesis.risk_level} RISK</span>
                      </div>
                    </div>

                    {synthesis.confidence_reasoning?.length > 0 && (
                      <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "6px", padding: "7px 9px", marginBottom: "10px" }}>
                        <div style={{ fontSize: "9px", color: "#334155", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "4px" }}>CONFIDENCE REASONING</div>
                        {synthesis.confidence_reasoning.map((r, i) => <div key={i} style={{ fontSize: "10px", color: "#64748b", marginBottom: "2px" }}>· {r}</div>)}
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                      <MiniSection title="WHY" items={synthesis.why} color="#60a5fa" />
                      <MiniSection title="TOP RISKS" items={synthesis.top_risks} color="#f87171" />
                      <MiniSection title="WHAT WOULD CHANGE THIS (+)" items={synthesis.what_would_change_positive} color="#34d399" />
                      <MiniSection title="WHAT WOULD CHANGE THIS (−)" items={synthesis.what_would_change_negative} color="#fb923c" />
                    </div>

                    {synthesis.next_actions?.length > 0 && (
                      <div>
                        <div style={{ fontSize: "9px", color: "#334155", fontWeight: "600", letterSpacing: "0.1em", marginBottom: "6px" }}>NEXT ACTIONS</div>
                        {synthesis.next_actions.slice(0, 5).map((a, i) => (
                          <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                            <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#6366f1", fontWeight: "700", flexShrink: 0, marginTop: "2px" }}>{String(i + 1).padStart(2, "0")}</span>
                            <span style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.5" }}>{a}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {crossexam && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", animation: "fadeUp 0.35s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", letterSpacing: "0.08em" }}>CONSENSUS ENGINE</div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span style={{ fontSize: "10px", color: "#22c55e", fontWeight: "600" }}>Agreement {crossexam.agreement_score}%</span>
                    <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: "600" }}>Conflict {crossexam.conflict_score}%</span>
                  </div>
                </div>

                {consensusItems.map((c, i) => (
                  <div key={i} style={{ marginBottom: "7px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontSize: "11px", color: "#e2e8f0" }}>{c.recommendation}</span>
                      <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#94a3b8" }}>{c.support_count}/{selectedFwIds.length}</span>
                    </div>
                    <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                      <div style={{ height: "100%", width: `${(c.support_count / maxSupport) * 100}%`, background: i === 0 ? "#6366f1" : "#334155", borderRadius: "3px", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                ))}

                {crossexam.major_disagreements?.length > 0 && (
                  <div style={{ marginTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px" }}>
                    <div style={{ fontSize: "9px", color: "#ec4899", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "7px" }}>⚡ MAJOR DISAGREEMENTS — Often the most valuable insight</div>
                    {crossexam.major_disagreements.map((d, i) => (
                      <div key={i} style={{ marginBottom: "8px", padding: "7px 9px", background: "#ec489908", border: "1px solid #ec489920", borderRadius: "6px" }}>
                        <div style={{ fontSize: "10px", color: "#f472b6", fontWeight: "600", marginBottom: "3px" }}>{d.framework_a} vs {d.framework_b}</div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "3px" }}>{d.disagreement}</div>
                        {d.why_this_matters && <div style={{ fontSize: "10px", color: "#64748b" }}>Why it matters: {d.why_this_matters}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {crossexam.hidden_insight && (
                  <div style={{ marginTop: "8px", padding: "7px 9px", background: "#f59e0b08", border: "1px solid #f59e0b1f", borderRadius: "6px", fontSize: "11px", color: "#fbbf24" }}>
                    💡 {crossexam.hidden_insight}
                  </div>
                )}
              </div>
            )}

            {redteam && (
              <div style={{ background: "#ef444408", border: "1px solid rgba(239,68,68,0.14)", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", animation: "fadeUp 0.35s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", letterSpacing: "0.08em" }}>RED TEAM REVIEW</div>
                  <span style={{
                    fontSize: "9px", fontWeight: "700", padding: "2px 7px", borderRadius: "4px",
                    background: redteam.survivability === "Yes" ? "#22c55e15" : redteam.survivability === "No" ? "#ef444415" : "#f59e0b15",
                    color: redteam.survivability === "Yes" ? "#22c55e" : redteam.survivability === "No" ? "#ef4444" : "#f59e0b",
                    border: `1px solid ${redteam.survivability === "Yes" ? "#22c55e30" : redteam.survivability === "No" ? "#ef444430" : "#f59e0b30"}`
                  }}>Survives: {redteam.survivability}</span>
                </div>

                {redteam.kill_shot && <div style={{ fontSize: "11px", color: "#ef4444", fontWeight: "600", marginBottom: "9px" }}>☠ Kill shot: {redteam.kill_shot}</div>}

                {(redteam.failure_modes || []).slice(0, 5).map((fm, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "7px", padding: "7px 9px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <SeverityBadge severity={fm.severity} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "11px", color: "#e2e8f0", fontWeight: "500" }}>{fm.mode}</div>
                      {fm.warning_signal && <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>⚡ {fm.warning_signal}</div>}
                      {fm.mitigation && <div style={{ fontSize: "10px", color: "#60a5fa", marginTop: "2px" }}>🛡 {fm.mitigation}</div>}
                    </div>
                  </div>
                ))}

                {redteam.mitigation_plan?.length > 0 && (
                  <div style={{ marginTop: "8px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px" }}>
                    <div style={{ fontSize: "9px", color: "#334155", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "6px" }}>MITIGATION PLAN</div>
                    {redteam.mitigation_plan.slice(0, 4).map((m, i) => (
                      <div key={i} style={{ marginBottom: "5px", display: "flex", gap: "8px" }}>
                        <span style={{ fontSize: "9px", fontFamily: "'JetBrains Mono', monospace", color: "#ef4444", flexShrink: 0, marginTop: "2px" }}>{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <div style={{ fontSize: "10px", color: "#94a3b8" }}>{m.risk}</div>
                          <div style={{ fontSize: "10px", color: "#60a5fa" }}>→ {m.action}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {research && (
              <div style={{ background: "rgba(34,197,94,0.03)", border: "1px solid rgba(34,197,94,0.12)", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "9px" }}>
                  <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", letterSpacing: "0.08em" }}>🔎 RESEARCH LAYER</div>
                  <ConfidenceBadge value={research.research_confidence} small />
                </div>
                {research.research_summary && <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "9px", fontStyle: "italic" }}>{research.research_summary}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <div>
                    <div style={{ fontSize: "9px", color: "#22c55e", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "4px" }}>FACTS ✓</div>
                    {(!research.facts?.length) ? <div style={{ fontSize: "10px", color: "#1e293b" }}>None found</div>
                      : research.facts.slice(0, 5).map((f, i) => <div key={i} style={{ fontSize: "10px", color: "#64748b", lineHeight: "1.55", marginBottom: "3px" }}>· {f}</div>)}
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "#f59e0b", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "4px" }}>SOURCES</div>
                    {(!research.sources?.length) ? <div style={{ fontSize: "10px", color: "#1e293b" }}>None</div>
                      : research.sources.slice(0, 5).map((s, i) => <div key={i} style={{ fontSize: "10px", color: "#64748b", lineHeight: "1.55", marginBottom: "3px" }}>· {s}</div>)}
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "#ef4444", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "4px" }}>UNKNOWNS ?</div>
                    {(!research.unknowns?.length) ? <div style={{ fontSize: "10px", color: "#1e293b" }}>None</div>
                      : research.unknowns.slice(0, 5).map((u, i) => <div key={i} style={{ fontSize: "10px", color: "#64748b", lineHeight: "1.55", marginBottom: "3px" }}>· {u}</div>)}
                  </div>
                </div>
              </div>
            )}

            {reality && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "9px" }}>
                  <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600", letterSpacing: "0.08em" }}>REALITY EXTRACTION</div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {reality.problem_type && (
                      <span style={{ fontSize: "10px", background: "#6366f112", border: "1px solid #6366f128", borderRadius: "4px", padding: "2px 7px", color: "#818cf8" }}>
                        {PROBLEM_TYPES.find(p => p.id === reality.problem_type)?.icon} {reality.problem_type}
                      </span>
                    )}
                    <ConfidenceBadge value={reality.extraction_confidence} small />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  {[
                    { title: "FACTS ✓", items: reality.facts, color: "#22c55e" },
                    { title: "ASSUMPTIONS ~", items: reality.assumptions, color: "#f59e0b" },
                    { title: "UNKNOWNS ?", items: reality.unknowns, color: "#ef4444" },
                  ].map(({ title, items, color }) => (
                    <div key={title}>
                      <div style={{ fontSize: "9px", color, fontWeight: "600", letterSpacing: "0.08em", marginBottom: "4px" }}>{title}</div>
                      {(!items?.length) ? <div style={{ fontSize: "10px", color: "#1e293b" }}>None</div>
                        : items.slice(0, 4).map((item, i) => <div key={i} style={{ fontSize: "10px", color: "#64748b", lineHeight: "1.55", marginBottom: "3px" }}>· {item}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeFrameworkId && !activeFrameworkId.startsWith("__") && activeFw && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${activeFw.color}28`, borderRadius: "10px", padding: "14px 16px", animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <div style={{ width: "30px", height: "30px", background: `${activeFw.color}18`, border: `1px solid ${activeFw.color}35`, borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>{activeFw.icon}</div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#f1f5f9" }}>{activeFw.label}</div>
                    <div style={{ fontSize: "10px", color: "#475569" }}>{activeFw.thinker}</div>
                  </div>
                  {activeFwResult && <ConfidenceBadge value={activeFwResult.confidence} />}
                </div>

                {activeFwLoading ? (
                  <LoadingSkeleton color={activeFw.accent} label={`Applying ${activeFw.label} lens…`} />
                ) : activeFwResult ? (
                  <div style={{ animation: "fadeUp 0.3s ease" }}>
                    {activeFwResult.key_claim && (
                      <div style={{ marginBottom: "10px" }}>
                        <div style={{ fontSize: "9px", color: "#334155", fontWeight: "600", letterSpacing: "0.1em", marginBottom: "4px" }}>KEY CLAIM</div>
                        <div style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: "1.6", fontWeight: "500" }}>{activeFwResult.key_claim}</div>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <FrameworkList title="EVIDENCE" items={activeFwResult.evidence} color="#60a5fa" />
                      <FrameworkList title="COUNTERARGUMENTS" items={activeFwResult.counterarguments} color="#f87171" />
                      <FrameworkList title="UNKNOWNS" items={activeFwResult.unknowns} color="#fbbf24" />
                      {activeFwResult.recommendation && (
                        <div>
                          <div style={{ fontSize: "9px", color: "#334155", fontWeight: "600", letterSpacing: "0.1em", marginBottom: "4px" }}>RECOMMENDATION</div>
                          <div style={{ fontSize: "11px", color: `${activeFw.accent}`, lineHeight: "1.5" }}>{activeFwResult.recommendation}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#334155", fontSize: "12px" }}>Waiting to load…</div>
                )}
              </div>
            )}

            {hasRun && !research && (
              <LoadingSkeleton color="#22c55e" label="Searching for evidence…" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}