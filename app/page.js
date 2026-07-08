'use client';

import { useState, useRef, useEffect, useCallback } from "react";

// ─── MARKDOWN EXPORT ──────────────────────────────────────────────────────────
function exportMarkdown(question, phaseData, fwResults, selectedFwIds) {
  const { research, reality, crossexam, redteam, evidence, scenario, assumptions, synthesis, proposed, negated } = phaseData;
  const lines = [];
  const safe = (v, fallback = "N/A") => (v === undefined || v === null || v === "" ? fallback : v);
  const pushList = (title, items, mapFn) => {
    if (!items || !items.length) return;
    lines.push(`### ${title}`);
    items.forEach((item, i) => lines.push(mapFn ? mapFn(item, i) : `- ${item}`));
    lines.push(``);
  };

  lines.push(`# Thinking OS — Decision Analysis`);
  lines.push(`**Question:** ${question}`);
  lines.push(`**Date:** ${new Date().toLocaleString()}`);
  lines.push(``);

  // ─── FINAL DECISION ──────────────────────────────────────────────────────
  if (synthesis) {
    lines.push(`## Final Decision`);
    lines.push(`**${safe(synthesis.recommendation)}**`);
    lines.push(`Confidence: ${safe(synthesis.confidence, 0)}% · Risk: ${safe(synthesis.risk_level)}`);
    if (synthesis.consistency) lines.push(`Consistency: ${synthesis.consistency}`);
    if (synthesis.consistencyWarning) lines.push(`⚠️ ${synthesis.consistencyWarning}`);
    lines.push(``);
    pushList("Why", synthesis.why);
    pushList("Top Risks", synthesis.top_risks);
    pushList("What Would Change This (Positive)", synthesis.what_would_change_positive);
    pushList("What Would Change This (Negative)", synthesis.what_would_change_negative);
    pushList("Next Actions", synthesis.next_actions, (a, i) => `${i + 1}. ${a}`);
    pushList("Confidence Reasoning", synthesis.confidence_reasoning);
    pushList("Missing Information", synthesis.missing_information);
    pushList("Recommended Research", synthesis.recommended_research);
  }

  // ─── FORCED "DON'T DO IT" CASE ──────────────────────────────────────────
  if (proposed && negated) {
    lines.push(`## Proposed vs. Negated Comparison`);
    lines.push(``);
    lines.push(`**Proposed Plan:** ${safe(proposed.synthesis?.recommendation)} (Confidence: ${safe(proposed.synthesis?.confidence, 0)}%)`);
    lines.push(`**Negated Plan:** ${safe(negated.synthesis?.recommendation)} (Confidence: ${safe(negated.synthesis?.confidence, 0)}%)`);
    lines.push(``);
    if (synthesis?.comparison) {
      lines.push(`**Comparison:** ${synthesis.comparison}`);
      lines.push(`**Better Plan:** ${synthesis.better_plan}`);
      lines.push(``);
    }
  }

  // ─── RESEARCH ────────────────────────────────────────────────────────────
  if (research) {
    lines.push(`## Research`);
    if (research.research_summary) { lines.push(research.research_summary); lines.push(``); }
    lines.push(`Research Confidence: ${safe(research.research_confidence, 0)}%`);
    lines.push(``);
    pushList("Facts", research.facts);
    pushList("Sources", research.sources);
    pushList("Assumptions", research.assumptions);
    pushList("Unknowns", research.unknowns);
  }

  // ─── REALITY EXTRACTION ──────────────────────────────────────────────────
  if (reality) {
    lines.push(`## Reality Extraction`);
    lines.push(`Problem Type: ${safe(reality.problem_type)} · Extraction Confidence: ${safe(reality.extraction_confidence, 0)}%`);
    lines.push(``);
    pushList("Facts", reality.facts);
    pushList("Assumptions", reality.assumptions);
    pushList("Unknowns", reality.unknowns);
    pushList("Recommended Frameworks", reality.recommended_frameworks);
  }

  // ─── FRAMEWORK ANALYSIS ──────────────────────────────────────────────────
  if (selectedFwIds?.length) {
    lines.push(`## Framework Analysis`);
    lines.push(``);
    selectedFwIds.forEach(id => {
      const fw = ALL_FRAMEWORKS.find(f => f.id === id);
      const r = fwResults?.[id];
      if (!fw) return;
      lines.push(`### ${fw.icon} ${fw.label} (${fw.thinker || ""})`);
      if (r) {
        lines.push(`Confidence: ${safe(r.confidence, 0)}%`);
        if (r.key_claim) lines.push(`**Key Claim:** ${r.key_claim}`);
        if (r.recommendation) lines.push(`**Recommendation:** ${r.recommendation}`);
        pushList("Evidence", r.evidence);
        pushList("Counterarguments", r.counterarguments);
        pushList("Unknowns", r.unknowns);
        if (r.rebuttal) {
          lines.push(`**Rebuttal:** ${safe(r.rebuttal.defense)}${r.rebuttal.concession ? " (Conceded)" : ""}`);
          if (r.rebuttal.updated_confidence != null) lines.push(`Updated Confidence: ${r.rebuttal.updated_confidence}%`);
        }
      } else {
        lines.push(`_No result available._`);
      }
      lines.push(``);
    });
  }

  // ─── CROSS-EXAMINATION ───────────────────────────────────────────────────
  if (crossexam) {
    lines.push(`## Cross-Examination`);
    lines.push(`Agreement: ${safe(crossexam.agreement_score, 0)}% · Conflict: ${safe(crossexam.conflict_score, 0)}%`);
    lines.push(``);
    pushList("Consensus", crossexam.consensus, c => `- ${c.recommendation} (${c.support_count} frameworks: ${(c.framework_names || []).join(", ")})`);
    pushList("Attacks", crossexam.attacks, a => `- ${a.attacker} → ${a.target}: ${a.attack} (${a.verdict})`);
    pushList("Upgraded Claims", crossexam.upgraded_claims);
    pushList("Downgraded Claims", crossexam.downgraded_claims);
    pushList("Major Disagreements", crossexam.major_disagreements, d => `- ${d.framework_a} vs ${d.framework_b}: ${d.disagreement} — ${d.why_this_matters || ""}`);
    if (crossexam.hidden_insight) { lines.push(`**Hidden Insight:** ${crossexam.hidden_insight}`); lines.push(``); }
  }

  // ─── RED TEAM ────────────────────────────────────────────────────────────
  if (redteam) {
    lines.push(`## Red Team`);
    lines.push(`Survivability: ${safe(redteam.survivability)}${redteam.survivability_condition ? ` (${redteam.survivability_condition})` : ""}`);
    if (redteam.kill_shot) lines.push(`Kill Shot: ${redteam.kill_shot}`);
    lines.push(``);
    pushList("Failure Modes", redteam.failure_modes, f => `- [${f.severity}] ${f.mode}${f.warning_signal ? ` — Warning: ${f.warning_signal}` : ""}${f.mitigation ? ` — Mitigation: ${f.mitigation}` : ""}`);
    pushList("Early Warning Signals", redteam.early_warning_signals);
    pushList("Risk Severity", redteam.risk_severity, r => `- ${r.risk} — Severity: ${r.severity}, Probability: ${r.probability}`);
    pushList("Mitigation Plan", redteam.mitigation_plan, m => `- ${m.risk} → ${m.action} (Owner: ${m.owner || "N/A"}, Timeline: ${m.timeline || "N/A"})`);
  }

  // ─── EVIDENCE CHALLENGE ──────────────────────────────────────────────────
  if (evidence) {
    lines.push(`## Evidence Challenge`);
    lines.push(`Evidence Strength Score: ${safe(evidence.evidence_strength_score, 0)}%`);
    if (evidence.evidence_summary) lines.push(evidence.evidence_summary);
    lines.push(``);
    pushList("Major Recommendations", evidence.major_recommendations);
    pushList("Supporting Evidence", evidence.supporting_evidence, e => `- [${e.classification || "N/A"}] ${e.evidence || e}`);
    pushList("Contradicting Evidence", evidence.contradicting_evidence, e => `- [${e.classification || "N/A"}] ${e.evidence || e}`);
    pushList("Missing Evidence", evidence.missing_evidence);
    pushList("Remaining Assumptions", evidence.remaining_assumptions);
  }

  // ─── SCENARIO SIMULATION ─────────────────────────────────────────────────
  if (scenario) {
    lines.push(`## Scenario Simulation`);
    if (scenario.best_case) { lines.push(`### Best Case`); lines.push(JSON.stringify(scenario.best_case)); lines.push(``); }
    if (scenario.most_likely) { lines.push(`### Most Likely`); lines.push(JSON.stringify(scenario.most_likely)); lines.push(``); }
    if (scenario.worst_case) { lines.push(`### Worst Case`); lines.push(JSON.stringify(scenario.worst_case)); lines.push(``); }
    pushList("Sensitive Variables", scenario.sensitive_variables, v => `- ${v.variable || v}: ${v.effect || ""}`);
    pushList("Risk Analysis", scenario.risk_analysis, r => `- ${r.description} — Impact: ${r.impact || "N/A"}, Likelihood: ${r.likelihood || "N/A"}`);
    pushList("Opportunities", scenario.opportunities, o => `- ${o.description} — Upside: ${o.upside || o.expected_upside || "N/A"}`);
    if (scenario.recommendation_stability) {
      lines.push(`**Recommendation Stability:** ${scenario.recommendation_stability.stable ? "Stable" : "Not stable"}${scenario.recommendation_stability.when_to_change ? ` — Change if: ${scenario.recommendation_stability.when_to_change}` : ""}`);
      lines.push(``);
    }
    if (scenario.decision_robustness) {
      lines.push(`**Decision Robustness:** ${safe(scenario.decision_robustness.rating)}`);
      if (scenario.decision_robustness.valid_under) lines.push(`Valid under: ${scenario.decision_robustness.valid_under}`);
      if (scenario.decision_robustness.invalid_under) lines.push(`Invalid under: ${scenario.decision_robustness.invalid_under}`);
      lines.push(``);
    }
    pushList("Monitoring Indicators", scenario.monitoring_indicators);
  }

  // ─── ASSUMPTION MANAGER ──────────────────────────────────────────────────
  if (assumptions) {
    lines.push(`## Assumption Manager`);
    if (assumptions.summary) {
      const s = assumptions.summary;
      lines.push(`Total: ${safe(s.total, 0)} · Verified: ${safe(s.verified, 0)} · Unverified: ${safe(s.unverified, 0)} · Critical: ${safe(s.critical, 0)} · Contradictions: ${safe(s.contradictions, 0)}`);
      lines.push(``);
    }
    pushList("Assumptions", assumptions.assumptions, a => `- [${a.verification_status || "Unknown"}] [${a.criticality || "Medium"}] ${a.statement} — Impact if false: ${a.business_impact || a.impact_if_false || "N/A"}`);
    pushList("Conflicts", assumptions.conflicts, c => `- ${c.assumption_a} vs ${c.assumption_b}: ${c.conflict || ""}`);
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
  startup: ["first_principles", "thiel", "taleb", "porter", "munger", "bezos_day1", "naval_leverage", "christensen_disruption", "collins_flywheel", "senge_systems"],
  career: ["inversion", "kahneman", "bayes", "sun_tzu", "feynman", "drucker_effectiveness", "greene_power", "epictetus_stoic"],
  investment: ["bayes", "taleb", "second_order", "porter", "munger", "buffett_margin_safety", "taleb_black_swan", "keynes_economics", "friedman_free_market"],
  product: ["first_principles", "porter", "feynman", "thiel", "munger", "bezos_day1", "christensen_disruption", "senge_systems", "dawkins_memetic"],
  strategy: ["sun_tzu", "porter", "inversion", "second_order", "thiel", "bezos_day1", "machiavelli_prince", "greene_power", "harari_narrative"],
  personal: ["kahneman", "inversion", "feynman", "bayes", "munger", "epictetus_stoic", "marcus_aurelius", "seneca_stoic", "nietzsche_will_to_power", "camus_absurdism"],
  marketing: ["thiel", "porter", "sun_tzu", "kahneman", "munger", "gladwell_tipping", "thaler_nudge", "greene_seduction"],
  operations: ["inversion", "second_order", "porter", "taleb", "feynman", "senge_systems", "meadows_leverage", "ackoff_idealized"],
  negotiation: ["sun_tzu", "kahneman", "inversion", "taleb", "thiel", "machiavelli_prince", "greene_power", "foucault_power"],
  hiring: ["kahneman", "bayes", "munger", "inversion", "porter", "dawkins_memetic", "harari_narrative"],
};

// ─── ALL FRAMEWORKS (50+) ─────────────────────────────────────────────────────
const ALL_FRAMEWORKS = [
  // ==== ORIGINAL 13 FRAMEWORKS ====
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
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
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
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
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
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
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
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
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
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
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
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
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
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
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
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
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
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
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
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
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
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
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
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
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
Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },

  // ==== NEW FRAMEWORKS (37+) ====
  {
    id: "bezos_day1",
    label: "Bezos: Day 1",
    icon: "📦",
    color: "#f97316",
    accent: "#fb923c",
    thinker: "Jeff Bezos · Amazon",
    relevantFor: ["startup","strategy","product","investment"],
    prompt: `You are Jeff Bezos applying the "Day 1" philosophy. Your framework is built on these principles:

1. CUSTOMER OBSESSION: Start with the customer and work backwards. What would make the customer's life better?

2. LONG-TERM THINKING: Is this decision good for 3-5 years from now? What would a 10-year vision look like?

3. HIGH-VELOCITY DECISION MAKING: Most decisions should be made with 70% of the information. Waiting for 90% is too slow.

4. TWO-PIZZA TEAMS: If a team can't be fed with two pizzas, it's too big. What's the smallest unit that can execute this?

5. FRUGALITY: Constraints breed creativity. What would this look like with 10% of the budget?

6. HYPERSCALING: What happens if this works and suddenly you need to scale 100x overnight?

7. BET ON THE FUTURE: What are you willing to bet your company on? What is the single most important thing that must go right?

CRITICAL RULE: Every point must be specific to this situation. Apply these principles to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "naval_leverage",
    label: "Naval: Leverage",
    icon: "⚡",
    color: "#8b5cf6",
    accent: "#a78bfa",
    thinker: "Naval Ravikant · The Almanack",
    relevantFor: ["startup","career","investment","product"],
    prompt: `You are Naval Ravikant applying his framework on leverage, wealth, and happiness. Your principles:

1. SEEK WEALTH, NOT MONEY: Wealth is assets that earn while you sleep. Money is how we transfer time and wealth.

2. LEVERAGE: Wealth requires leverage. There are three types: Labor (others working for you), Capital (money working for you), and Code/Media (products that work for you without marginal cost).

3. SPECIFIC KNOWLEDGE: You can't be taught this — you find it by pursuing your genuine curiosity and talent. It feels like play to you but work to others.

4. ACCOUNTABILITY: Take risks with your reputation. Put your name on the line.

5. READ TO LEARN: Read what you love until you love to read. Then read everything.

6. COMPOUNDING: Wealth compounds, relationships compound, knowledge compounds.

7. PLAY LONG-TERM GAMES: All returns in life come from compound interest over long time horizons.

Apply these principles to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "christensen_disruption",
    label: "Christensen: Disruption",
    icon: "💥",
    color: "#06b6d4",
    accent: "#22d3ee",
    thinker: "Clayton Christensen · The Innovator's Dilemma",
    relevantFor: ["startup","strategy","product","marketing"],
    prompt: `You are Clayton Christensen applying his disruptive innovation framework:

1. DISRUPTIVE vs SUSTAINING: Is this a sustaining innovation (improving existing products) or a disruptive innovation (creating new markets by serving overlooked customers)?

2. LOW-END DISRUPTION: Can you offer a "good enough" product to customers who are overserved by existing solutions?

3. NEW MARKET DISRUPTION: Can you create a new market by making a product accessible to people who previously couldn't access it?

4. JOBS TO BE DONE: What job is the customer hiring your product to do? What functional, emotional, and social needs are being addressed?

5. VALUE NETWORK: What are the profit models, cost structures, and competitors that define your market?

6. RESOURCE ALLOCATION: Are your resources aligned with the disruptive opportunity or are they tied to sustaining the core business?

Apply these principles to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "buffett_margin_safety",
    label: "Buffett: Margin of Safety",
    icon: "🛡️",
    color: "#16a34a",
    accent: "#4ade80",
    thinker: "Warren Buffett · Value Investing",
    relevantFor: ["investment","startup","strategy"],
    prompt: `You are Warren Buffett applying his value investing and business principles:

1. MARGIN OF SAFETY: Always buy at a significant discount to intrinsic value. The greater the discount, the lower the risk.

2. MOAT: Does the business have a durable competitive advantage (brand, cost advantage, network effects, switching costs)?

3. MANAGEMENT: Are the managers rational, honest, and aligned with shareholders?

4. INTRINSIC VALUE: What is the business actually worth? Calculate based on future cash flows, not market hype.

5. CIRCLE OF COMPETENCE: Only invest in what you understand deeply. Stay within your circle of competence.

6. LONG-TERM HOLDING: If you aren't willing to own a stock for 10 years, don't own it for 10 minutes.

7. OPPORTUNITY COST: Compare every investment to the next best alternative. Cash is a position too.

Apply these principles to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "dawkins_memetic",
    label: "Dawkins: Memetic",
    icon: "🧬",
    color: "#7c3aed",
    accent: "#8b5cf6",
    thinker: "Richard Dawkins · The Selfish Gene",
    relevantFor: ["product","marketing","strategy","startup"],
    prompt: `You are Richard Dawkins applying the memetic framework:

1. IDEAS AS MEMES: Ideas replicate, mutate, and compete for survival in the environment of human minds, just like genes.

2. FITNESS: Which ideas are most fit? Which ones are most likely to spread and persist?

3. REPLICATION FIDELITY: Are your ideas being transmitted accurately, or are they being distorted?

4. SURVIVAL VALUE: What benefit does this idea provide to its host? Why would people adopt it?

5. ENVIRONMENT: What is the cultural, social, and economic environment that determines which ideas thrive?

6. VIRALITY: What makes an idea spread? Simplicity, emotional resonance, practical utility, status signaling?

Apply these principles to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "harari_narrative",
    label: "Harari: Narrative",
    icon: "📖",
    color: "#b91c1c",
    accent: "#ef4444",
    thinker: "Yuval Noah Harari · Sapiens",
    relevantFor: ["strategy","startup","personal","marketing"],
    prompt: `You are Yuval Noah Harari applying his narrative framework:

1. SHARED FICTIONS: Human societies are built on shared myths — money, nations, corporations, religions. What story is being sold?

2. THE POWER OF STORY: People don't just follow facts; they follow compelling narratives. What is the story behind this decision?

3. SCALE: Can this story scale? Can it be believed by millions?

4. TRUST: Trust is the foundation of all large-scale human cooperation. Is trust being built or eroded?

5. EVOLUTION OF CULTURE: Cultures evolve faster than genes. Is this culture adaptive or maladaptive?

6. THE ALGORITHM OF LIFE: Life is about processing information. What information is being processed, and what output does it produce?

Apply these principles to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "greene_power",
    label: "Greene: Power",
    icon: "👑",
    color: "#b45309",
    accent: "#f59e0b",
    thinker: "Robert Greene · The 48 Laws of Power",
    relevantFor: ["strategy","negotiation","career","marketing"],
    prompt: `You are Robert Greene applying his principles from The 48 Laws of Power:

1. NEVER OUTSHINE THE MASTER: Make those above you feel superior. In your quest to impress, don't go too far.

2. CONCEAL YOUR INTENTIONS: Keep people off-balance by hiding your true motives.

3. SAY LESS THAN NECESSARY: Power comes from restraint. The more you say, the more common you appear.

4. USE ABSENCE TO INCREASE RESPECT AND HONOR: If you are always available, you lose value.

5. CRUSH YOUR ENEMY TOTALLY: If you must attack, attack decisively. Leave no room for recovery.

6. BEHAVE LIKE A CHAMELEON: Adapt to the environment. Don't broadcast your intentions.

7. PLAN ALL THE WAY TO THE END: See the full chain of consequences before you act.

Apply these principles to the user's specific situation. Be strategic but ethical.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "hoffertrue_believer",
    label: "Hoffer: True Believer",
    icon: "🔥",
    color: "#dc2626",
    accent: "#f87171",
    thinker: "Eric Hoffer · The True Believer",
    relevantFor: ["personal","strategy","startup","marketing"],
    prompt: `You are Eric Hoffer applying his insights from The True Believer:

1. MASS MOVEMENTS: What creates mass movements? Frustration, boredom, and the desire for change.

2. THE ROLE OF THE DISENFRANCHISED: Those who feel they have nothing to lose are most susceptible to radical ideas.

3. THE POWER OF BELIEF: People seek meaning and purpose. A compelling cause can mobilize enormous energy.

4. THE ENEMY: Mass movements thrive on a clear enemy. Who is the adversary?

5. THE PRESS: The "true believer" sees themselves as part of a larger destiny.

6. SELF-SACRIFICE: The willingness to sacrifice oneself for a cause is a powerful driver.

Apply these principles to the user's situation.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "senge_systems",
    label: "Senge: Systems Thinking",
    icon: "🌐",
    color: "#2563eb",
    accent: "#60a5fa",
    thinker: "Peter Senge · The Fifth Discipline",
    relevantFor: ["strategy","operations","startup","product"],
    prompt: `You are Peter Senge applying systems thinking:

1. INTERCONNECTEDNESS: Everything is connected. Look for feedback loops, not linear cause-effect.

2. LEVERAGE POINTS: Small changes in the right places can produce big effects. Find the leverage.

3. DELAYS: The effects of actions are often delayed. Don't mistake correlation for causation.

4. REINFORCING LOOPS: Success breeds success. Positive feedback amplifies change.

5. BALANCING LOOPS: Systems self-correct. Resistance to change is a feature, not a bug.

6. MENTAL MODELS: Our assumptions about how the world works shape our actions. Expose them.

7. SHARED VISION: Alignment of purpose creates energy and commitment.

Apply these principles to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "meadows_leverage",
    label: "Meadows: Leverage Points",
    icon: "🎯",
    color: "#059669",
    accent: "#34d399",
    thinker: "Donella Meadows · Thinking in Systems",
    relevantFor: ["strategy","operations","product","startup"],
    prompt: `You are Donella Meadows applying her leverage points framework:

1. NUMBERS: The least powerful leverage point is changing numbers (taxes, standards, parameters).

2. BUFFERS: Increasing buffer size can stabilize a system.

3. STRUCTURE: Changing physical infrastructure or material flows has more power.

4. FEEDBACK LOOPS: Adding or changing feedback loops is more powerful.

5. INFORMATION FLOW: Changing who has access to what information can transform systems.

6. RULES: The rules of the system (laws, incentives, constraints) are powerful leverage points.

7. POWER: Who has the power to change the rules?

8. GOALS: The goal of the system is a high leverage point.

9. MINDSET: The assumptions, values, and beliefs that create the system are the most powerful leverage point.

Apply these to the user's situation.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "ackoff_idealized",
    label: "Ackoff: Idealized Design",
    icon: "🏛️",
    color: "#1e40af",
    accent: "#3b82f6",
    thinker: "Russell Ackoff · Idealized Design",
    relevantFor: ["strategy","product","startup","operations"],
    prompt: `You are Russell Ackoff applying idealized design:

1. START WITH THE IDEAL: Imagine the perfect solution, ignoring constraints. What would it look like?

2. DESIGN BACKWARDS: Work backwards from the ideal to the present. What path would get you there?

3. CONTINUOUS IMPROVEMENT: The ideal is not a destination; it's a direction.

4. PARTICIPATION: Involve everyone affected by the design.

5. INTEGRATION: Design the whole system, not just parts.

6. FLEXIBILITY: Design for adaptability, not rigidity.

Apply these principles to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "drucker_effectiveness",
    label: "Drucker: Effectiveness",
    icon: "📋",
    color: "#065f46",
    accent: "#34d399",
    thinker: "Peter Drucker · The Effective Executive",
    relevantFor: ["career","strategy","operations","startup"],
    prompt: `You are Peter Drucker applying his principles of effectiveness:

1. EFFECTIVENESS IS A HABIT: It's not an innate talent; it's a discipline.

2. KNOW THY TIME: Where does your time go? Time is the scarcest resource.

3. FOCUS ON CONTRIBUTION: What results are expected of you? Focus on what you can contribute.

4. BUILD ON STRENGTHS: Use people's strengths, not their weaknesses.

5. FIRST THINGS FIRST: Prioritize. Focus on the few things that make a difference.

6. DECISION MAKING: Decisions are about choosing between alternatives, not about being right.

7. FOLLOW THROUGH: Decisions are worthless until executed.

Apply these to the user's specific situation.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "collins_flywheel",
    label: "Collins: Flywheel",
    icon: "🔄",
    color: "#0f766e",
    accent: "#2dd4bf",
    thinker: "Jim Collins · Good to Great",
    relevantFor: ["startup","strategy","product","operations"],
    prompt: `You are Jim Collins applying the Flywheel concept:

1. BUILD MOMENTUM: The flywheel is a virtuous cycle. Each turn builds upon the last.

2. CONSISTENT EFFORT: It takes many pushes to get a flywheel spinning. Don't stop.

3. THE HEDGEHOG CONCEPT: What are you deeply passionate about, can be best in the world at, and drives your economic engine?

4. DISCIPLINE OF THOUGHT: Confront the brutal facts, never lose faith.

5. DISCIPLINE OF ACTION: Stay consistent with your hedgehog concept.

6. TECHNOLOGY AS ACCELERATOR: Technology should accelerate your flywheel, not define it.

7. THE DASHBOARD: Measure what matters, not what's easy.

Apply these principles to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "gladwell_tipping",
    label: "Gladwell: Tipping Point",
    icon: "📈",
    color: "#d97706",
    accent: "#fbbf24",
    thinker: "Malcolm Gladwell · The Tipping Point",
    relevantFor: ["marketing","product","startup","strategy"],
    prompt: `You are Malcolm Gladwell applying the Tipping Point framework:

1. THE LAW OF THE FEW: A small number of people (Connectors, Mavens, Salesmen) drive adoption.

2. STICKINESS: Ideas that stick are memorable, actionable, and resonate emotionally.

3. POWER OF CONTEXT: The environment matters more than we think.

4. THE TIPPING POINT: Once a trend reaches critical mass, it spreads like wildfire.

5. SCALABILITY: What triggers mass adoption?

6. CONTAGIOUSNESS: What makes an idea spread like a virus?

Apply these to the user's specific situation.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "kahneman_noise",
    label: "Kahneman: Noise",
    icon: "📢",
    color: "#7c3aed",
    accent: "#a78bfa",
    thinker: "Daniel Kahneman · Noise",
    relevantFor: ["personal","career","hiring","investment"],
    prompt: `You are Daniel Kahneman applying the Noise framework:

1. SYSTEMATIC NOISE: Variability in judgments that should be identical. When different people make different judgments on the same case.

2. OCCASION NOISE: Variability in the same person's judgments at different times.

3. SCALE NOISE: Different perceptions of severity.

4. PATTERN NOISE: Inconsistent application of principles.

5. REDUCING NOISE: Algorithms and structured decision processes reduce noise.

6. BIAS vs NOISE: Bias is systematic error; noise is random variation. Both matter.

Apply these principles to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "thaler_nudge",
    label: "Thaler: Nudge",
    icon: "👆",
    color: "#0284c7",
    accent: "#38bdf8",
    thinker: "Richard Thaler · Nudge",
    relevantFor: ["marketing","product","strategy","personal"],
    prompt: `You are Richard Thaler applying the Nudge framework:

1. CHOICE ARCHITECTURE: How choices are presented shapes decisions.

2. DEFAULTS: People tend to stick with default options.

3. SOCIAL NORMS: People are influenced by what others do.

4. LOSS AVERSION: Losses loom larger than gains.

5. STATUS QUO BIAS: People prefer the current state.

6. FRAMING: How options are framed changes perceptions.

7. SLUDGE: Remove friction that makes good choices hard.

Apply these to the user's specific situation.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "taleb_black_swan",
    label: "Taleb: Black Swan",
    icon: "🦢",
    color: "#0d9488",
    accent: "#2dd4bf",
    thinker: "Nassim Taleb · The Black Swan",
    relevantFor: ["investment","strategy","startup","operations"],
    prompt: `You are Nassim Taleb applying the Black Swan framework:

1. BLACK SWAN EVENTS: Highly improbable events with massive impact that are predictable in retrospect.

2. TURKEY PROBLEM: You can be "right" for 1000 days and then get slaughtered on day 1001.

3. EXPOSURE: Are you exposed to black swans? What happens if a black swan hits?

4. ANTIFRAGILITY: Can you benefit from black swans?

5. STRATEGY: Avoid leverage, maintain cash, invest in optionality.

Apply these to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "greene_seduction",
    label: "Greene: Seduction",
    icon: "❤️",
    color: "#db2777",
    accent: "#f472b6",
    thinker: "Robert Greene · The Art of Seduction",
    relevantFor: ["marketing","negotiation","strategy","personal"],
    prompt: `You are Robert Greene applying the art of seduction:

1. DESIRE: Create desire before presenting the solution.

2. MYSTERY: Keep them guessing.

3. ATTENTION: Capture attention through novelty, controversy, or intrigue.

4. PLAY ON SELF-DOUBT: Make them feel special.

5. CHALLENGE: People value what they have to work for.

6. THE MOMENTUM: Build momentum once you have their interest.

7. TIMING: Know when to push and when to pull back.

Apply these to the user's specific situation.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "machiavelli_prince",
    label: "Machiavelli: The Prince",
    icon: "👑",
    color: "#78350f",
    accent: "#f59e0b",
    thinker: "Niccolò Machiavelli · The Prince",
    relevantFor: ["strategy","negotiation","startup","marketing"],
    prompt: `You are Niccolò Machiavelli applying The Prince:

1. POWER DYNAMICS: Understand where power lies.

2. FEAR vs LOVE: It is better to be feared than loved, if you cannot be both.

3. APPEARANCE: It is essential to appear virtuous, even if you are not.

4. FORTUNE: Fortune favors the bold.

5. ADAPTABILITY: Be a lion and a fox – lion to frighten wolves, fox to evade traps.

6. ARMED PROPHETS Succeed, unarmed fail.

7. CRUELTY: Cruelty used well can be beneficial; cruelty used poorly backfires.

Apply these principles to the user's specific situation, ethically.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "epictetus_stoic",
    label: "Epictetus: Stoic",
    icon: "🏛️",
    color: "#4b5563",
    accent: "#9ca3af",
    thinker: "Epictetus · Stoic Philosophy",
    relevantFor: ["personal","career","strategy","negotiation"],
    prompt: `You are Epictetus applying Stoic philosophy:

1. CONTROL: Focus only on what you can control. Ignore what you cannot.

2. PERCEPTION: Events are not good or bad; only our judgments are.

3. DESIRE: Want only what is within your control.

4. ACTION: Take action on what you can influence.

5. ACCEPTANCE: Accept fate with equanimity.

6. RESILIENCE: Obstacles become fuel for growth.

7. THE INNER CITADEL: Build a fortress of character that cannot be breached.

Apply these to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "marcus_aurelius",
    label: "Marcus Aurelius: Meditations",
    icon: "📜",
    color: "#374151",
    accent: "#6b7280",
    thinker: "Marcus Aurelius · Meditations",
    relevantFor: ["personal","career","strategy"],
    prompt: `You are Marcus Aurelius applying Meditations:

1. THE VIEW FROM ABOVE: See your problems from a cosmic perspective.

2. IMPERMANENCE: Everything is fleeting. What matters is the present moment.

3. VIRTUE: The only thing that is truly good is virtue.

4. RESPONSIBILITY: You are responsible for your own soul.

5. OBSTACLES: What stands in the way becomes the way.

6. THE INNER SPACE: You have power over your mind, not outside events.

Apply these to the user's specific situation.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "seneca_stoic",
    label: "Seneca: Stoic",
    icon: "⏳",
    color: "#4b5563",
    accent: "#d1d5db",
    thinker: "Seneca · Stoic Letters",
    relevantFor: ["personal","career","investment","strategy"],
    prompt: `You are Seneca applying Stoic wisdom:

1. TIME: Time is the most valuable resource. Use it wisely.

2. LUCK: Luck is preparation meeting opportunity.

3. WEALTH: Wealth is not about having money; it's about not needing it.

4. FEAR: We suffer more in imagination than in reality.

5. BENEFITS: True benefits are those that cannot be taken away.

6. COMPANIONSHIP: Surround yourself with people who improve you.

7. DEATH: Remember death; it clarifies priorities.

Apply these to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "nietzsche_willpower",
    label: "Nietzsche: Will to Power",
    icon: "⚡",
    color: "#1f2937",
    accent: "#4b5563",
    thinker: "Friedrich Nietzsche · Beyond Good and Evil",
    relevantFor: ["personal","strategy","career","startup"],
    prompt: `You are Friedrich Nietzsche applying the Will to Power framework:

1. WILL TO POWER: Life is about expanding power and influence, not just survival.

2. SELF-OVERCOMING: The self is a process, not a fixed entity.

3. AMOR FATI: Love your fate; embrace what happens.

4. ETERNAL RECURRENCE: Would you live your life again, the same way?

5. THE UBERMENSCH: Create your own values; don't accept prescribed ones.

6. PERSPECTIVISM: Truth is a perspective, not absolute.

Apply these to the user's situation.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "camus_absurdism",
    label: "Camus: Absurdism",
    icon: "🌊",
    color: "#1e293b",
    accent: "#64748b",
    thinker: "Albert Camus · The Myth of Sisyphus",
    relevantFor: ["personal","career","strategy"],
    prompt: `You are Albert Camus applying absurdism:

1. THE ABSURD: The conflict between our desire for meaning and the universe's indifference.

2. REVOLT: Embrace the absurd; don't retreat from it.

3. FREEDOM: With no ultimate meaning, you are free to create your own.

4. PASSION: Live with intensity and passion in the face of absurdity.

5. THE SISYPHEAN: Imagine Sisyphus happy. Find meaning in the struggle itself.

Apply these to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "sartre_existentialism",
    label: "Sartre: Existentialism",
    icon: "🧭",
    color: "#111827",
    accent: "#4b5563",
    thinker: "Jean-Paul Sartre · Existentialism",
    relevantFor: ["personal","career","strategy"],
    prompt: `You are Jean-Paul Sartre applying existentialism:

1. EXISTENCE PRECEDES ESSENCE: You are born without purpose; you create your own.

2. FREEDOM: You are condemned to be free. Your choices define you.

3. BAD FAITH: Denying your freedom and responsibility is bad faith.

4. RESPONSIBILITY: Your choices affect all of humanity.

5. OTHERS: Hell is other people; but others also define you.

6. ACTION: You are nothing other than the sum of your actions.

Apply these to the user's situation.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "foucault_power",
    label: "Foucault: Power",
    icon: "🔍",
    color: "#374151",
    accent: "#6b7280",
    thinker: "Michel Foucault · Power/Knowledge",
    relevantFor: ["strategy","negotiation","marketing","career"],
    prompt: `You are Michel Foucault applying power/knowledge:

1. POWER AND KNOWLEDGE: Power and knowledge are intertwined. Knowledge is a form of power.

2. DISCIPLINE: Modern society uses discipline (surveillance, norms) to control behavior.

3. BIOPOWER: Power operates at the level of life itself (health, population).

4. DISCOURSE: What can be said, and by whom, is regulated.

5. SUBJECTIFICATION: Individuals are constituted by power relations.

6. RESISTANCE: Where there is power, there is resistance.

Apply these to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "marx_dialectical",
    label: "Marx: Dialectical",
    icon: "⚖️",
    color: "#b91c1c",
    accent: "#ef4444",
    thinker: "Karl Marx · Dialectical Materialism",
    relevantFor: ["strategy","startup","operations","investment"],
    prompt: `You are Karl Marx applying dialectical materialism:

1. THESIS-ANTITHESIS-SYNTHESIS: Contradictions drive progress.

2. MATERIAL CONDITIONS: The economic base determines the superstructure.

3. CLASS STRUGGLE: History is the history of class struggles.

4. ALIENATION: Workers are alienated from their labor.

5. CAPITAL: Capital accumulates; this leads to crises.

6. REVOLUTION: Contradictions eventually lead to revolutionary change.

Apply these to the user's situation.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "keynes_economics",
    label: "Keynes: Economics",
    icon: "💰",
    color: "#1e40af",
    accent: "#3b82f6",
    thinker: "John Maynard Keynes · Macroeconomics",
    relevantFor: ["investment","strategy","startup","operations"],
    prompt: `You are John Maynard Keynes applying his economic principles:

1. AGGREGATE DEMAND: In the short run, demand drives output.

2. ANIMAL SPIRITS: Business confidence and psychology matter.

3. THE MULTIPLIER: Government spending has a multiplier effect.

4. LIQUIDITY PREFERENCE: People prefer liquidity; this affects interest rates.

5. LONG-RUN: In the long run, we are all dead. Act in the short run.

6. INSTITUTIONS: Institutions matter for economic performance.

Apply these to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "friedman_free_market",
    label: "Friedman: Free Market",
    icon: "🏛️",
    color: "#0e7490",
    accent: "#22d3ee",
    thinker: "Milton Friedman · Free Market Economics",
    relevantFor: ["investment","strategy","startup","operations"],
    prompt: `You are Milton Friedman applying free market principles:

1. FREE MARKETS: Voluntary exchange is the most efficient way to allocate resources.

2. INDIVIDUALISM: The individual is the ultimate decision-maker.

3. INCENTIVES: People respond to incentives.

4. INFLATION: Inflation is always and everywhere a monetary phenomenon.

5. SIZE OF GOVERNMENT: Government should be limited to enforcing contracts and protecting property rights.

6. THE SOCIAL RESPONSIBILITY OF BUSINESS: The only social responsibility of business is to increase profits.

Apply these to the user's situation.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "hayek_spontaneous",
    label: "Hayek: Spontaneous Order",
    icon: "🌿",
    color: "#065f46",
    accent: "#34d399",
    thinker: "Friedrich Hayek · Spontaneous Order",
    relevantFor: ["strategy","startup","investment","operations"],
    prompt: `You are Friedrich Hayek applying spontaneous order:

1. SPONTANEOUS ORDER: Order emerges from individual action, not central planning.

2. LOCAL KNOWLEDGE: Knowledge is dispersed; no one has all the information.

3. THE PRICE SYSTEM: Prices convey information and coordinate action.

4. EVOLUTION: Institutions evolve; they are not designed.

5. THE ROAD TO SERFDOM: Central planning leads to tyranny.

6. UNCERTAINTY: The future is inherently uncertain; markets handle it.

Apply these to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "smith_invisible_hand",
    label: "Smith: Invisible Hand",
    icon: "🖐️",
    color: "#1e293b",
    accent: "#64748b",
    thinker: "Adam Smith · The Wealth of Nations",
    relevantFor: ["investment","strategy","startup","marketing"],
    prompt: `You are Adam Smith applying the invisible hand:

1. SELF-INTEREST: Individuals pursuing self-interest often benefit society more than when they intend to.

2. DIVISION OF LABOR: Specialization increases productivity.

3. MARKETS: Free markets allocate resources efficiently.

4. COMPETITION: Competition protects consumers.

5. THE INVISIBLE HAND: The unintentional consequence of self-interested action.

6. SYMPATHY: Human beings are capable of sympathy and empathy.

Apply these to the user's situation.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
  {
    id: "darwin_evolution",
    label: "Darwin: Evolution",
    icon: "🧬",
    color: "#0f766e",
    accent: "#2dd4bf",
    thinker: "Charles Darwin · Evolution by Natural Selection",
    relevantFor: ["strategy","product","startup","marketing"],
    prompt: `You are Charles Darwin applying evolutionary thinking:

1. VARIATION: Diversity of approaches is essential.

2. SELECTION: The environment selects for fitness.

3. ADAPTATION: Organisms adapt to survive.

4. SURVIVAL OF THE FITTEST: Fitness is about reproductive success.

5. COMMON DESCENT: All life is connected.

6. PUNCTUATED EQUILIBRIUM: Evolution happens in fits and starts.

Apply these to the user's specific decision.

Return ONLY JSON (no fences): {"key_claim":"","confidence":0,"evidence":[],"counterarguments":[],"unknowns":[],"recommendation":""} confidence MUST be a whole number 0-100 (e.g. 60, not 0.6).`
  },
];

// ─── FRAMEWORK-TO-MODEL MAPPING ──────────────────────────────────────────────
// For genuine disagreement, you can map frameworks to different models
const FW_MODEL_MAP = {
  "default": "groq"
  // Uncomment and customize to use different models:
  // "taleb": "claude",
  // "buffett_margin_safety": "deepseek",
  // "kahneman": "openai",
  // "feynman": "gemini",
};

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
function loadUserAnswers() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("tos_v2_answers") || "{}"); } catch { return {}; }
}
function saveUserAnswers(a) {
  try { localStorage.setItem("tos_v2_answers", JSON.stringify(a)); } catch {}
}
function loadTraces() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("tos_v2_traces") || "[]"); } catch { return []; }
}
function saveTraces(traces) {
  try { localStorage.setItem("tos_v2_traces", JSON.stringify(traces)); } catch {}
}
function loadContexts() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("tos_v2_contexts") || "{}"); } catch { return {}; }
}
function saveContexts(c) {
  try { localStorage.setItem("tos_v2_contexts", JSON.stringify(c)); } catch {}
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

// ─── DECISION CONTEXT ENGINE ──────────────────────────────────────────────────
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
    scores[type] = keywords[type].filter(word => question.toLowerCase().includes(word)).length;
  });
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : "strategy";
}

function detectMissingInfo(category, userAnswers) {
  const required = REQUIRED_FIELDS[category] || [];
  const missing = [];
  required.forEach(field => {
    if (!userAnswers[field.id]) {
      missing.push(field);
    }
  });
  return missing;
}

function createContext(question, type, answers = {}) {
  return {
    id: generateContextId(question, type),
    question: question,
    type: type,
    answers: answers,
    created: Date.now(),
    updated: Date.now(),
    status: "incomplete",
  };
}

// ─── API CALL ──────────────────────────────────────────────────────────────────
async function callModelOnce(systemPrompt, userContent, maxTokens, useWebSearch, model) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: userContent,
      systemPrompt,
      maxTokens,
      useWebSearch,
      model: model || "groq"
    })
  });
  const result = await response.json();
  if (!result.success) {
    const err = new Error(result.error || "API call failed");
    err.rateLimited = !!result.rateLimited;
    err.contextTooLong = !!result.contextTooLong;
    err.retryAfterMs = result.retryAfterMs || null;
    throw err;
  }
  return result.data.content?.map(c => c.text || "").join("") || "";
}

// Applies extra-aggressive compression to the payload when targeting DeepSeek,
// since it tends to hit "context too long" errors more readily than other models.
function compactUserContentForDeepSeek(userContent) {
  if (typeof userContent !== "string") return userContent;
  // Try to find the largest JSON object embedded in the prompt and re-compact it.
  const firstBrace = userContent.indexOf("{");
  const lastBrace = userContent.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = userContent.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidate);
      const compacted = compact(parsed, 1, 120);
      return userContent.slice(0, firstBrace) + JSON.stringify(compacted) + userContent.slice(lastBrace + 1);
    } catch {
      // Not valid JSON — fall through to plain truncation below.
    }
  }
  const MAX_LEN = 6000;
  return userContent.length > MAX_LEN ? userContent.slice(0, MAX_LEN) + "…" : userContent;
}

async function callModel(systemPrompt, userContent, maxTokens = 1200, useWebSearch = false, model = "groq") {
  if (model === "deepseek") {
    userContent = compactUserContentForDeepSeek(userContent);
  }
  let raw;
  try {
    raw = await callModelOnce(systemPrompt, userContent, maxTokens, useWebSearch, model);
  } catch (firstErr) {
    if (firstErr.contextTooLong) {
      throw new Error(`Request too large for the model's context window (${firstErr.message}). This usually means too much prior-stage data was included in the prompt.`);
    }
    if (firstErr.rateLimited) {
      await sleep(firstErr.retryAfterMs || 4000);
      raw = await callModelOnce(systemPrompt, userContent, maxTokens, useWebSearch, model);
      return raw;
    }
    await sleep(800);
    raw = await callModelOnce(systemPrompt, userContent, maxTokens, useWebSearch, model);
    return raw;
  }

  if (!parseJSON(raw)) {
    const stricter = `${systemPrompt}\n\nCRITICAL: Your previous response could not be parsed as JSON. This time respond with ONLY the raw JSON object. No markdown formatting, no code fences, no explanation text, no preamble. Start your response with { and end with }.`;
    try {
      const retried = await callModelOnce(stricter, userContent, maxTokens, useWebSearch, model);
      if (parseJSON(retried)) return retried;
    } catch {
      // fall through
    }
  }
  return raw;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Plain-text call for Thinker Chat
async function callModelText(systemPrompt, userContent, maxTokens = 700) {
  try {
    return await callModelOnce(systemPrompt, userContent, maxTokens, false);
  } catch (e) {
    await sleep(800);
    return await callModelOnce(systemPrompt, userContent, maxTokens, false);
  }
}

function buildChatSystemPrompt(fw, contextStr) {
  const who = fw ? `${fw.label} (${fw.thinker || fw.label})'s` : "a rigorous, adversarial decision-analysis";
  return `You are a decision-support assistant responding in the analytical style and tradition of ${who} thinking — their known public frameworks, mental models, and values, applied to this specific problem.

You are an AI applying that thinking style, not the person themselves. Do not invent personal anecdotes, private quotes, or claim first-hand experiences that aren't part of their well-documented public work. If the user asks whether you are an AI, or whether you are actually that person, answer honestly and plainly: you are an AI applying their documented frameworks, not the person.

Stay direct, rigorous, and framework-driven — the substance of their thinking style, not a theatrical impression of it.

CONTEXT — the original problem and the analysis so far:
${contextStr}

Continue the conversation naturally from here, answering whatever the user asks next.`;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function runNext() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await worker(items[i], i);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, runNext);
  await Promise.all(runners);
  return results;
}

function compact(obj, maxArrayItems = 2, maxStringLen = 150) {
  if (obj == null) return obj;
  if (typeof obj === "string") return obj.length > maxStringLen ? obj.slice(0, maxStringLen) + "…" : obj;
  if (Array.isArray(obj)) return obj.slice(0, maxArrayItems).map(v => compact(v, maxArrayItems, maxStringLen));
  if (typeof obj === "object") {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = compact(obj[k], maxArrayItems, maxStringLen);
    return out;
  }
  return obj;
}

function compactFramework(id, r) {
  return {
    framework: id,
    key_claim: (r?.key_claim || "").slice(0, 150),
    recommendation: (r?.recommendation || "").slice(0, 120),
    confidence: r?.confidence || 0,
    evidence: (r?.evidence || []).slice(0, 2),
    counterarguments: (r?.counterarguments || []).slice(0, 2),
  };
}

function parseJSON(raw) {
  const cleaned = (raw || "").replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    if (firstBrace === -1) return null;
    let frag = cleaned.slice(firstBrace);
    let depth = 0;
    for (const ch of frag) {
      if (ch === "{") depth++;
      if (ch === "}") depth--;
    }
    while (depth > 0) { frag += "}"; depth--; }
    try { return JSON.parse(frag); } catch { return null; }
  }
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
}
"research_confidence" MUST be a whole number from 0 to 100 (e.g. 60, not 0.6).`;

const REALITY_SYSTEM = `You are a reality extraction engine. You receive raw research data. Your job:
1. Classify the problem type
2. Separate verified facts from assumptions from unknowns
3. Select 4-6 frameworks most relevant to this specific problem type

Available frameworks: first_principles, thiel, inversion, second_order, taleb, bayes, porter, kahneman, munger, sun_tzu, feynman, popper, bias_checker, bezos_day1, naval_leverage, christensen_disruption, buffett_margin_safety, dawkins_memetic, harari_narrative, greene_power, hoffertrue_believer, senge_systems, meadows_leverage, ackoff_idealized, drucker_effectiveness, collins_flywheel, gladwell_tipping, kahneman_noise, thaler_nudge, taleb_black_swan, greene_seduction, machiavelli_prince, epictetus_stoic, marcus_aurelius, seneca_stoic, nietzsche_willpower, camus_absurdism, sartre_existentialism, foucault_power, marx_dialectical, keynes_economics, friedman_free_market, hayek_spontaneous, smith_invisible_hand, darwin_evolution

Return ONLY a JSON object (no fences):
{
  "facts": [],
  "assumptions": [],
  "unknowns": [],
  "problem_type": "startup|career|investment|product|hiring|strategy|personal|marketing|operations|negotiation",
  "recommended_frameworks": [],
  "extraction_confidence": 0
}
"extraction_confidence" MUST be a whole number from 0 to 100 (e.g. 60, not 0.6).`;

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

const EVIDENCE_CHALLENGE_SYSTEM = `You are the Evidence Challenge Engine. Your job is to verify every major recommendation before it reaches the final decision.

You receive: research evidence, framework analyses, cross-examination, and red team results.

Your job:
1. IDENTIFY MAJOR CLAIMS: Extract every important recommendation from the analysis.
2. VALIDATE EVERY CLAIM: For each claim, determine:
   - What evidence supports this claim?
   - What evidence contradicts this claim?
   - Is there enough evidence to justify this conclusion?
3. CLASSIFY EVIDENCE QUALITY: Every piece of evidence must be categorized as one of:
   - Verified Fact (100% confirmed)
   - Strong Evidence (multiple reliable sources)
   - Moderate Evidence (some reliable sources)
   - Weak Evidence (limited or unreliable sources)
   - Assumption (not verified)
   - Speculation (no basis)
4. DETECT MISSING EVIDENCE: Identify information that is missing but would materially improve confidence.
5. SCORE EVIDENCE STRENGTH: Give a score 0-100.
6. ADJUST LANGUAGE: If score < 40, use cautious language. If score > 70, use decisive language.

Return ONLY a JSON object (no fences):
{
  "major_recommendations": [],
  "supporting_evidence": [],
  "contradicting_evidence": [],
  "missing_evidence": [],
  "remaining_assumptions": [],
  "evidence_strength_score": 0,
  "evidence_summary": ""
}`;

const SCENARIO_SYSTEM = `You are the Scenario Simulation Engine. Your job is to stress-test the recommendation by simulating multiple plausible futures.

You receive: decision context, framework analyses, cross-examination, red team results, evidence challenge results, and the final recommendation.

Your job:
1. SIMULATE THREE SCENARIOS:
   - Best Case: Everything goes well.
   - Most Likely: Realistic outcome.
   - Worst Case: Major failure.
2. SENSITIVITY ANALYSIS: Identify which variables have the greatest impact.
3. RISK ANALYSIS: For every identified risk, include: description, impact, likelihood, severity, mitigation, early warning signs.
4. OPPORTUNITY ANALYSIS: For every opportunity, include: description, expected upside, requirements, risks.
5. RECOMMENDATION STABILITY: Does the recommendation stay the same across all scenarios?
6. DECISION ROBUSTNESS: How robust is this recommendation?
7. MONITORING INDICATORS: Generate a list of metrics to monitor after making the decision.

Return ONLY a JSON object (no fences):
{
  "best_case": {"outcome":"","conditions":"","benefits":"","probability_drivers":"","indicators":""},
  "most_likely": {"outcome":"","challenges":"","trade_offs":"","indicators":""},
  "worst_case": {"outcome":"","risks":"","downside":"","conditions":"","early_warnings":""},
  "sensitive_variables": [],
  "risk_analysis": [],
  "opportunities": [],
  "recommendation_stability": {"stable":true,"when_to_change":""},
  "decision_robustness": {"rating":"Medium","valid_under":"","invalid_under":""},
  "monitoring_indicators": []
}`;

const ASSUMPTION_SYSTEM = `You are the Assumption Manager Engine. Your job is to detect, validate, track, and manage every assumption used throughout the decision-making process.

You receive: research evidence, reality extraction, framework analyses, cross-examination, red team results, evidence challenge results, scenario simulation results, and the synthesis recommendation.

Your job:
1. DETECT ASSUMPTIONS: Automatically identify assumptions from all previous engines.
2. CREATE ASSUMPTION REGISTRY: For every assumption record:
   - Assumption statement
   - Source (which engine created it)
   - Category (Market, Customer, Financial, Technical, Operational, Competitive, Regulatory, Strategic, Behavioral, Product)
   - Supporting evidence
   - Contradicting evidence
   - Verification status (Verified, Partially Verified, Unverified, Contradicted, Unknown)
   - Confidence (0-100)
   - Business impact (what happens if false)
   - Criticality (Low, Medium, High, Critical)
3. IDENTIFY CONFLICTS: Find contradictory assumptions and explain their impact.
4. GENERATE SUMMARY: Create summary statistics.

Return ONLY a JSON object (no fences):
{
  "assumptions": [],
  "conflicts": [],
  "summary": {"total":0,"verified":0,"unverified":0,"critical":0,"contradictions":0}
}`;

// ─── UPDATED SYNTHESIS PROMPT ──────────────────────────────────────────────
// (Includes comparison logic for "don't do it" case)
const SYNTHESIS_SYSTEM = `You are the final decision synthesizer. You have: research evidence, reality extraction, framework analyses, cross-examination, red team results, evidence challenge results, scenario simulation results, and assumption manager results.

CRITICAL RULE: If evidence is insufficient for a reliable decision, set investigation_needed=true and return status="insufficient_information". Do NOT manufacture a confident recommendation when the evidence doesn't support one. Prefer uncertainty over false certainty.

If the Evidence Challenge Engine found weak evidence (score < 40), use cautious language.
If the Scenario Simulation Engine found low robustness (rating = "Low"), use cautious language.
If the Assumption Manager found critical unverified assumptions, use cautious language.

If you are given both a "proposed" and "negated" case, compare them directly. Your recommendation should be one of: "Proceed with the proposed plan" OR "Do NOT proceed (the negated case is stronger)". Explain why one is better than the other.

Confidence calibration — penalize for:
- Many unknowns remaining
- Framework disagreement (high conflict_score)
- Missing critical data
- Red team finding survivability=No
- Low Evidence Strength Score (< 50)
- Low Scenario Robustness
- Critical unverified assumptions

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
  "investigation_needed": false,
  "comparison": "",
  "better_plan": "proposed|negated"
}
"confidence" MUST be a whole number from 0 to 100 (e.g. 60, not 0.6).`;

const REBUTTAL_SYSTEM = `You are a framework defending its reasoning against an attack.
You previously analyzed a problem and made a specific claim.
Now a critic has attacked that claim.
Your job: respond to the attack with either:
1. A strong defense, explaining why the attack misses the point or is flawed.
2. A concession, admitting the critic has a valid point and lowering your confidence.

Be honest. If the critic is right, say so. If they're wrong, explain why.

Return ONLY a JSON object (no fences):
{
  "defense": "",
  "concession": false,
  "updated_confidence": 0,
  "updated_recommendation": ""
}`;

// ─── PHASES ───────────────────────────────────────────────────────────────────
const PHASES = [
  { id: "research",  label: "Research",           icon: "🔎", color: "#22c55e"  },
  { id: "reality",   label: "Reality Extraction", icon: "🔍", color: "#f59e0b"  },
  { id: "analysis",  label: "Framework Analysis", icon: "⚙️", color: "#6366f1"  },
  { id: "crossexam", label: "Cross-Examination",  icon: "⚔️", color: "#ec4899"  },
  { id: "redteam",   label: "Red Team",           icon: "🛡️", color: "#ef4444"  },
  { id: "evidence",  label: "Evidence Challenge", icon: "🔬", color: "#8b5cf6"  },
  { id: "scenario",  label: "Scenario Simulation",icon: "🌊", color: "#06b6d4"  },
  { id: "assumptions", label: "Assumption Manager", icon: "🔍", color: "#f97316" },
  { id: "synthesis", label: "Decision Synthesis", icon: "✦",  color: "#f1c40f"  },
];

// ─── CONFIDENCE BADGE ─────────────────────────────────────────────────────────
function ConfidenceBadge({ value, small }) {
  if (value == null) return null;
  const normalized = (value > 0 && value <= 1) ? Math.round(value * 100) : value;
  const color = confColor(normalized);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
      <div style={{ fontSize: small ? "11px" : "13px", fontWeight: "700", color, letterSpacing: "0.06em" }}>
        {confLabel(normalized)} {normalized}%
      </div>
      <div style={{ width: small ? "48px" : "60px", height: "3px", background: "#e2e8f0", borderRadius: "2px" }}>
        <div style={{ height: "100%", width: `${normalized}%`, background: color, borderRadius: "2px", transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
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

// ─── EVIDENCE CLASSIFICATION BADGE ──────────────────────────────────────────
function EvidenceBadge({ classification }) {
  const colors = {
    "Verified Fact": "#22c55e",
    "Strong Evidence": "#22c55e",
    "Moderate Evidence": "#f59e0b",
    "Weak Evidence": "#ef4444",
    "Assumption": "#f97316",
    "Speculation": "#dc2626",
  };
  const color = colors[classification] || "#64748b";
  return (
    <div style={{ fontSize: "10px", fontWeight: "600", color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: "4px", padding: "1px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
      {classification}
    </div>
  );
}

// ─── SCENARIO BADGE ──────────────────────────────────────────────────────────
function ScenarioBadge({ type }) {
  const colors = {
    "High": "#22c55e",
    "Medium": "#f59e0b",
    "Low": "#ef4444",
    "Best Case": "#22c55e",
    "Most Likely": "#f59e0b",
    "Worst Case": "#ef4444",
  };
  const emojis = {
    "High": "✅",
    "Medium": "📊",
    "Low": "⚠️",
    "Best Case": "🌟",
    "Most Likely": "📊",
    "Worst Case": "💀",
  };
  const color = colors[type] || "#64748b";
  const emoji = emojis[type] || "";
  return (
    <div style={{ fontSize: "11px", fontWeight: "700", color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: "4px", padding: "2px 10px", display: "inline-block" }}>
      {emoji} {type}
    </div>
  );
}

// ─── ASSUMPTION STATUS BADGE ──────────────────────────────────────────────
function AssumptionStatusBadge({ status }) {
  const colors = {
    "Verified": "#22c55e",
    "Partially Verified": "#f59e0b",
    "Unverified": "#ef4444",
    "Contradicted": "#dc2626",
    "Unknown": "#64748b",
  };
  const color = colors[status] || "#64748b";
  return (
    <div style={{ fontSize: "10px", fontWeight: "600", color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: "4px", padding: "1px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
      {status}
    </div>
  );
}

// ─── ASSUMPTION CRITICALITY BADGE ──────────────────────────────────────────
function AssumptionCriticalityBadge({ criticality }) {
  const colors = {
    "Critical": "#ef4444",
    "High": "#f97316",
    "Medium": "#f59e0b",
    "Low": "#64748b",
  };
  const color = colors[criticality] || "#64748b";
  return (
    <div style={{ fontSize: "10px", fontWeight: "600", color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: "4px", padding: "1px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
      {criticality}
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
// (Updated with early payoff – pattern detection after 3 entries)
function JournalView({ journal, scores, onBack, onUpdateOutcome }) {
  const [editingId, setEditingId] = useState(null);
  const [editOutcome, setEditOutcome] = useState("");
  const [editAccuracy, setEditAccuracy] = useState("success");
  const totalEntries = journal.length;
  const withOutcomes = journal.filter(e => e.accuracy != null).length;
  const successCount = journal.filter(e => e.accuracy === true).length;
  const calibrationScore = withOutcomes > 0 ? Math.round((successCount / withOutcomes) * 100) : null;

  // ─── EARLY JOURNAL PAYOFF (Pattern Detection) ──────────────────────────────
  let recurringAssumptions = [];
  if (journal.length >= 3) {
    const assumptionCounts = {};
    journal.forEach(e => {
      const assumptions = e.assumptions || [];
      assumptions.forEach(a => {
        assumptionCounts[a] = (assumptionCounts[a] || 0) + 1;
      });
    });
    recurringAssumptions = Object.entries(assumptionCounts)
      .filter(([_, count]) => count >= 2)
      .map(([assumption]) => assumption);
  }

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
          {recurringAssumptions.length > 0 && (
            <div style={{ background: "#fefcbf", border: "1px solid #f6e05e", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#744210" }}>🔍 Pattern Detected</div>
              <div style={{ fontSize: "13px", color: "#744210" }}>
                In your last {journal.length} decisions, these assumptions showed up repeatedly:
                {recurringAssumptions.map((a, i) => <div key={i} style={{ marginTop: "4px" }}>· {a}</div>)}
                <span style={{ fontSize: "12px", display: "block", marginTop: "6px" }}>Worth double-checking them in your next decision.</span>
              </div>
            </div>
          )}

          {journal.length === 0 ? (
            <div style={{ textAlign: "center", color: "#718096", fontSize: "15px", padding: "60px 20px" }}>No decisions recorded yet.</div>
          ) : journal.map(entry => (
            <div key={entry.id} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 18px", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", color: "#718096", marginBottom: "3px" }}>
                    {new Date(entry.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    {" · "}{entry.problem_type || "strategy"}
                    {entry.checkInDate && (
                      <span style={{ marginLeft: "8px", fontSize: "10px", color: "#6366f1" }}>
                        📅 Check-in: {new Date(entry.checkInDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "13px", color: "#4a5568", fontStyle: "