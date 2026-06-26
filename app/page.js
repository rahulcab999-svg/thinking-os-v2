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
    lines.push(`**${synthesis.recommendation || 'N/A'}**`);
    lines.push(`Confidence: ${synthesis.confidence || 0}% · Risk: ${synthesis.risk_level || 'UNKNOWN'}`);
    lines.push(``);
    if (synthesis.why?.length) { lines.push(`### Why`); synthesis.why.forEach(w => lines.push(`- ${w}`)); lines.push(``); }
    if (synthesis.top_risks?.length) { lines.push(`### Top Risks`); synthesis.top_risks.forEach(r => lines.push(`- ${r}`)); lines.push(``); }
    if (synthesis.next_actions?.length) { lines.push(`### Next Actions`); synthesis.next_actions.forEach((a, i) => lines.push(`${i + 1}. ${a}`)); lines.push(``); }
    if (synthesis.confidence_reasoning) { lines.push(`### Confidence Reasoning`); lines.push(synthesis.confidence_reasoning); lines.push(``); }
  }

  // 1. Research Phase
  if (research) {
    lines.push(`## 1. Research Phase`);
    lines.push(research.output || '');
    lines.push(``);
  }

  // 2. Reality Check Phase
  if (reality) {
    lines.push(`## 2. Reality Check Phase`);
    lines.push(reality.output || '');
    lines.push(``);
  }

  // 3. Cross-Examination Phase
  if (crossexam) {
    lines.push(`## 3. Cross-Examination Phase`);
    lines.push(crossexam.output || '');
    lines.push(``);
  }

  // 4. Red Team Phase
  if (redteam) {
    lines.push(`## 4. Red Team Phase`);
    lines.push(redteam.output || '');
    lines.push(``);
  }

  if (fwResults && fwResults.length > 0) {
    lines.push(`## Framework References & Evidence`);
    fwResults.forEach(fw => {
      if (selectedFwIds.includes(fw.id)) {
        lines.push(`### ${fw.name}`);
        if (fw.key_claim) lines.push(`*Key Claim:* ${fw.key_claim}\n`);
        if (fw.recommendation) lines.push(`*Recommendation:* ${fw.recommendation}\n`);
      }
    });
  }

  return lines.join('\n');
}

// ─── MASTER SWITCH ────────────────────────────────────────────────────────────
const ENABLE_WEB_SEARCH = true;

// ─── SUB COMPONENTS ───────────────────────────────────────────────────────────
function FrameworkList({ title, items, color }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "11px", color: "#718096", fontWeight: "600", letterSpacing: "0.1em", marginBottom: "4px" }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: "16px", color: "#4a5568", fontSize: "13px", lineHeight: "1.5" }}>
        {items.map((item, idx) => (
          <li key={idx} style={{ marginBottom: "2px" }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function LoadingSkeleton({ color, label }) {
  return (
    <div style={{ padding: "20px", background: "#f7fafc", borderRadius: "8px", border: "1px dashed #e2e8f0", marginBottom: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
      <div className="spinner" style={{ width: "16px", height: "16px", borderRadius: "50%", border: `2px solid ${color}`, borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: "13px", color: "#4a5568", fontFamily: "monospace" }}>{label}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ThinkingOS() {
  const [question, setQuestion] = useState("");
  const [hasRun, setHasRun] = useState(false);
  const [selectedFwIds, setSelectedFwIds] = useState([]);
  const [copied, setCopied] = useState(false);
  
  // App Phase States matching your original layout keys
  const [phaseData, setPhaseData] = useState({
    research: null,
    reality: null,
    crossexam: null,
    redteam: null,
    synthesis: null
  });

  const [frameworkResults, setFrameworkResults] = useState([]);
  const [activeFwId, setActiveFwId] = useState(null);

  const activeFwResult = frameworkResults.find(f => f.id === activeFwId);
  const activeFw = frameworkResults.find(f => f.id === activeFwId);

  const handleCopyMarkdown = () => {
    const md = exportMarkdown(question, phaseData, frameworkResults, selectedFwIds);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mock Trigger to populate data structures safely
  const runAnalysis = () => {
    if (!question.trim()) return;
    setHasRun(true);
    
    // Simulating phase content injection using exact structure your components expect
    setPhaseData({
      research: { output: "Initial factual collection and base data analysis compiled successfully." },
      reality: { output: "Ground truths calibrated. Checked core assertions against verifiable limits." },
      crossexam: { output: "Friction analysis complete. Identified points of structural vulnerability." },
      redteam: { output: "Adversarial simulation complete. Mapped worst-case degradation bounds." },
      synthesis: {
        recommendation: "PROCEED WITH OUT-OF-BAND DEPLOYMENT",
        confidence: 85,
        risk_level: "MEDIUM",
        why: ["Bypasses cyclic dependencies completely.", "Minimizes latency overhead on operational loops."],
        top_risks: ["Requires independent power hardware gating."],
        next_actions: ["Isolate telemetry hooks.", "Run integration sanity sweeps."],
        confidence_reasoning: "Mitigation matrices account for 92% of historical failure markers."
      }
    });

    setFrameworkResults([
      { id: "evidence_core", name: "Empirical Vector Base", key_claim: "System baseline verification parameters match expected thresholds.", evidence: ["Telemetry Log Alpha verified", "Interrupt timings constant"], counterarguments: ["Latency burst anomaly at 300% load"], unknowns: ["Long-term cold state drift values"], accent: "#2b6cb0" }
    ]);
    setActiveFwId("evidence_core");
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "40px auto", padding: "0 20px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Upper Action Panel */}
      <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: "24px", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#1a202c" }}>Thinking OS</h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#718096" }}>Decision Analysis Workspace</p>
        </div>
        {phaseData.synthesis && (
          <button 
            onClick={handleCopyMarkdown}
            style={{ padding: "8px 14px", background: copied ? "#2f855a" : "#1a202c", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "600", cursor: "pointer", transition: "background 0.2s" }}
          >
            {copied ? "✓ COPIED MARKDOWN" : "EXPORT ANALYSIS (.MD)"}
          </button>
        )}
      </div>

      {/* Main Form Box */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#4a5568", marginBottom: "6px" }}>ENTER INQUIRY OR ARCHITECTURAL QUESTION</label>
          <input 
            type="text" 
            value={question} 
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What complex architectural challenge are we debugging today?" 
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e0", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }}
          />
        </div>
        <button 
          onClick={runAnalysis}
          style={{ padding: "10px 20px", background: "#3182ce", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
        >
          Initialize Reasoning Systems
        </button>
      </div>

      {/* Workspace Display grids */}
      {hasRun && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
          
          {/* Active Framework Panel output */}
          {activeFwResult && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ borderBottom: "1px solid #edf2f7", paddingBottom: "12px", marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", color: "#718096", fontWeight: "600", letterSpacing: "0.1em" }}>ACTIVE ALIGNMENT FRAMEWORK</div>
                <h3 style={{ margin: "4px 0 0 0", color: "#2d3748", fontSize: "16px" }}>{activeFwResult.name}</h3>
              </div>
              
              {activeFwResult.key_claim && (
                <div style={{ background: "#f7fafc", padding: "12px", borderRadius: "6px", marginBottom: "16px", borderLeft: `4px solid ${activeFw.accent || '#3182ce'}` }}>
                  <div style={{ fontSize: "15px", color: "#1a1a2e", lineHeight: "1.6", fontWeight: "500" }}>{activeFwResult.key_claim}</div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <FrameworkList title="EVIDENCE" items={activeFwResult.evidence} color="#2b6cb0" />
                <FrameworkList title="COUNTERARGUMENTS" items={activeFwResult.counterarguments} color="#c53030" />
                <FrameworkList title="UNKNOWNS" items={activeFwResult.unknowns} color="#c05621" />
                {activeFwResult.recommendation && (
                  <div style={{ gridColumn: "1 / -1", marginTop: "10px" }}>
                    <div style={{ fontSize: "11px", color: "#718096", fontWeight: "600", letterSpacing: "0.1em", marginBottom: "4px" }}>RECOMMENDATION</div>
                    <div style={{ fontSize: "14px", color: activeFw.accent, lineHeight: "1.6", fontWeight: "500" }}>{activeFwResult.recommendation}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Skeletons Fallback state handling */}
          {hasRun && !phaseData.research && (
            <LoadingSkeleton color="#22c55e" label="Searching datasets and processing logical blocks..." />
          )}
        </div>
      )}
    </div>
  );
}
