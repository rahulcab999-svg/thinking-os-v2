'use client';

import { useState, useRef, useEffect, useCallback } from "react";

// ─── MARKDOWN EXPORT ──────────────────────────────────────────────────────────
function exportMarkdown(question, phaseData, fwResults, selectedFwIds) {
  const { research, reality, crossexam, redteam, synthesis } = phaseData;
  const lines = [];
  lines.push(`# Thinking OS — Decision Analysis`);
  lines.push(`**Question:** ${question}`);
  lines.push(`**Date:** ${new Date().toLocaleString()}`);
  lines.push(``);
  if (synthesis) {
    lines.push(`## Final Decision`);
    lines.push(`**${synthesis.recommendation}**`);
    lines.push(`Confidence: ${synthesis.confidence}% · Risk: ${synthesis.risk_level}`);
    lines.push(``);
    if (synthesis.why?.length) { lines.push(`### Why`); synthesis.why.forEach(w => lines.push(`- ${w}`)); lines.push(``); }
    if (synthesis.top_risks?.length) { lines.push(`### Top Risks`); synthesis.top_risks.forEach(r => lines.push(`- ${r}`)); lines.push(``); }
    if (synthesis.next_actions?.length) { lines.push(`### Next Actions`); synthesis.next_actions.forEach((a,i) => lines.push(`${i+1}. ${a}`)); lines.push(``); }
    if (synthesis.confidence_reasoning?.length) { lines.push(`### Confidence Reasoning`); synthesis.confidence_reasoning.forEach(r => lines.push(`- ${r}`)); lines.push(``); }
  }
  if (crossexam) {
    lines.push(`## Cross-Examination`);
    lines.push(`Agreement: ${crossexam.agreement_score}% · Conflict: ${crossexam.conflict_score}%`);
    if (crossexam.hidden_insight) lines.push(`**Hidden Insight:** ${crossexam.hidden_insight}`);
    if (crossexam.major_disagreements?.length) {
      lines.push(``); lines.push(`### Major Disagreements`);
      crossexam.major_disagreements.forEach(d => { lines.push(`**${d.framework_a} vs ${d.framework_b}:** ${d.disagreement}`); if (d.why_this_matters) lines.push(`*Why it matters: ${d.why_this_matters}*`); });
    }
    lines.push(``);
  }
  if (redteam) {
    lines.push(`## Red Team`);
    lines.push(`Survivability: **${redteam.survivability}**`);
    if (redteam.kill_shot) lines.push(`Kill Shot: ${redteam.kill_shot}`);
    if (redteam.failure_modes?.length) {
      lines.push(``); lines.push(`### Failure Modes`);
      redteam.failure_modes.forEach(fm => { lines.push(`- **[${fm.severity}]** ${fm.mode}`); if (fm.mitigation) lines.push(`  - Mitigation: ${fm.mitigation}`); });
    }
    lines.push(``);
  }
  if (selectedFwIds?.length) {
    lines.push(`## Framework Analysis`);
    const FW_LIST = [
      {id:"first_principles",label:"First Principles",icon:"⚗️"},
      {id:"thiel",label:"Thiel Contrarian",icon:"♟️"},
      {id:"inversion",label:"Inversion",icon:"🔄"},
      {id:"second_order",label:"Second-Order",icon:"🌊"},
      {id:"taleb",label:"Taleb Antifragility",icon:"💀"},
      {id:"bayes",label:"Bayesian Thinking",icon:"📊"},
      {id:"porter",label:"Porter's Five Forces",icon:"🏭"},
      {id:"kahneman",label:"Kahneman: Bias",icon:"⚡"},
      {id:"munger",label:"Munger's Lattice",icon:"🧠"},
      {id:"sun_tzu",label:"Sun Tzu",icon:"⚔️"},
      {id:"feynman",label:"Feynman Technique",icon:"🔬"},
      {id:"popper",label:"Popper: Falsifiability",icon:"🔭"},
      {id:"bias_checker",label:"Bias Audit",icon:"🪲"},
    ];
    selectedFwIds.forEach(fid => {
      const fw = FW_LIST.find(f => f.id === fid);
      const res = fwResults[fid];
      if (!fw || !res) return;
      lines.push(``); lines.push(`### ${fw.icon} ${fw.label}`);
      if (res.key_claim) lines.push(`**Key Claim:** ${res.key_claim}`);
      lines.push(`Confidence: ${res.confidence}%`);
      if (res.evidence?.length) { lines.push(`**Evidence:**`); res.evidence.forEach(e => lines.push(`- ${e}`)); }
      if (res.recommendation) lines.push(`**Recommendation:** ${res.recommendation}`);
    });
    lines.push(``);
  }
  if (research) {
    lines.push(`## Research Layer (confidence: ${research.research_confidence}%)`);
    if (research.research_summary) lines.push(research.research_summary);
    if (research.facts?.length) { lines.push(``); lines.push(`**Facts:**`); research.facts.forEach(f => lines.push(`- ${f}`)); }
    if (research.sources?.length) { lines.push(``); lines.push(`**Sources:**`); research.sources.forEach(s => lines.push(`- ${s}`)); }
    if (research.unknowns?.length) { lines.push(``); lines.push(`**Unknowns:**`); research.unknowns.forEach(u => lines.push(`- ${u}`)); }
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `decision-${Date.now()}.md`; a.click();
  URL.revokeObjectURL(url);
}

// ─── WEB SEARCH MASTER SWITCH ──────────────────────────────────────────────────
const ENABLE_WEB_SEARCH = true;

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

// ─── REQUIRED FIELDS FOR EACH QUESTION TYPE ──────────────────────────────────
const REQUIRED_FIELDS = {
  investment: [
    { id: "age", label: "Your age", type: "number" },
    { id: "country", label: "Your country", type: "text" },
    { id: "amount", label: "Investment amount", type: "number" },
    { id: "horizon", label: "Investment horizon (e.g., 3 years, 10 years)", type: "text" },
    { id: "risk_tolerance", label: "Risk tolerance (Low/Medium/High)", type: "text" },
    { id: "existing_investments", label: "Existing investments (if any)", type: "text" },
    { id: "emergency_fund", label: "Emergency fund amount", type: "number" },
    { id: "financial_goal", label: "Financial goal", type: "text" },
  ],
  business: [
    { id: "industry", label: "Industry", type: "text" },
    { id: "revenue", label: "Annual revenue", type: "number" },
    { id: "profit", label: "Annual profit", type: "number" },
    { id: "debt", label: "Total debt", type: "number" },
    { id: "purchase_price", label: "Purchase price (if acquiring)", type: "number" },
    { id: "competition", label: "Key competitors", type: "text" },
    { id: "location", label: "Location", type: "text" },
  ],
  career: [
    { id: "current_role", label: "Current role", type: "text" },
    { id: "experience", label: "Years of experience", type: "number" },
    { id: "salary", label: "Current salary", type: "number" },
    { id: "skills", label: "Key skills", type: "text" },
    { id: "career_goal", label: "Career goal", type: "text" },
  ],
  startup: [
    { id: "industry", label: "Industry", type: "text" },
    { id: "stage", label: "Stage (idea, MVP, revenue)", type: "text" },
    { id: "funding", label: "Funding raised so far", type: "number" },
    { id: "team_size", label: "Team size", type: "number" },
    { id: "revenue", label: "Current revenue (if any)", type: "number" },
    { id: "location", label: "Location", type: "text" },
  ],
  product: [
    { id: "product_stage", label: "Product stage (idea, prototype, launched)", type: "text" },
    { id: "users", label: "Current users (if any)", type: "number" },
    { id: "revenue", label: "Revenue (if any)", type: "number" },
    { id: "competitors", label: "Key competitors", type: "text" },
    { id: "differentiation", label: "What makes this product unique?", type: "text" },
  ],
  strategy: [
    { id: "industry", label: "Industry", type: "text" },
    { id: "position", label: "Current market position", type: "text" },
    { id: "competitors", label: "Key competitors", type: "text" },
    { id: "goal", label: "Strategic goal", type: "text" },
    { id: "resources", label: "Available resources", type: "text" },
  ],
  personal: [
    { id: "age", label: "Your age", type: "number" },
    { id: "situation", label: "Current situation", type: "text" },
    { id: "goal", label: "Personal goal", type: "text" },
    { id: "timeline", label: "Timeline", type: "text" },
  ],
  marketing: [
    { id: "industry", label: "Industry", type: "text" },
    { id: "product", label: "Product/Service", type: "text" },
    { id: "audience", label: "Target audience", type: "text" },
    { id: "budget", label: "Marketing budget", type: "number" },
    { id: "goal", label: "Marketing goal", type: "text" },
  ],
  operations: [
    { id: "industry", label: "Industry", type: "text" },
    { id: "scale", label: "Current scale (size, revenue)", type: "text" },
    { id: "bottleneck", label: "Key operational bottleneck", type: "text" },
    { id: "goal", label: "Operational goal", type: "text" },
  ],
  negotiation: [
    { id: "context", label: "What are you negotiating?", type: "text" },
    { id: "stakes", label: "What's at stake?", type: "text" },
    { id: "leverage", label: "Your leverage", type: "text" },
    { id: "deadline", label: "Deadline", type: "text" },
  ],
  hiring: [
    { id: "role", label: "Role you're hiring for", type: "text" },
    { id: "team_size", label: "Current team size", type: "number" },
    { id: "budget", label: "Budget for this role", type: "number" },
    { id: "urgency", label: "How urgent is this hire?", type: "text" },
  ],
};

// ─── FRAMEWORK SELECTION ENGINE ──────────────────────────────────────────────
const FRAMEWORK_SELECTION = {
  startup: ["first_principles", "thiel", "taleb", "porter", "munger"],
  career: ["inversion", "kahneman", "bayes", "sun_tzu", "feynman"],
  investment: ["bayes", "taleb", "second_order", "porter", "munger"],
  product: ["first_principles", "porter", "feynman", "thiel", "munger"],
  strategy: ["sun_tzu", "porter", "inversion", "second_order", "thiel"],
  personal: ["kahneman", "inversion", "feynman", "bayes", "munger"],
  marketing: ["thiel", "porter", "sun_tzu", "kahneman", "munger"],
  operations: ["inversion", "second_order", "porter", "taleb", "feynman"],
  negotiation: ["sun_tzu", "kahneman", "inversion", "taleb", "thiel"],
  hiring: ["kahneman", "bayes", "munger", "inversion", "porter"],
};

// ─── FRAMEWORKS ───────────────────────────────────────────────────────────────
const ALL_FRAMEWORKS = [
  {
    id: "first_principles", label: "First Principles", icon: "⚗️",
    color: "#6366f1", accent: "#818cf8", thinker: "Aristotle · Elon Musk",
    relevantFor: ["startup","product","strategy","personal","operations"],
    prompt: `You are a first-principles thinker. Use ONLY the verified facts provided. Distinguish clearly between facts and assumptions.
CRITICAL RULE: Every point you make must directly reference something specific from the user's question or the provided facts. No generic statements that could apply to any situation.
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
CRITICAL RULE: Every point must be specific to this exact situation. Do not give advice that could apply to any startup or decision. Name specific dynamics, specific competitors, specific market conditions from the provided context.
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
CRITICAL RULE: List failure modes that are specific to this exact situation. Not generic risks — specific ways THIS decision fails given THESE facts.
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
CRITICAL RULE: The effects you describe must be specific to this situation. Do not describe generic second-order effects — trace the actual chain of consequences from THIS specific decision given THESE specific facts.
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
CRITICAL RULE: Identify black swans and tail risks that are specific to this situation and industry. Do not list generic risks. If you cannot identify specific tail risks from the provided data, say so explicitly and lower your confidence.
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
CRITICAL RULE: Use actual numbers and base rates from the provided research data. Do not invent statistics. If base rate data is missing, explicitly state it is missing and lower confidence accordingly.
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
CRITICAL RULE: Name actual competitors, actual market dynamics, actual suppliers from the provided research. If the research doesn't contain this data, explicitly flag each gap and lower confidence.
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
CRITICAL RULE: Identify biases that are specifically active in this situation. Do not list all possible biases — only the ones that are clearly present given what the user has described. Explain exactly how each bias is showing up.
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
CRITICAL RULE: Apply each mental model to the specific details of this situation. Do not describe what the model means in general — show exactly how it applies to these specific facts.
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
CRITICAL RULE: Be specific about who the actual adversaries or competing forces are in this situation. Name them. Describe specific terrain and timing advantages based on the actual context provided.
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
CRITICAL RULE: The plain language test and gap identification must be about THIS specific problem, not a generic explanation of how Feynman thinking works.
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
CRITICAL RULE: The hypothesis you test must be the actual core claim or belief embedded in the user's question. Do not test a generic hypothesis — extract and test the real one.
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
CRITICAL RULE: Only list biases that are actually present and demonstrably active in this specific situation. Explain exactly how each bias is showing up. Do not list every possible bias — only the ones truly at play here.
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

// ─── DECISION CONTEXT ENGINE ──────────────────────────────────────────────────
function loadContexts() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("tos_v2_contexts") || "{}"); } catch { return {}; }
}
function saveContexts(c) {
  try { localStorage.setItem("tos_v2_contexts", JSON.stringify(c)); } catch {}
}

function generateContextId(question, type) {
  const base = question.slice(0, 30).replace(/\s+/g, '_');
  return `${type}_${base}_${Date.now()}`;
}

function classifyProblemType(question) {
  const keywords = {
    startup: ["startup", "business", "company", "entrepreneur", "venture", "founder", "launch"],
    career: ["career", "job", "promotion", "salary", "negotiate", "switch", "resign", "hire"],
    investment: ["invest", "stock", "fund", "real estate", "portfolio", "return", "risk", "profit"],
    product: ["product", "feature", "user", "customer", "design", "build", "develop"],
    strategy: ["strategy", "competitive", "market", "position", "differentiate", "advantage"],
    personal: ["personal", "life", "relationship", "health", "habit", "goal", "self"],
    marketing: ["market", "brand", "advertise", "promote", "customer", "campaign", "social media"],
    operations: ["operate", "process", "efficiency", "supply", "logistics", "cost", "scale"],
    negotiation: ["negotiate", "deal", "contract", "term", "price", "discount", "partner"],
    hiring: ["hire", "recruit", "interview", "candidate", "team", "talent", "role"],
  };

  const scores = {};
  Object.keys(keywords).forEach(type => {
    scores[type] = keywords[type].filter(word => 
      question.toLowerCase().includes(word)
    ).length;
  });

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : "strategy";
}

function detectMissingInfo(category, answers) {
  const required = REQUIRED_FIELDS[category] || [];
  const missing = [];
  required.forEach(field => {
    const value = answers[field.id];
    if (!value || value.trim() === "") {
      missing.push(field);
    }
  });
  return missing;
}

function generateQuestions(missing) {
  return missing.slice(0, 5).map(field => field.label);
}

function createContext(question, type, answers = {}) {
  return {
    id: generateContextId(question, type),
    question: question,
    type: type,
    answers: answers,
    created: Date.now(),
    updated: Date.now(),
    status: "incomplete", // incomplete | complete | analyzing | done
  };
}

// ─── API CALL ──────────────────────────────────────────────────────────────────
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
}

// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────

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
}`;

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
      <div style={{ fontSize: small ? "11px" : "13px", fontWeight: "700", color, letterSpacing: "0.06em" }}>
        {confLabel(value)} {value}%
      </div>
      <div style={{ width: small ? "48px" : "60px", height: "3px", background: "#e2e8f0", borderRadius: "2px" }}>
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
    <div style={{ fontSize: "11px", fontWeight: "700", color: c, background: `${c}18`, border: `1px solid ${c}35`, borderRadius: "4px", padding: "2px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
      {severity}
    </div>
  );
}

// ─── MINI SECTION ─────────────────────────────────────────────────────────────
function MiniSection({ title, items, color }) {
  if (!items?.length) return null;
  return (
    <div style={{ background: "#f7fafc", borderRadius: "7px", padding: "8px 12px" }}>
      <div style={{ fontSize: "11px", fontWeight: "600", color: "#4a5568", letterSpacing: "0.08em", marginBottom: "6px" }}>{title}</div>
      {items.slice(0, 3).map((item, i) => (
        <div key={i} style={{ fontSize: "14px", color, lineHeight: "1.6", marginBottom: "3px" }}>· {item}</div>
      ))}
    </div>
  );
}

// ─── FRAMEWORK LIST ───────────────────────────────────────────────────────────
function FrameworkList({ title, items, color }) {
  if (!items?.length) return null;
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: "600", color: "#4a5568", letterSpacing: "0.08em", marginBottom: "5px" }}>{title}</div>
      {items.slice(0, 4).map((item, i) => (
        <div key={i} style={{ fontSize: "14px", color, lineHeight: "1.6", marginBottom: "3px" }}>· {item}</div>
      ))}
    </div>
  );
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────
function LoadingSkeleton({ color, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", color, fontSize: "14px" }}>
        <div style={{ width: "12px", height: "12px", border: `2px solid ${color}33`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        {label}
      </div>
      {[75, 55, 65, 45, 60].map((w, i) => (
        <div key={i} style={{ height: "12px", width: `${w}%`, background: "#edf2f7", borderRadius: "4px", animation: "pulse 1.5s ease infinite", animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────
function Spinner({ color }) {
  return (
    <div style={{ width: "10px", height: "10px", border: `2px solid ${color}44`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
  );
}

// ─── JOURNAL VIEW ─────────────────────────────────────────────────────────────
function JournalView({ journal, scores, onBack, onUpdateOutcome }) {
  const [editingId, setEditingId] = useState(null);
  const [editOutcome, setEditOutcome] = useState("");
  const [editAccuracy, setEditAccuracy] = useState("success");

  const totalEntries = journal.length;
  const withOutcomes = journal.filter(e => e.accuracy != null).length;
  const successCount = journal.filter(e => e.accuracy === true).length;
  const calibrationScore = withOutcomes > 0 ? Math.round((successCount / withOutcomes) * 100) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", color: "#1a1a2e", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ borderBottom: "1px solid #e2e8f0", padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", background: "#ffffff" }}>
        <button onClick={onBack} style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "5px 14px", cursor: "pointer", color: "#4a5568", fontSize: "13px", fontFamily: "'Inter',sans-serif" }}>← Back</button>
        <div style={{ fontSize: "16px", fontWeight: "700", color: "#1a1a2e" }}>📓 Decision Journal</div>
        <div style={{ fontSize: "12px", color: "#718096" }}>{totalEntries} entries</div>
        {calibrationScore != null && (
          <div style={{ marginLeft: "auto", fontSize: "12px", background: confColor(calibrationScore) + "15", border: `1px solid ${confColor(calibrationScore)}35`, borderRadius: "5px", padding: "3px 10px", color: confColor(calibrationScore), fontWeight: "700" }}>
            Calibration {calibrationScore}% ({withOutcomes} tracked)
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 260px", gap: "16px", alignItems: "start" }}>
        <div>
          {journal.length === 0 ? (
            <div style={{ textAlign: "center", color: "#718096", fontSize: "15px", padding: "60px 20px" }}>No decisions recorded yet.</div>
          ) : journal.map(entry => (
            <div key={entry.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 18px", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", color: "#718096", marginBottom: "3px" }}>
                    {new Date(entry.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    {" · "}{entry.problem_type || "strategy"}
                  </div>
                  <div style={{ fontSize: "13px", color: "#4a5568", fontStyle: "italic", marginBottom: "6px" }}>"{entry.question}"</div>
                  <div style={{ fontSize: "15px", fontWeight: "600", color: "#1a1a2e", lineHeight: "1.4" }}>{entry.prediction}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                  <ConfidenceBadge value={entry.confidence} small />
                  {entry.risk_level && (
                    <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "4px",
                      background: entry.risk_level === "High" ? "#ef444415" : entry.risk_level === "Medium" ? "#f59e0b15" : "#22c55e15",
                      color: entry.risk_level === "High" ? "#ef4444" : entry.risk_level === "Medium" ? "#f59e0b" : "#22c55e"
                    }}>{entry.risk_level} RISK</span>
                  )}
                  {entry.accuracy != null && (
                    <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "4px",
                      background: entry.accuracy === true ? "#22c55e15" : entry.accuracy === "partial" ? "#f59e0b15" : "#ef444415",
                      color: entry.accuracy === true ? "#22c55e" : entry.accuracy === "partial" ? "#f59e0b" : "#ef4444"
                    }}>
                      {entry.accuracy === true ? "✓ Correct" : entry.accuracy === "partial" ? "~ Partial" : "✕ Incorrect"}
                    </span>
                  )}
                </div>
              </div>

              {entry.reasoning && (
                <div style={{ fontSize: "12px", color: "#718096", lineHeight: "1.6", marginBottom: "8px" }}>
                  {entry.reasoning.slice(0, 180)}{entry.reasoning.length > 180 ? "…" : ""}
                </div>
              )}

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "4px" }}>
                <div style={{ fontSize: "11px", color: "#718096", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "5px" }}>OUTCOME</div>
                {editingId === entry.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <input value={editOutcome} onChange={e => setEditOutcome(e.target.value)} placeholder="What actually happened?" style={{ background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: "5px", padding: "6px 10px", color: "#1a1a2e", fontSize: "13px", fontFamily: "'Inter',sans-serif" }} />
                    <div style={{ display: "flex", gap: "5px" }}>
                      {["success","partial","failure"].map(v => (
                        <button key={v} onClick={() => setEditAccuracy(v)} style={{ flex: 1, background: editAccuracy === v ? (v === "success" ? "#22c55e20" : v === "partial" ? "#f59e0b20" : "#ef444420") : "#f7fafc", border: `1px solid ${editAccuracy === v ? (v === "success" ? "#22c55e50" : v === "partial" ? "#f59e0b50" : "#ef444450") : "#e2e8f0"}`, borderRadius: "5px", padding: "4px 8px", cursor: "pointer", color: editAccuracy === v ? (v === "success" ? "#22c55e" : v === "partial" ? "#f59e0b" : "#ef4444") : "#4a5568", fontSize: "12px", fontFamily: "'Inter',sans-serif", textTransform: "capitalize" }}>{v}</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: "5px" }}>
                      <button onClick={() => { onUpdateOutcome(entry.id, editOutcome, editAccuracy); setEditingId(null); }} style={{ background: "#6366f120", border: "1px solid #6366f140", borderRadius: "5px", padding: "5px 14px", cursor: "pointer", color: "#6366f1", fontSize: "12px", fontFamily: "'Inter',sans-serif" }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: "5px", padding: "5px 12px", cursor: "pointer", color: "#718096", fontSize: "12px", fontFamily: "'Inter',sans-serif" }}>✕</button>
                    </div>
                  </div>
                ) : entry.outcome ? (
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "13px", color: "#4a5568", flex: 1 }}>{entry.outcome}</div>
                    <button onClick={() => { setEditingId(entry.id); setEditOutcome(entry.outcome); setEditAccuracy(entry.accuracy === true ? "success" : entry.accuracy === "partial" ? "partial" : "failure"); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#718096", fontSize: "12px" }}>✏</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingId(entry.id); setEditOutcome(""); setEditAccuracy("success"); }} style={{ background: "transparent", border: "1px dashed #e2e8f0", borderRadius: "5px", padding: "5px 12px", cursor: "pointer", color: "#718096", fontSize: "12px", fontFamily: "'Inter',sans-serif" }}>+ Record outcome</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ position: "sticky", top: 0 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px" }}>
            <div style={{ fontSize: "12px", color: "#4a5568", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "10px" }}>FRAMEWORK PERFORMANCE</div>
            {ALL_FRAMEWORKS.map(fw => {
              const s = scores[fw.id];
              if (!s || s.uses === 0) return null;
              const rate = fwSuccessRate(s);
              const avgConf = fwAvgConf(s);
              return (
                <div key={fw.id} style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                    <span style={{ fontSize: "12px", color: "#4a5568" }}>{fw.icon} {fw.label}</span>
                    <span style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: rate != null ? confColor(rate) : "#718096" }}>
                      {rate != null ? `${rate}%` : "—"} · {s.uses}✗
                    </span>
                  </div>
                  {rate != null && (
                    <div style={{ height: "3px", background: "#edf2f7", borderRadius: "2px" }}>
                      <div style={{ height: "100%", width: `${rate}%`, background: confColor(rate), borderRadius: "2px", transition: "width 0.5s ease" }} />
                    </div>
                  )}
                  {avgConf != null && <div style={{ fontSize: "11px", color: "#a0aec0", marginTop: "1px" }}>Avg conf: {avgConf}%</div>}
                </div>
              );
            })}
            {Object.keys(scores).length === 0 && <div style={{ fontSize: "12px", color: "#a0aec0" }}>No framework data yet. Complete analyses and record outcomes to build scorecards.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
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
  const [contexts, setContexts]               = useState(loadContexts);
  const [currentContextId, setCurrentContextId] = useState(null);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [journalOutcome, setJournalOutcome]   = useState("");
  const [pendingEntry, setPendingEntry]       = useState(null);
  const [missingInfo, setMissingInfo]         = useState(null);
  const [isAsking, setIsAsking]               = useState(false);
  const [infoStatus, setInfoStatus]           = useState("");
  const textRef = useRef(null);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; background: #f0f2f5; }
      .light-theme { background: #f0f2f5 !important; color: #1a1a2e !important; }
      .light-theme .card { background: #ffffff !important; border-color: #e2e8f0 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important; }
      .light-theme .card-title { color: #1a1a2e !important; }
      .light-theme .card-text { color: #2d3748 !important; }
      body, .light-theme, .light-theme * { font-size: 16px !important; line-height: 1.7 !important; }
      .light-theme h1 { font-size: 28px !important; }
      .light-theme h2 { font-size: 22px !important; }
      .light-theme h3 { font-size: 18px !important; }
      .light-theme .small-text { font-size: 14px !important; }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      @keyframes spin { to{transform:rotate(360deg)} }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: #e2e8f0; }
      ::-webkit-scrollbar-thumb { background: #a0aec0; border-radius: 4px; }
      textarea:focus, input:focus { outline: none; }
      textarea { caret-color: #6366f1; }
      .fw-pill { transition: all 0.15s ease; cursor: pointer; }
      .fw-pill:hover { transform: scale(1.02); }
      .answer-input { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; color: #1a1a2e; font-size: 14px; font-family: 'Inter', sans-serif; width: 100%; }
      .answer-input:focus { border-color: #6366f1; outline: none; }
      .context-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-right: 4px; }
    `;
    document.head.appendChild(s);
    document.body.classList.add('light-theme');
    return () => {
      document.head.removeChild(s);
      document.body.classList.remove('light-theme');
    };
  }, []);

  // ─── CONTEXT MANAGEMENT ──────────────────────────────────────────────────────
  const getCurrentContext = useCallback(() => {
    if (currentContextId && contexts[currentContextId]) {
      return contexts[currentContextId];
    }
    return null;
  }, [currentContextId, contexts]);

  const createNewContext = useCallback((q, type) => {
    const newContext = createContext(q, type);
    const updated = { ...contexts, [newContext.id]: newContext };
    setContexts(updated);
    saveContexts(updated);
    setCurrentContextId(newContext.id);
    return newContext;
  }, [contexts]);

  const updateContextAnswers = useCallback((id, newAnswers) => {
    if (!contexts[id]) return;
    const updated = {
      ...contexts,
      [id]: {
        ...contexts[id],
        answers: { ...contexts[id].answers, ...newAnswers },
        updated: Date.now(),
      }
    };
    setContexts(updated);
    saveContexts(updated);
  }, [contexts]);

  const deleteContext = useCallback((id) => {
    const updated = { ...contexts };
    delete updated[id];
    setContexts(updated);
    saveContexts(updated);
    if (currentContextId === id) {
      const keys = Object.keys(updated);
      setCurrentContextId(keys.length > 0 ? keys[0] : null);
    }
  }, [contexts, currentContextId]);

  const getContextList = useCallback(() => {
    return Object.values(contexts).sort((a, b) => b.updated - a.updated);
  }, [contexts]);

  const reset = useCallback(() => {
    setActivePhase(null); setCompletedPhases({}); setPhaseData({});
    setActiveFwId(null); setSelectedFwIds([]); setFwResults({}); setFwLoading({});
    setIsRunning(false); setHasRun(false); setManualType(null);
    setShowJournalForm(false); setPendingEntry(null); setJournalOutcome("");
    setMissingInfo(null); setIsAsking(false); setInfoStatus("");
  }, []);

  const submitAnswers = useCallback(() => {
    const currentAnswers = {};
    missingInfo?.forEach(field => {
      const input = document.getElementById(`answer_${field.id}`);
      if (input) {
        currentAnswers[field.id] = input.value;
      }
    });

    // Update the current context
    if (currentContextId) {
      updateContextAnswers(currentContextId, currentAnswers);
    }

    const context = getCurrentContext();
    const category = context ? context.type : classifyProblemType(question);
    const allAnswers = context ? context.answers : currentAnswers;
    const missing = detectMissingInfo(category, allAnswers);

    if (missing.length === 0) {
      setMissingInfo(null);
      setIsAsking(false);
      setInfoStatus("✅ All information collected! Running analysis...");
      const fullQuestion = context ? context.question : question;
      runFullAnalysis(fullQuestion, category, allAnswers);
    } else {
      setMissingInfo(missing);
      setInfoStatus(`📋 ${missing.length} more questions needed:`);
    }
  }, [missingInfo, currentContextId, updateContextAnswers, getCurrentContext, question]);

  const runFullAnalysis = useCallback(async (q, category, answers) => {
    const answerContext = Object.entries(answers)
      .filter(([_, value]) => value && value.trim() !== "")
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
    const fullQuestion = `${q}\n\nUser context:\n${answerContext}`;

    setIsRunning(true);
    setHasRun(true);
    const col = {};

    setActivePhase("research");
    let researchData;
    try {
      const raw = await callClaude(
        RESEARCH_SYSTEM,
        `Question / Problem: "${fullQuestion}"\n\nSearch for relevant evidence now.`,
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

    await sleep(300);

    setActivePhase("reality");
    let realityData;
    try {
      const raw = await callClaude(
        REALITY_SYSTEM,
        `Question: "${fullQuestion}"\n\nResearch data:\n${JSON.stringify(researchData)}\n\nExtract reality now.`
      );
      realityData = safeJSON(raw, {
        facts: researchData.facts, assumptions: researchData.assumptions,
        unknowns: researchData.unknowns, problem_type: category,
        recommended_frameworks: FRAMEWORK_SELECTION[category] || ["first_principles","taleb","bayes","inversion","kahneman"],
        extraction_confidence: 40
      });
    } catch (e) {
      realityData = { facts: [], assumptions: [], unknowns: [], problem_type: category, recommended_frameworks: FRAMEWORK_SELECTION[category] || ["first_principles","taleb","bayes","inversion","kahneman"], extraction_confidence: 35 };
    }
    if (manualProblemType) realityData.problem_type = manualProblemType;
    col.reality = realityData;
    setPhaseData(p => ({ ...p, reality: realityData }));
    setCompletedPhases(c => ({ ...c, reality: true }));

    const fws = ALL_FRAMEWORKS.filter(f => (realityData.recommended_frameworks || []).includes(f.id));
    setSelectedFwIds(fws.map(f => f.id));
    if (fws.length > 0) setActiveFwId(fws[0].id);

    setActivePhase("analysis");
    const loadInit = {};
    fws.forEach(f => { loadInit[f.id] = true; });
    setFwLoading(loadInit);

    const fwRes = {};
    for (let i = 0; i < fws.length; i++) {
      const fw = fws[i];
      try {
        if (i > 0) await sleep(1500);
        const raw = await callClaude(
          fw.prompt,
          `Problem: "${fullQuestion}"\n\nVERIFIED FACTS:\n${JSON.stringify(researchData.facts)}\n\nSources: ${JSON.stringify(researchData.sources)}\n\nASSUMPTIONS:\n${JSON.stringify(realityData.assumptions)}\n\nUNKNOWNS:\n${JSON.stringify(realityData.unknowns)}\n\nUSER CONTEXT:\n${answerContext}\n\nApply your framework now.`
        );
        fwRes[fw.id] = safeJSON(raw, { key_claim: raw.slice(0, 200), confidence: 40, evidence: [], counterarguments: [], unknowns: [], recommendation: "" });
      } catch (e) {
        fwRes[fw.id] = { key_claim: `Error: ${e.message}`, confidence: 0, evidence: [], counterarguments: [], unknowns: [], recommendation: "" };
      }
      setFwResults(prev => ({ ...prev, [fw.id]: fwRes[fw.id] }));
      setFwLoading(prev => ({ ...prev, [fw.id]: false }));
    }

    col.frameworks = fwRes;
    setCompletedPhases(c => ({ ...c, analysis: true }));

    const avgFwConf = Object.values(fwRes).reduce((sum, r) => sum + (r?.confidence || 0), 0) / (Object.keys(fwRes).length || 1);
    const updatedScores = recordFrameworkUse(scores, fws.map(f => f.id), avgFwConf);
    setScores(updatedScores);
    saveScores(updatedScores);

    await sleep(300);

    setActivePhase("crossexam");
    let crossData;
    try {
      const summary = fws.map(fw => {
        const r = fwRes[fw.id];
        return `${fw.label}: claim="${r?.key_claim || ""}" conf=${r?.confidence || 0} rec="${r?.recommendation || ""}"`;
      }).join("\n");
      const raw = await callClaude(CROSS_EXAM_SYSTEM, `Problem: "${fullQuestion}"\n\nFramework results:\n${summary}\n\nRun cross-examination now.`);
      crossData = safeJSON(raw, { attacks: [], upgraded_claims: [], downgraded_claims: [], consensus: [], major_disagreements: [], agreement_score: 50, conflict_score: 50, hidden_insight: "" });
    } catch (e) {
      crossData = { attacks: [], upgraded_claims: [], downgraded_claims: [], consensus: [], major_disagreements: [], agreement_score: 50, conflict_score: 50, hidden_insight: "" };
    }
    col.crossexam = crossData;
    setPhaseData(p => ({ ...p, crossexam: crossData }));
    setCompletedPhases(c => ({ ...c, crossexam: true }));

    await sleep(300);

    setActivePhase("redteam");
    let redData;
    try {
      const topRec = crossData?.consensus?.[0]?.recommendation || Object.values(fwRes)[0]?.recommendation || "proceed with the plan";
      const raw = await callClaude(RED_TEAM_SYSTEM, `Problem: "${fullQuestion}"\nTop Recommendation: "${topRec}"\n\nRed team this now.`);
      redData = safeJSON(raw, { failure_modes: [], early_warning_signals: [], risk_severity: [], mitigation_plan: [], kill_shot: "Unknown", survivability: "Conditional", survivability_condition: "" });
    } catch (e) {
      redData = { failure_modes: [], early_warning_signals: [], risk_severity: [], mitigation_plan: [], kill_shot: "", survivability: "Conditional", survivability_condition: "" };
    }
    col.redteam = redData;
    setPhaseData(p => ({ ...p, redteam: redData }));
    setCompletedPhases(c => ({ ...c, redteam: true }));

    await sleep(300);

    setActivePhase("synthesis");
    let synthData;
    try {
      const payload = { question: fullQuestion, research: col.research, reality: col.reality, frameworks: Object.entries(fwRes).map(([id, r]) => ({ framework: id, ...r })), crossexam: crossData, redteam: redData };
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
      problem_type: category,
      reasoning: synthData?.why?.join("; ") || "",
      framework_ids: fws.map(f => f.id),
      outcome: null,
      accuracy: null,
    });

    setActivePhase("synthesis");
    setIsRunning(false);
    setInfoStatus("");
  }, [scores, manualProblemType]);

  const startAnalysis = useCallback(async () => {
    if (!question.trim() || isRunning) return;
    reset();

    const q = question.trim();
    const type = classifyProblemType(q);

    // Check if we have an existing context for this question type
    let context = getCurrentContext();
    if (!context || context.type !== type) {
      // Create a new context
      context = createNewContext(q, type);
    } else {
      // Update the question if it changed
      if (context.question !== q) {
        const updated = { ...contexts, [context.id]: { ...context, question: q, updated: Date.now() } };
        setContexts(updated);
        saveContexts(updated);
      }
    }

    const allAnswers = context ? context.answers : {};
    const missing = detectMissingInfo(type, allAnswers);

    if (missing.length > 0) {
      setMissingInfo(missing);
      setIsAsking(true);
      setInfoStatus(`📋 To give you a reliable recommendation, I need some information:`);
    } else {
      setInfoStatus("✅ All information collected! Running analysis...");
      await runFullAnalysis(q, type, allAnswers);
    }
  }, [question, isRunning, reset, runFullAnalysis, getCurrentContext, createNewContext, contexts]);

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
  const contextList = getContextList();
  const currentContext = getCurrentContext();

  if (view === "journal") {
    return <JournalView journal={journal} scores={scores} onBack={() => setView("main")} onUpdateOutcome={updateOutcome} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", color: "#1a1a2e", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ borderBottom: "1px solid #e2e8f0", padding: "10px 18px", display: "flex", alignItems: "center", gap: "12px", background: "#ffffff", flexShrink: 0 }}>
        <div style={{ width: "32px", height: "32px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>🧩</div>
        <div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#1a1a2e", letterSpacing: "-0.02em" }}>Thinking OS <span style={{ color: "#6366f1", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>v2</span></div>
          <div style={{ fontSize: "11px", color: "#718096", letterSpacing: "0.06em" }}>DECISION INTELLIGENCE · EVIDENCE-FIRST</div>
        </div>

        {/* ─── CONTEXT SWITCHER ──────────────────────────────────────────────── */}
        {contextList.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "10px", flexShrink: 0, overflowX: "auto" }}>
            <span style={{ fontSize: "10px", color: "#718096", fontWeight: "600" }}>Context:</span>
            {contextList.map(c => (
              <button
                key={c.id}
                onClick={() => setCurrentContextId(c.id)}
                style={{
                  padding: "2px 10px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: "600",
                  border: `1px solid ${currentContextId === c.id ? "#6366f1" : "#e2e8f0"}`,
                  background: currentContextId === c.id ? "#6366f118" : "transparent",
                  color: currentContextId === c.id ? "#6366f1" : "#4a5568",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                {c.type === "investment" ? "📈" : c.type === "career" ? "🧭" : c.type === "startup" ? "🚀" : "📋"} {c.question.slice(0, 20)}{c.question.length > 20 ? "…" : ""}
                {c.answers && Object.keys(c.answers).length > 0 && ` ✓`}
              </button>
            ))}
            {contextList.length > 1 && (
              <button
                onClick={() => {
                  if (currentContextId && window.confirm("Delete this context?")) {
                    deleteContext(currentContextId);
                  }
                }}
                style={{
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  border: "1px solid #ef444430",
                  background: "transparent",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
          {isRunning && (
            <button onClick={() => setIsRunning(false)} style={{ fontSize: "12px", background: "#ef444412", border: "1px solid #ef444435", borderRadius: "5px", padding: "4px 12px", cursor: "pointer", color: "#ef4444", fontFamily: "'Inter',sans-serif", fontWeight: "600" }}>⏹ Cancel</button>
          )}
          {hasRun && !isRunning && synthesis && (
            <button onClick={() => exportMarkdown(question, phaseData, fwResults, selectedFwIds)} style={{ fontSize: "12px", background: "#6366f112", border: "1px solid #6366f130", borderRadius: "5px", padding: "4px 12px", cursor: "pointer", color: "#6366f1", fontFamily: "'Inter',sans-serif", fontWeight: "600" }}>↓ Export MD</button>
          )}
          {hasRun && pendingEntry && !showJournalForm && (
            <button onClick={() => setShowJournalForm(true)} style={{ fontSize: "12px", background: "#f1c40f12", border: "1px solid #f1c40f30", borderRadius: "5px", padding: "4px 12px", cursor: "pointer", color: "#b7791f", fontFamily: "'Inter',sans-serif", fontWeight: "600" }}>+ Journal</button>
          )}
          <button onClick={() => setView("journal")} style={{ fontSize: "12px", background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: "5px", padding: "4px 12px", cursor: "pointer", color: "#4a5568", fontFamily: "'Inter',sans-serif" }}>📓 {journal.length}</button>
          {hasRun && <button onClick={reset} style={{ fontSize: "12px", background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: "5px", padding: "4px 12px", cursor: "pointer", color: "#718096", fontFamily: "'Inter',sans-serif" }}>↺ Reset</button>}
        </div>
      </div>

      {/* ─── CONTEXT SUMMARY ────────────────────────────────────────────────── */}
      {currentContext && (
        <div style={{ padding: "6px 18px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "12px", color: "#475569", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <span style={{ fontWeight: "600" }}>📋 Context:</span>
          <span style={{ fontWeight: "500" }}>“{currentContext.question.slice(0, 60)}{currentContext.question.length > 60 ? "…" : ""}”</span>
          <span style={{ background: "#e2e8f0", padding: "1px 8px", borderRadius: "12px", fontSize: "10px" }}>
            {currentContext.type}
          </span>
          <span style={{ fontSize: "10px", color: "#94a3b8" }}>
            {Object.keys(currentContext.answers).filter(k => currentContext.answers[k] && currentContext.answers[k].trim() !== "").length} fields filled
          </span>
          {currentContext.answers && Object.keys(currentContext.answers).length > 0 && (
            <button
              onClick={() => {
                // Show a mini editor for context
                const fields = Object.keys(currentContext.answers).filter(k => currentContext.answers[k] && currentContext.answers[k].trim() !== "");
                if (fields.length === 0) return;
                const fieldList = fields.map(k => `${k}: ${currentContext.answers[k]}`).join("\n");
                const newVal = prompt("Edit your context information (format: field: value, one per line):", fieldList);
                if (newVal) {
                  const updates = {};
                  newVal.split("\n").forEach(line => {
                    const parts = line.split(":");
                    if (parts.length >= 2) {
                      updates[parts[0].trim()] = parts.slice(1).join(":").trim();
                    }
                  });
                  if (Object.keys(updates).length > 0) {
                    updateContextAnswers(currentContext.id, updates);
                  }
                }
              }}
              style={{
                fontSize: "10px",
                background: "transparent",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
                padding: "2px 8px",
                cursor: "pointer",
                color: "#6366f1",
                fontFamily: "'Inter', sans-serif"
              }}
            >
              ✏️ Edit
            </button>
          )}
        </div>
      )}

      {!hasRun && !isAsking && (
        <div style={{ padding: "30px 20px 0", flexShrink: 0 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px 20px" }}>
            <div style={{ fontSize: "13px", color: "#4a5568", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "10px" }}>
              QUESTION OR DECISION
              {currentContext && <span style={{ fontWeight: "400", color: "#94a3b8", fontSize: "11px" }}> — continuing conversation</span>}
            </div>
            <textarea
              ref={textRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) startAnalysis(); }}
              placeholder="Describe the problem, decision, or question you need to think through…"
              rows={3}
              style={{ width: "100%", background: "#f7fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", color: "#1a1a2e", fontSize: "16px", fontFamily: "'Inter', sans-serif", resize: "none", lineHeight: "1.65" }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#718096", fontWeight: "600", letterSpacing: "0.08em" }}>TYPE (optional)</span>
                {PROBLEM_TYPES.map(pt => (
                  <button key={pt.id} onClick={() => setManualType(manualProblemType === pt.id ? null : pt.id)} style={{
                    padding: "3px 10px", borderRadius: "4px",
                    border: `1px solid ${manualProblemType === pt.id ? "#6366f1" : "#e2e8f0"}`,
                    background: manualProblemType === pt.id ? "#6366f118" : "transparent",
                    color: manualProblemType === pt.id ? "#6366f1" : "#4a5568",
                    fontSize: "12px", fontFamily: "'Inter',sans-serif", cursor: "pointer"
                  }}>{pt.icon} {pt.label}</button>
                ))}
              </div>
              <button onClick={startAnalysis} disabled={!question.trim()} style={{
                background: question.trim() ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#edf2f7",
                border: "none", borderRadius: "8px", padding: "10px 24px",
                color: question.trim() ? "#fff" : "#a0aec0", fontSize: "14px", fontWeight: "600",
                cursor: question.trim() ? "pointer" : "not-allowed", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap"
              }}>Analyze →</button>
            </div>
            <div style={{ fontSize: "12px", color: "#a0aec0", marginTop: "8px" }}>
              ⌘+Enter to run · Web search: {ENABLE_WEB_SEARCH ? "✅ ON" : "❌ OFF"} · Auto-selects frameworks
              {currentContext && ` · 📋 ${Object.keys(currentContext.answers).filter(k => currentContext.answers[k] && currentContext.answers[k].trim() !== "").length} fields saved`}
            </div>
          </div>

          <div style={{ padding: "30px 0", textAlign: "center" }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🧩</div>
            <div style={{ color: "#718096", fontSize: "14px", maxWidth: "480px", margin: "0 auto", lineHeight: "1.8" }}>
              Research → Reality Extraction → Framework Analysis → Cross-Examination → Red Team → Decision Synthesis
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center", marginTop: "12px", maxWidth: "520px", margin: "12px auto 0" }}>
              {ALL_FRAMEWORKS.map(f => (
                <div key={f.id} style={{ padding: "3px 10px", background: `${f.color}10`, border: `1px solid ${f.color}22`, borderRadius: "20px", fontSize: "11px", color: f.color }}>
                  {f.icon} {f.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── ADAPTIVE QUESTIONING UI ────────────────────────────────────────── */}
      {isAsking && missingInfo && !hasRun && (
        <div style={{ padding: "20px", flex: 1, overflowY: "auto" }}>
          <div style={{ background: "#ffffff", border: "1px solid #6366f1", borderRadius: "14px", padding: "24px", maxWidth: "700px", margin: "0 auto" }}>
            <div style={{ fontSize: "14px", color: "#1a1a2e", marginBottom: "16px" }}>
              <span style={{ fontWeight: "700", color: "#6366f1" }}>📋 {infoStatus}</span>
              {currentContext && (
                <span style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginTop: "4px" }}>
                  Context: {currentContext.question.slice(0, 50)}…
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {missingInfo.map((field, index) => (
                <div key={field.id}>
                  <label style={{ fontSize: "14px", fontWeight: "600", color: "#4a5568", display: "block", marginBottom: "4px" }}>
                    {index + 1}. {field.label}
                  </label>
                  <input
                    id={`answer_${field.id}`}
                    type={field.type === "number" ? "number" : "text"}
                    placeholder={`Enter your ${field.label.toLowerCase()}`}
                    className="answer-input"
                    defaultValue={currentContext?.answers?.[field.id] || ""}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={submitAnswers}
              style={{
                marginTop: "20px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                borderRadius: "8px",
                padding: "12px 30px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                width: "100%"
              }}
            >
              Submit Answers → Continue Analysis
            </button>
            <div style={{ fontSize: "12px", color: "#a0aec0", marginTop: "8px", textAlign: "center" }}>
              Your answers will be saved in the context. You can edit them anytime.
            </div>
          </div>
        </div>
      )}

      {hasRun && (
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          <div style={{ width: "220px", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden", background: "#ffffff" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0", fontSize: "12px", color: "#718096", lineHeight: "1.5", fontStyle: "italic" }}>
              "{question.slice(0, 70)}{question.length > 70 ? "…" : ""}"
            </div>
            <div style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "2px" }}>
              {PHASES.filter(ph => ph.id !== "analysis").map(ph => (
                <button key={ph.id} onClick={() => setActiveFwId("__" + ph.id)} style={{
                  background: "#f7fafc",
                  border: `1px solid ${completedPhases[ph.id] ? ph.color + "55" : "#e2e8f0"}`,
                  borderRadius: "6px", padding: "6px 10px", cursor: "pointer", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "8px", transition: "all 0.15s ease"
                }}>
                  <span style={{ fontSize: "14px" }}>
                    {completedPhases[ph.id] ? "✓" : activePhase === ph.id ? <Spinner color={ph.color} /> : ph.icon}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: completedPhases[ph.id] ? ph.color : "#4a5568" }}>{ph.label}</span>
                </button>
              ))}
            </div>
            <div style={{ padding: "6px 10px 3px", fontSize: "11px", color: "#a0aec0", letterSpacing: "0.08em", fontWeight: "600" }}>FRAMEWORKS</div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
              {selectedFwIds.map(fid => {
                const fw = ALL_FRAMEWORKS.find(f => f.id === fid);
                if (!fw) return null;
                const res = fwResults[fid];
                const loading = fwLoading[fid];
                const isActive = activeFrameworkId === fid;
                return (
                  <button key={fid} onClick={() => setActiveFwId(fid)} style={{
                    background: isActive ? `${fw.color}18` : "#f7fafc",
                    border: `1px solid ${isActive ? fw.color : "#e2e8f0"}`,
                    borderRadius: "6px", padding: "6px 10px", cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", gap: "8px", transition: "all 0.15s ease"
                  }}>
                    <span style={{ fontSize: "16px", flexShrink: 0 }}>{fw.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: "600", color: isActive ? fw.accent : "#4a5568", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fw.label}</div>
                      {res && <div style={{ fontSize: "11px", color: confColor(res.confidence), marginTop: "1px" }}>{res.confidence}%</div>}
                    </div>
                    {loading && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: fw.accent, animation: "pulse 1s infinite", flexShrink: 0 }} />}
                    {res && !loading && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", minWidth: 0, background: "#f0f2f5" }}>
            {showJournalForm && (
              <div style={{ background: "#fefcbf", border: "1px solid #f6e05e", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", animation: "fadeUp 0.3s ease" }}>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#744210", marginBottom: "6px" }}>📓 Save to Decision Journal</div>
                <input value={journalOutcome} onChange={e => setJournalOutcome(e.target.value)} placeholder="What outcome are you expecting / betting on?" style={{ width: "100%", background: "#fffff0", border: "1px solid #ecc94b", borderRadius: "6px", padding: "6px 12px", color: "#1a1a2e", fontSize: "14px", fontFamily: "'Inter',sans-serif" }} />
                <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                  <button onClick={saveToJournal} style={{ background: "#f6e05e", border: "1px solid #ecc94b", borderRadius: "6px", padding: "5px 14px", cursor: "pointer", color: "#744210", fontSize: "12px", fontWeight: "600", fontFamily: "'Inter',sans-serif" }}>Save Entry</button>
                  <button onClick={() => setShowJournalForm(false)} style={{ background: "transparent", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "5px 12px", cursor: "pointer", color: "#718096", fontSize: "12px", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
                </div>
              </div>
            )}

            {synthesis && (
              <div style={{ background: insufficientInfo ? "#fff5f5" : "#fffff0", border: `1px solid ${insufficientInfo ? "#feb2b2" : "#f6e05e"}`, borderRadius: "12px", padding: "18px 22px", marginBottom: "18px", animation: "fadeUp 0.4s ease" }}>
                {insufficientInfo ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <div style={{ fontSize: "13px", color: "#c53030", fontWeight: "700", letterSpacing: "0.08em" }}>⛔ INSUFFICIENT INFORMATION — DO NOT DECIDE YET</div>
                      <ConfidenceBadge value={synthesis.confidence} />
                    </div>
                    <div style={{ fontSize: "15px", color: "#4a5568", marginBottom: "12px" }}>{synthesis.recommendation}</div>
                    {synthesis.missing_information?.length > 0 && (
                      <div style={{ marginBottom: "8px" }}>
                        <div style={{ fontSize: "12px", color: "#718096", fontWeight: "600", letterSpacing: "0.1em", marginBottom: "5px" }}>MISSING INFORMATION</div>
                        {synthesis.missing_information.map((m, i) => <div key={i} style={{ fontSize: "14px", color: "#c53030", marginBottom: "3px" }}>· {m}</div>)}
                      </div>
                    )}
                    {synthesis.recommended_research?.length > 0 && (
                      <div>
                        <div style={{ fontSize: "12px", color: "#718096", fontWeight: "600", letterSpacing: "0.1em", marginBottom: "5px" }}>RECOMMENDED RESEARCH</div>
                        {synthesis.recommended_research.map((r, i) => <div key={i} style={{ fontSize: "14px", color: "#2b6cb0", marginBottom: "3px" }}>→ {r}</div>)}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", color: "#718096", fontWeight: "600", letterSpacing: "0.1em", marginBottom: "4px" }}>FINAL DECISION</div>
                        <div style={{ fontSize: "20px", fontWeight: "700", color: "#1a1a2e", lineHeight: "1.4" }}>{synthesis.recommendation}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px", flexShrink: 0 }}>
                        <ConfidenceBadge value={synthesis.confidence} />
                        <span style={{
                          fontSize: "12px", fontWeight: "700", padding: "2px 10px", borderRadius: "4px",
                          background: synthesis.risk_level === "High" ? "#ef444415" : synthesis.risk_level === "Medium" ? "#f59e0b15" : "#22c55e15",
                          color: synthesis.risk_level === "High" ? "#ef4444" : synthesis.risk_level === "Medium" ? "#f59e0b" : "#22c55e",
                          border: `1px solid ${synthesis.risk_level === "High" ? "#ef444430" : synthesis.risk_level === "Medium" ? "#f59e0b30" : "#22c55e30"}`
                        }}>{synthesis.risk_level} RISK</span>
                      </div>
                    </div>

                    {synthesis.confidence_reasoning?.length > 0 && (
                      <div style={{ background: "#f7fafc", borderRadius: "6px", padding: "8px 12px", marginBottom: "12px" }}>
                        <div style={{ fontSize: "11px", color: "#718096", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "4px" }}>CONFIDENCE REASONING</div>
                        {synthesis.confidence_reasoning.map((r, i) => <div key={i} style={{ fontSize: "13px", color: "#4a5568", marginBottom: "2px" }}>· {r}</div>)}
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                      <MiniSection title="WHY" items={synthesis.why} color="#2b6cb0" />
                      <MiniSection title="TOP RISKS" items={synthesis.top_risks} color="#c53030" />
                      <MiniSection title="WHAT WOULD CHANGE THIS (+)" items={synthesis.what_would_change_positive} color="#276749" />
                      <MiniSection title="WHAT WOULD CHANGE THIS (−)" items={synthesis.what_would_change_negative} color="#c05621" />
                    </div>

                    {synthesis.next_actions?.length > 0 && (
                      <div>
                        <div style={{ fontSize: "11px", color: "#718096", fontWeight: "600", letterSpacing: "0.1em", marginBottom: "6px" }}>NEXT ACTIONS</div>
                        {synthesis.next_actions.slice(0, 5).map((a, i) => (
                          <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "4px" }}>
                            <span style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "#6366f1", fontWeight: "700", flexShrink: 0, marginTop: "2px" }}>{String(i + 1).padStart(2, "0")}</span>
                            <span style={{ fontSize: "14px", color: "#4a5568", lineHeight: "1.6" }}>{a}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {crossexam && (
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", animation: "fadeUp 0.35s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ fontSize: "12px", color: "#718096", fontWeight: "600", letterSpacing: "0.08em" }}>CONSENSUS ENGINE</div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <span style={{ fontSize: "13px", color: "#22c55e", fontWeight: "600" }}>Agreement {crossexam.agreement_score}%</span>
                    <span style={{ fontSize: "13px", color: "#ef4444", fontWeight: "600" }}>Conflict {crossexam.conflict_score}%</span>
                  </div>
                </div>

                {consensusItems.map((c, i) => (
                  <div key={i} style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontSize: "14px", color: "#1a1a2e" }}>{c.recommendation}</span>
                      <span style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "#718096" }}>{c.support_count}/{selectedFwIds.length}</span>
                    </div>
                    <div style={{ height: "5px", background: "#edf2f7", borderRadius: "3px" }}>
                      <div style={{ height: "100%", width: `${(c.support_count / maxSupport) * 100}%`, background: i === 0 ? "#6366f1" : "#a0aec0", borderRadius: "3px", transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                ))}

                {crossexam.major_disagreements?.length > 0 && (
                  <div style={{ marginTop: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "10px" }}>
                    <div style={{ fontSize: "12px", color: "#ec4899", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "8px" }}>⚡ MAJOR DISAGREEMENTS — Often the most valuable insight</div>
                    {crossexam.major_disagreements.map((d, i) => (
                      <div key={i} style={{ marginBottom: "8px", padding: "8px 12px", background: "#fdf2f8", border: "1px solid #fbb6ce", borderRadius: "6px" }}>
                        <div style={{ fontSize: "12px", color: "#d53f8c", fontWeight: "600", marginBottom: "3px" }}>{d.framework_a} vs {d.framework_b}</div>
                        <div style={{ fontSize: "14px", color: "#4a5568", marginBottom: "3px" }}>{d.disagreement}</div>
                        {d.why_this_matters && <div style={{ fontSize: "13px", color: "#718096" }}>Why it matters: {d.why_this_matters}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {crossexam.hidden_insight && (
                  <div style={{ marginTop: "10px", padding: "8px 12px", background: "#fefcbf", border: "1px solid #f6e05e", borderRadius: "6px", fontSize: "14px", color: "#744210" }}>
                    💡 {crossexam.hidden_insight}
                  </div>
                )}
              </div>
            )}

            {redteam && (
              <div style={{ background: "#ffffff", border: "1px solid #feb2b2", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", animation: "fadeUp 0.35s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ fontSize: "12px", color: "#718096", fontWeight: "600", letterSpacing: "0.08em" }}>RED TEAM REVIEW</div>
                  <span style={{
                    fontSize: "12px", fontWeight: "700", padding: "2px 10px", borderRadius: "4px",
                    background: redteam.survivability === "Yes" ? "#22c55e15" : redteam.survivability === "No" ? "#ef444415" : "#f59e0b15",
                    color: redteam.survivability === "Yes" ? "#22c55e" : redteam.survivability === "No" ? "#ef4444" : "#f59e0b",
                    border: `1px solid ${redteam.survivability === "Yes" ? "#22c55e30" : redteam.survivability === "No" ? "#ef444430" : "#f59e0b30"}`
                  }}>Survives: {redteam.survivability}</span>
                </div>

                {redteam.kill_shot && <div style={{ fontSize: "14px", color: "#c53030", fontWeight: "600", marginBottom: "10px" }}>☠ Kill shot: {redteam.kill_shot}</div>}

                {(redteam.failure_modes || []).slice(0, 5).map((fm, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "7px", padding: "8px 12px", background: "#f7fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <SeverityBadge severity={fm.severity} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", color: "#1a1a2e", fontWeight: "500" }}>{fm.mode}</div>
                      {fm.warning_signal && <div style={{ fontSize: "13px", color: "#718096", marginTop: "2px" }}>⚡ {fm.warning_signal}</div>}
                      {fm.mitigation && <div style={{ fontSize: "13px", color: "#2b6cb0", marginTop: "2px" }}>🛡 {fm.mitigation}</div>}
                    </div>
                  </div>
                ))}

                {redteam.mitigation_plan?.length > 0 && (
                  <div style={{ marginTop: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "10px" }}>
                    <div style={{ fontSize: "11px", color: "#718096", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "6px" }}>MITIGATION PLAN</div>
                    {redteam.mitigation_plan.slice(0, 4).map((m, i) => (
                      <div key={i} style={{ marginBottom: "5px", display: "flex", gap: "10px" }}>
                        <span style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "#c53030", flexShrink: 0, marginTop: "2px" }}>{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <div style={{ fontSize: "14px", color: "#4a5568" }}>{m.risk}</div>
                          <div style={{ fontSize: "13px", color: "#2b6cb0" }}>→ {m.action}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {research && (
              <div style={{ background: "#ffffff", border: "1px solid #68d391", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ fontSize: "12px", color: "#718096", fontWeight: "600", letterSpacing: "0.08em" }}>🔎 RESEARCH LAYER</div>
                  <ConfidenceBadge value={research.research_confidence} small />
                </div>
                {research.research_summary && <div style={{ fontSize: "14px", color: "#4a5568", marginBottom: "10px", fontStyle: "italic" }}>{research.research_summary}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#22c55e", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "4px" }}>FACTS ✓</div>
                    {(!research.facts?.length) ? <div style={{ fontSize: "13px", color: "#a0aec0" }}>None found</div>
                      : research.facts.slice(0, 5).map((f, i) => <div key={i} style={{ fontSize: "13px", color: "#2d3748", lineHeight: "1.6", marginBottom: "3px" }}>· {f}</div>)}
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#f59e0b", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "4px" }}>SOURCES</div>
                    {(!research.sources?.length) ? <div style={{ fontSize: "13px", color: "#a0aec0" }}>None</div>
                      : research.sources.slice(0, 5).map((s, i) => <div key={i} style={{ fontSize: "13px", color: "#2d3748", lineHeight: "1.6", marginBottom: "3px" }}>· {s}</div>)}
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#ef4444", fontWeight: "600", letterSpacing: "0.08em", marginBottom: "4px" }}>UNKNOWNS ?</div>
                    {(!research.unknowns?.length) ? <div style={{ fontSize: "13px", color: "#a0aec0" }}>None</div>
                      : research.unknowns.slice(0, 5).map((u, i) => <div key={i} style={{ fontSize: "13px", color: "#2d3748", lineHeight: "1.6", marginBottom: "3px" }}>· {u}</div>)}
                  </div>
                </div>
              </div>
            )}

            {reality && (
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ fontSize: "12px", color: "#718096", fontWeight: "600", letterSpacing: "0.08em" }}>REALITY EXTRACTION</div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {reality.problem_type && (
                      <span style={{ fontSize: "12px", background: "#6366f112", border: "1px solid #6366f128", borderRadius: "4px", padding: "2px 8px", color: "#6366f1" }}>
                        {PROBLEM_TYPES.find(p => p.id === reality.problem_type)?.icon} {reality.problem_type}
                      </span>
                    )}
                    <ConfidenceBadge value={reality.extraction_confidence} small />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  {[
                    { title: "FACTS ✓", items: reality.facts, color: "#22c55e" },
                    { title: "ASSUMPTIONS ~", items: reality.assumptions, color: "#f59e0b" },
                    { title: "UNKNOWNS ?", items: reality.unknowns, color: "#ef4444" },
                  ].map(({ title, items, color }) => (
                    <div key={title}>
                      <div style={{ fontSize: "11px", color, fontWeight: "600", letterSpacing: "0.08em", marginBottom: "4px" }}>{title}</div>
                      {(!items?.length) ? <div style={{ fontSize: "13px", color: "#a0aec0" }}>None</div>
                        : items.slice(0, 4).map((item, i) => <div key={i} style={{ fontSize: "13px", color: "#2d3748", lineHeight: "1.6", marginBottom: "3px" }}>· {item}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeFrameworkId && !activeFrameworkId.startsWith("__") && activeFw && (
              <div style={{ background: "#ffffff", border: `1px solid ${activeFw.color}40`, borderRadius: "10px", padding: "16px 20px", animation: "fadeUp 0.3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ width: "36px", height: "36px", background: `${activeFw.color}18`, border: `1px solid ${activeFw.color}35`, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>{activeFw.icon}</div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#1a1a2e" }}>{activeFw.label}</div>
                    <div style={{ fontSize: "12px", color: "#718096" }}>{activeFw.thinker}</div>
                  </div>
                  {activeFwResult && <ConfidenceBadge value={activeFwResult.confidence} />}
                </div>

                {activeFwLoading ? (
                  <LoadingSkeleton color={activeFw.accent} label={`Applying ${activeFw.label} lens…`} />
                ) : activeFwResult ? (
                  <div style={{ animation: "fadeUp 0.3s ease" }}>
                    {activeFwResult.key_claim && (
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ fontSize: "11px", color: "#718096", fontWeight: "600", letterSpacing: "0.1em", marginBottom: "4px" }}>KEY CLAIM</div>
                        <div style={{ fontSize: "15px", color: "#1a1a2e", lineHeight: "1.6", fontWeight: "500" }}>{activeFwResult.key_claim}</div>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <FrameworkList title="EVIDENCE" items={activeFwResult.evidence} color="#2b6cb0" />
                      <FrameworkList title="COUNTERARGUMENTS" items={activeFwResult.counterarguments} color="#c53030" />
                      <FrameworkList title="UNKNOWNS" items={activeFwResult.unknowns} color="#c05621" />
                      {activeFwResult.recommendation && (
                        <div>
                          <div style={{ fontSize: "11px", color: "#718096", fontWeight: "600", letterSpacing: "0.1em", marginBottom: "4px" }}>RECOMMENDATION</div>
                          <div style={{ fontSize: "14px", color: activeFw.accent, lineHeight: "1.6" }}>{activeFwResult.recommendation}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#a0aec0", fontSize: "14px" }}>Waiting to load…</div>
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
