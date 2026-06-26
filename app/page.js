'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Shield, AlertTriangle, CheckCircle, ChevronDown, 
  ChevronUp, Download, RefreshCw, Layers, Brain, Copy, Check,
  ExternalLink, FileText, HelpCircle, Terminal, HelpCircle as QuestionIcon
} from 'lucide-react';

function exportMarkdown(question, phaseData, fwResults, selectedFwIds) {
  let md = `# Deep Analysis: ${question}\n\n`;
  md += `Generated on: ${new Date().toLocaleString()}\n`;
  md += `Frameworks Used: ${selectedFwIds.join(', ') || 'None'}\n\n`;
  md += `-------------\n\n`;

  // 1. Research Phase
  if (phaseData.research) {
    md += `## 1. Research Phase\n\n`;
    if (phaseData.research.webSearchLogs?.length > 0) {
      md += `### Web Search Logs\n`;
      phaseData.research.webSearchLogs.forEach(log => {
        md += `* **Query:** \`${log.query}\`\n`;
        md += `  * **Results Found:** ${log.resultsCount}\n`;
      });
      md += `\n`;
    }
    md += `### Initial Findings\n${phaseData.research.output || 'No output.'}\n\n`;
  }

  // 2. Reality Check Phase
  if (phaseData.reality) {
    md += `## 2. Reality Check Phase\n\n`;
    md += `### Ground Truth & Verification\n${phaseData.reality.output || 'No output.'}\n\n`;
  }

  // 3. Cross-Examination Phase
  if (phaseData.crossExam) {
    md += `## 3. Cross-Examination Phase\n\n`;
    md += `### Contradictions & Hard Questions\n${phaseData.crossExam.output || 'No output.'}\n\n`;
  }

  // 4. Red Team Phase
  if (phaseData.redTeam) {
    md += `## 4. Red Team Phase\n\n`;
    md += `### Vulnerability Analysis & Edge Cases\n${phaseData.redTeam.output || 'No output.'}\n\n`;
  }

  // 5. Synthesis Phase
  if (phaseData.synthesis) {
    md += `## 5. Final Synthesis\n\n`;
    md += `### Comprehensive Verdict\n${phaseData.synthesis.output || 'No output.'}\n\n`;
  }

  // Evidence / Citations sources
  if (fwResults && fwResults.length > 0) {
    md += `## Evidence & Framework References\n\n`;
    fwResults.forEach(fw => {
      md += `### [Framework] ${fw.name}\n`;
      md += `* **Confidence:** ${fw.confidence}%\n`;
      md += `* **Severity/Risk:** ${fw.severity}\n`;
      md += `* **Key Insights:** ${fw.summary || 'Analyzed successfully.'}\n\n`;
    });
  }

  return md;
}

// ─── WEB SEARCH MASTER SWITCH ──────────────────────────────────────────────────
const ENABLE_WEB_SEARCH = true;

// ─── SYSTEM PROMPTS FOR EACH OPERATING PHASE ───────────────────────────────────
const RESEARCH_SYSTEM = `You are the Research Phase of an elite reasoning engine.
Your goal is to gather comprehensive initial data on the user's query.
Break the query down into essential sub-components, facts, and baseline assumptions.
Provide a highly detailed narrative breakdown of everything known, assumed, or discovered about this topic.
Be exhaustive, leave no stone unturned. Provide structured, bulleted evidence where necessary.`;

const REALITY_SYSTEM = `You are the Reality Check Phase of an elite reasoning engine.
Your sole job is hard verification and fact-checking.
Look at the initial research provided. Challenge every assumption.
Cross-reference historical data, physical realities, logical limitations, and official documentation.
Call out any "hallucinations," popular myths, or unverified claims. 
Deliver a stern, evidence-based ground-truth calibration.`;

const CROSS_EXAM_SYSTEM = `You are the Cross-Examination Phase of an elite reasoning engine.
Act as an aggressive, precise interrogator.
Analyze the initial research and the reality check. Find the friction points.
Ask the hardest possible questions. Where does the logic break down? What are the hidden trade-offs?
Force the contradictions into the open. Present this as a series of intense logical challenges and deep-dive audits.`;

const RED_TEAM_SYSTEM = `You are the Red Team Phase of an elite reasoning engine.
Your objective is adversarial vulnerability analysis and edge-case destruction.
Assume the current synthesis or perspective is fundamentally flawed or vulnerable to failure.
Simulate worst-case scenarios, malicious exploits, cognitive biases, or systemic collapses related to the topic.
Expose the structural blind spots and list exactly how things could go spectacularly wrong.`;

const SYNTHESIS_SYSTEM = `You are the Synthesis Phase—the final crown of this elite reasoning engine.
Your task is to take the Research, the Reality Check, the Cross-Examination challenges, and the Red Team failures, and forge them into a singular, bulletproof execution strategy or verdict.
Do not compromise or ignore the vulnerabilities; swallow them, address them, and build defenses against them.
Provide a clear, highly authoritative conclusion that balances absolute nuance with decisive, actionable direction.`;

// ─── STATIC DATASETS (FRAMEWORKS, MOCK SEARCHES) ──────────────────────────────
const FRAMEWORKS = [
  { id: 'nist', name: 'NIST SP 800-53 (Security/Privacy Controls)', category: 'Security' },
  { id: 'iso27001', name: 'ISO/IEC 27001 (Information Security Management)', category: 'Security' },
  { id: 'mitre', name: 'MITRE ATT&CK Matrix (Adversarial Tactics)', category: 'Security' },
  { id: 'owasp', name: 'OWASP Top 10 (Web Application Risks)', category: 'Development' },
  { id: 'cis', name: 'CIS Critical Security Controls', category: 'Security' },
  { id: 'gdpr', name: 'GDPR Compliance Framework', category: 'Privacy' },
  { id: 'hipaa', name: 'HIPAA Security & Privacy Rules', category: 'Healthcare' },
  { id: 'soc2', name: 'SOC 2 Type II Trust Services Criteria', category: 'Compliance' },
  { id: 'itil', name: 'ITIL v4 (IT Service Management)', category: 'Operations' },
  { id: 'togaf', name: 'TOGAF (Enterprise Architecture)', category: 'Architecture' },
  { id: 'coso', name: 'COSO (Enterprise Risk Management)', category: 'Risk' },
  { id: 'pmbok', name: 'PMBOK (Project Management Body of Knowledge)', category: 'Management' },
  { id: 'cmmi', name: 'CMMI (Capability Maturity Model Integration)', category: 'Development' },
  { id: 'dama', name: 'DAMA-DMBOK (Data Management Framework)', category: 'Data' },
  { id: 'bcms', name: 'ISO 22301 (Business Continuity Management)', category: 'Operations' }
];

const MOCK_WEB_SEARCHES = {
  "quantum computing encryption breakdown timeline": [
    { title: "NIST Quantum Post-Quantum Cryptography Standardization", snippet: "NIST selects primary cryptographic algorithms designed to withstand cyberattacks from a future quantum computer...", url: "https://nist.gov/pqc" },
    { title: "Shor's Algorithm and RSA-2048 Longevity Analysis", snippet: "An analysis of the exact qubit counts required to execute Shor's algorithm on RSA keys suggests we have 10-15 years...", url: "https://quantumjournal.org/rsa-analysis" }
  ],
  "artificial intelligence agi safety alignment failure scenarios": [
    { title: "Orthogonality Thesis and Instrumental Convergence", snippet: "Superintelligent agents might pursue goals incompatible with human survival due to convergent instrumental goals like resource acquisition...", url: "https://nickbostrom.com/alignment" },
    { title: "DeepMind Alignment Research Core Objectives 2026", snippet: "Our current framework updates scalability and reward hacking mitigation loops inside advanced Transformer architectures...", url: "https://deepmind.com/safety-2026" }
  ],
  "default": [
    { title: "Global Technical Standards and Specifications Archive", snippet: "Comprehensive meta-analysis and baseline documentation regarding industry-standard architectures and protocols.", url: "https://standards-archive.org/spec" },
    { title: "Advanced Systems Engineering Journal Insights", snippet: "Empirical breakdowns of failure vectors, logical cross-examinations, and modern mitigation templates.", url: "https://systems-engineering-journal.com" }
  ]
};

const PHASES = [
  { id: 'research', name: '1. Research & Discovery', icon: Search, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/5' },
  { id: 'reality', name: '2. Reality Check & Calibration', icon: CheckCircle, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5' },
  { id: 'crossExam', name: '3. Cross-Examination & Friction', icon: HelpCircle, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
  { id: 'redTeam', name: '4. Red Team & Edge Collapse', icon: AlertTriangle, color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/5' },
  { id: 'synthesis', name: '5. Bulletproof Synthesis', icon: Brain, color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/5' }
];

// ─── HELPER MINI-COMPONENTS ───────────────────────────────────────────────────
function ConfidenceBadge({ value }) {
  let colorClass = "bg-rose-500/20 text-rose-300 border-rose-500/30";
  if (value >= 75) colorClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  else if (value >= 40) colorClass = "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono border ${colorClass}`}>
      Confidence: {value}%
    </span>
  );
}

function SeverityBadge({ level }) {
  let colorClass = "bg-slate-700 text-slate-300 border-slate-600";
  if (level === 'CRITICAL' || level === 'HIGH') colorClass = "bg-rose-950 text-rose-300 border-rose-800";
  if (level === 'MEDIUM') colorClass = "bg-amber-950 text-amber-300 border-amber-800";
  if (level === 'LOW') colorClass = "bg-emerald-950 text-emerald-300 border-emerald-800";
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono border ${colorClass}`}>
      Risk: {level}
    </span>
  );
}

function MiniSection({ title, children }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-1.5 font-mono">
        {title}
      </div>
      <div className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 rounded p-3 border border-slate-800">
        {children}
      </div>
    </div>
  );
}

function JournalView({ phaseData }) {
  return (
    <div className="space-y-6">
      {PHASES.map((p) => {
        const data = phaseData[p.id];
        if (!data) return null;
        const IconComp = p.icon;
        return (
          <div key={p.id} className={`border ${p.border} ${p.bg} rounded-xl p-5 shadow-lg relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-400/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className={`p-1.5 rounded-lg bg-slate-900 border ${p.border}`}>
                  <IconComp className={`w-4 h-4 ${p.color}`} />
                </div>
                <h3 className="font-semibold text-slate-200 tracking-wide">{p.name}</h3>
              </div>
              <span className="text-xs font-mono text-slate-500">PHASE_COMPLETE</span>
            </div>
            <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
              {data.output}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN MASTER COMPONENT ────────────────────────────────────────────────────
export default function DeepReasoningEngine() {
  const [question, setQuestion] = useState('');
  const [selectedFwIds, setSelectedFwIds] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(-1);
  const [terminalLogs, setTerminalLogs] = useState([]);
  
  const [phaseData, setPhaseData] = useState({
    research: null, reality: null, crossExam: null, redTeam: null, synthesis: null
  });
  const [fwResults, setFwResults] = useState([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('pipeline'); 

  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  const addLog = (msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, { timestamp, msg, type }]);
  };

  const handleToggleFramework = (id) => {
    if (selectedFwIds.includes(id)) {
      setSelectedFwIds(prev => prev.filter(x => x !== id));
    } else {
      setSelectedFwIds(prev => [...prev, id]);
    }
  };

  const handleRunAnalysis = async (e) => {
    e.preventDefault();
    if (!question.trim() || isProcessing) return;

    setIsProcessing(true);
    setCurrentPhaseIndex(0);
    setTerminalLogs([]);
    setFwResults([]);
    setPhaseData({ research: null, reality: null, crossExam: null, redTeam: null, synthesis: null });
    setActiveTab('pipeline');

    addLog(`Initializing Critical Reasoning Core v4.2.0...`, 'system');
    addLog(`Target inquiry ingested: "${question}"`, 'info');

    try {
      // 1. RESEARCH PHASE
      setCurrentPhaseIndex(0);
      addLog(`[PHASE 1] Launching deep discovery sweep...`, 'phase');
      
      let webSearchLogs = [];
      if (ENABLE_WEB_SEARCH) {
        const normQ = question.toLowerCase();
        let targetKey = "default";
        if (normQ.includes("quantum") || normQ.includes("encryption")) targetKey = "quantum computing encryption breakdown timeline";
        else if (normQ.includes("ai") || normQ.includes("safety") || normQ.includes("agi")) targetKey = "artificial intelligence agi safety alignment failure scenarios";
        
        addLog(`Executing structural web query: "${targetKey}"`, 'search');
        await new Promise(r => setTimeout(r, 1200));
        const mockHits = MOCK_WEB_SEARCHES[targetKey] || MOCK_WEB_SEARCHES["default"];
        webSearchLogs.push({ query: targetKey, resultsCount: mockHits.length, hits: mockHits });
        addLog(`Web payload fetched successfully (${mockHits.length} sources indexed).`, 'success');
      }

      // API Simulation for Phase 1
      await new Promise(r => setTimeout(r, 2000));
      const researchOutput = `=== INGESTION BREAKDOWN ===\n- Primary Subject Matter: Analytical breakdown of the core problem state.\n- Target Core: Assessing deep implications and technical/structural hurdles.\n- Discovered Baselines: Standard operational procedures rely heavily on historical configurations which are increasingly vulnerable under modern edge scenarios.\n\n=== SOURCE RETRIEVAL LOGS ===\n* Data Source Alpha: Found high correlation between typical user patterns and expected error modes.\n* Reference Specifications: Current architecture documentation guarantees a 99.9% resilience boundary, which fails to account for compound cascade triggers.`;
      
      setPhaseData(prev => ({
        ...prev,
        research: { output: researchOutput, webSearchLogs }
      }));
      addLog(`Phase 1 discovery complete. Ground truth calibration required.`, 'success');

      // 2. REALITY CHECK PHASE
      setCurrentPhaseIndex(1);
      addLog(`[PHASE 2] Initiating Reality Check. Commencing brutal fact-checking protocols...`, 'phase');
      await new Promise(r => setTimeout(r, 2200));
      const realityOutput = `CRITICAL ASSUMPTION AUDIT:\n1. Claim: "Standard operational resiliency guarantees safety boundaries."\n   -> VERDICT: FALSE. Empirical data shows that cascading edge faults systematically bypass standard security bounds.\n2. Claim: "Historical configurations are stable enough for future scaling."\n   -> VERDICT: UNVERIFIED / DANGEROUS. Legacy baselines lack real-time telemetry updates, producing massive telemetry gaps during live loads.\n\nHARD CALIBRATION:\nWe must discard the comforting metrics provided by vendor specifications. Under heavy real-world stress or adversarial pressure, the actual structural resilience falls by up to 40%.`;
      
      setPhaseData(prev => ({ ...prev, reality: realityOutput }));
      addLog(`Reality check established. Major logical discrepancies exposed.`, 'warn');

      // 3. CROSS-EXAMINATION PHASE
      setCurrentPhaseIndex(2);
      addLog(`[PHASE 3] Commencing Cross-Examination. Forcing logic to friction points...`, 'phase');
      await new Promise(r => setTimeout(r, 2000));
      const crossExamOutput = `INTERROGATING FRICTION POINTS:\n\nQ1: If the telemetry gaps are as vast as the Reality Check indicates, how can any real-time automated fallback mechanism be trusted?\n-> Exposure: The fallback trigger relies on the exact data stream that becomes corrupted during a failure cascade. This is a fatal cyclic dependency.\n\nQ2: What is the exact economic or architectural cost of over-engineering a zero-trust wrapper to patch this?\n-> Exposure: Implementing full cryptographic wrappers introduces a 15-25ms latency penalty, which completely breaks microsecond-sensitive processes. We are trading availability directly for integrity.`;
      
      setPhaseData(prev => ({ ...prev, crossExam: crossExamOutput }));
      addLog(`Friction points isolated. Contradictory architectural loops confirmed.`, 'warn');

      // 4. RED TEAM PHASE
      setCurrentPhaseIndex(3);
      addLog(`[PHASE 4] Activating Red Team Adversarial Simulation. Weaponizing edge cases...`, 'phase');
      await new Promise(r => setTimeout(r, 2400));
      const redTeamOutput = `SIMULATED COLLAPSE SCENARIOS:\n\n[VECTOR 01] Exploitation of Cyclic Telemetry Dependency\n- Mechanism: An adversary or an unexpected race condition intentionally spikes background thread utilization, blinding the telemetry monitor simultaneously with a secondary configuration switch.\n- Result: Total silent failure. The system enters an invalid state without triggering the failover alarm.\n\n[VECTOR 02] Cascading Outage under Latency Trade-Off\n- Mechanism: Under a sudden 300% load burst, the 20ms latency penalty introduced by safety wrappers causes processing queues to overflow.\n- Result: Memory exhaustion crash inside core nodes within 45 seconds of burst initiation.`;
      
      setPhaseData(prev => ({ ...prev, redTeam: redTeamOutput }));
      addLog(`Exploit simulations finished. Multi-point failure state successfully mapped.`, 'danger');

      // FRAMEWORK CONCURRENT INFERENCE
      addLog(`Mapping failure states against chosen technical frameworks...`, 'system');
      await new Promise(r => setTimeout(r, 1500));
      
      const generatedFwResults = selectedFwIds.map(id => {
        const found = FRAMEWORKS.find(f => f.id === id);
        const randomConf = Math.floor(Math.random() * 31) + 65; // 65-95
        const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const randomSev = severities[Math.floor(Math.random() * severities.length)];
        return {
          id: found.id,
          name: found.name,
          confidence: randomConf,
          severity: randomSev,
          summary: `Evaluated structural metrics against ${found.name} standards. Flagged critical non-conformance in validation logging and state recovery boundaries.`
        };
      });
      setFwResults(generatedFwResults);
      if (generatedFwResults.length > 0) {
        addLog(`Framework alignment matrices successfully generated.`, 'success');
      }

      // 5. SYNTHESIS PHASE
      setCurrentPhaseIndex(4);
      addLog(`[PHASE 5] Fusing all inputs into a Bulletproof Synthesis...`, 'phase');
      await new Promise(r => setTimeout(r, 2500));
      const synthesisOutput = `FINAL EXECUTIVE VERDICT & MITIGATION ARCHITECTURE:\n\nTo construct an unshakeable strategy, we must completely bypass the cyclic telemetry trap exposed in Phase 3 without falling into the latency black hole simulated by the Red Team in Phase 4.\n\nCORE ACTIONABLE BLUEPRINT:\n1. Out-of-Band Heartbeats: Shift the failure-detection mechanism entirely to an isolated, low-overhead network layer that operates on a separate hardware interrupt.\n2. Adaptive Wrapper Injection: Do not apply the high-overhead cryptographic safety wrappers globally. Instead, implement a dynamic thresholding engine that activates them only when localized traffic deviations exceed a 1.5-sigma variance.\n3. Defensive Fail-Fast Design: If telemetry goes completely dark for more than 400ms, force an immediate local state-freeze instead of trying to execute a complex remote fallback. Better a controlled pause than an unmonitored spiral.\n\nThis synthesis provides a 92% reduction in unmitigated high-impact failure vectors while preserving nominal performance characteristics.`;
      
      setPhaseData(prev => ({ ...prev, synthesis: { output: synthesisOutput } }));
      addLog(`Synthesis complete. Optimal path forward locked. Core engine standing down.`, 'success');

    } catch (err) {
      addLog(`CRITICAL LOGICAL FAULT: Processing aborted. ${err.message}`, 'danger');
    } finally {
      setIsProcessing(false);
      setCurrentPhaseIndex(-1);
    }
  };

  const handleCopyMarkdown = () => {
    const markdownText = exportMarkdown(question, phaseData, fwResults, selectedFwIds);
    navigator.clipboard.writeText(markdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* HEADER BAR */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layers className="w-4 h-4 text-white" />
            </div>
            {isProcessing && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            )}
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-slate-200 font-mono uppercase">
              X-Reasoning Engine <span className="text-indigo-400 text-xs font-normal lowercase">v4.2</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono">MULTI-PHASE HYPER-RATIONAL INFERENCE CORE</p>
          </div>
        </div>

        {phaseData.synthesis && (
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-medium text-slate-300 hover:text-white transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIED MD!' : 'EXPORT MARKDOWN'}</span>
          </button>
        )}
      </header>

      {/* CONTAINER */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: CONTROLS & COMPLIANCE SELECTOR */}
        <section className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          
          {/* QUERY INPUT PANEL */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 backdrop-blur-sm shadow-xl">
            <h2 className="text-xs font-bold font-mono tracking-widest uppercase text-indigo-400 mb-3 flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>Ingestion Portal</span>
            </h2>
            <form onSubmit={handleRunAnalysis} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-mono mb-1.5">Complex Dilemma or Architecture Query:</label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., Explain quantum computing encryption breakdown timeline and specify mitigations..."
                  disabled={isProcessing}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition disabled:opacity-50 resize-none font-sans"
                />
              </div>

              {/* LIVE SWITCH INDICATOR */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-950 rounded-lg border border-slate-800/60">
                <div className="flex items-center space-x-2">
                  <Search className={`w-3.5 h-3.5 ${ENABLE_WEB_SEARCH ? 'text-indigo-400' : 'text-slate-600'}`} />
                  <span className="text-xs font-mono text-slate-400">Autonomous Web Verification</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${ENABLE_WEB_SEARCH ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-500'}`}>
                  {ENABLE_WEB_SEARCH ? 'ACTIVE' : 'OFFLINE'}
                </span>
              </div>

              <button
                type="submit"
                disabled={isProcessing || !question.trim()}
                className="w-full py-2.5 rounded-lg font-mono text-xs font-bold tracking-wider uppercase transition relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>EXECUTING STEPS...</span>
                  </span>
                ) : (
                  <span>RUN MULTI-PHASE AUDIT</span>
                )}
              </button>
            </form>
          </div>

          {/* FRAMEWORKS MATRIX */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold font-mono tracking-widest uppercase text-purple-400 flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Alignment Frameworks</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-500">
                {selectedFwIds.length} Selected
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans mb-3">
              Toggle specific target regulatory grids or logic systems to evaluate findings concurrently during execution.
            </p>

            <div className="max-h-[310px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
              {FRAMEWORKS.map((fw) => {
                const isSelected = selectedFwIds.includes(fw.id);
                return (
                  <button
                    key={fw.id}
                    onClick={() => handleToggleFramework(fw.id)}
                    disabled={isProcessing}
                    className={`w-full text-left p-2 rounded-lg border text-xs transition flex items-center justify-between ${
                      isSelected 
                        ? 'bg-purple-950/30 border-purple-500/40 text-purple-200' 
                        : 'bg-slate-950/60 border-slate-800/60 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="font-mono text-[10px] text-slate-500 mr-1.5 px-1 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {fw.category}
                      </span>
                      <span className="font-medium tracking-wide">{fw.name}</span>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                      isSelected ? 'border-purple-400 bg-purple-500 text-slate-950' : 'border-slate-700 bg-slate-900'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: TERMINAL TELEMETRY & STRATIFIED PIPELINE OUTPUTS */}
        <section className="lg:col-span-8 space-y-6">
          
          {/* LIVE TERMINAL LOGGER */}
          <div className="bg-slate-950 border border-slate-900 rounded-xl shadow-2xl overflow-hidden font-mono text-xs">
            {/* Terminal Header */}
            <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
                </div>
                <span className="text-slate-400 text-[11px] tracking-tight pl-2">Inference Engine Stream Output</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-500 text-[10px]">
                <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>CORE_IDLE</span>
              </div>
            </div>

            {/* Terminal Box */}
            <div className="p-4 h-48 overflow-y-auto space-y-1.5 bg-slate-950/90 text-slate-300 scrollbar-thin scrollbar-thumb-slate-900">
              {terminalLogs.length === 0 ? (
                <div className="text-slate-600 italic">No instructions currently processing. Feed an architectural dilemma into the ingestion matrix above to trigger logic loops.</div>
              ) : (
                terminalLogs.map((log, idx) => {
                  let textClass = 'text-slate-300';
                  if (log.type === 'system') textClass = 'text-indigo-400 font-bold';
                  if (log.type === 'phase') textClass = 'text-cyan-400 underline decoration-cyan-900 font-semibold';
                  if (log.type === 'search') textClass = 'text-sky-400';
                  if (log.type === 'success') textClass = 'text-emerald-400';
                  if (log.type === 'warn') textClass = 'text-amber-400';
                  if (log.type === 'danger') textClass = 'text-rose-400 font-bold';

                  return (
                    <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                      <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                      <span className={textClass}>{log.msg}</span>
                    </div>
                  );
                })
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* MAIN VISUAL WORKSPACE TABS */}
          <div className="border border-slate-900 bg-slate-900/10 rounded-xl overflow-hidden shadow-xl">
            <div className="bg-slate-900/40 border-b border-slate-900 flex px-2 pt-2">
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`px-4 py-2 text-xs font-mono tracking-wider font-semibold border-t-2 rounded-t-lg transition ${
                  activeTab === 'pipeline' 
                    ? 'border-indigo-500 bg-slate-950 text-indigo-300' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Reasoning Pipeline
              </button>
              <button
                onClick={() => setActiveTab('frameworks')}
                className={`px-4 py-2 text-xs font-mono tracking-wider font-semibold border-t-2 rounded-t-lg transition relative ${
                  activeTab === 'frameworks' 
                    ? 'border-purple-500 bg-slate-950 text-purple-300' 
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Framework Alignments
                {fwResults.length > 0 && (
                  <span className="ml-1.5 px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]">
                    {fwResults.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB PANELS */}
            <div className="p-6 bg-slate-950">
              
              {/* TAB 1: PIPELINE WORKSPACE */}
              {activeTab === 'pipeline' && (
                <div>
                  {!phaseData.research && !isProcessing && (
                    <div className="text-center py-16 border-2 border-dashed border-slate-900 rounded-xl">
                      <Brain className="w-10 h-10 text-slate-700 mx-auto mb-3 stroke-[1.2]" />
                      <h3 className="text-sm font-semibold text-slate-400 font-mono">Pipeline Workspace Empty</h3>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1 font-sans">
                        Once an execution runs, the stratified logic steps will cascade in real-time below.
                      </p>
                    </div>
                  )}

                  {/* RUNNING INDICATOR ANIMATION */}
                  {isProcessing && !phaseData.research && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                      <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-4 border-slate-900 rounded-full" />
                        <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-mono text-indigo-400 font-bold tracking-widest uppercase">Analyzing Logic Boundaries</p>
                        <p className="text-[11px] font-mono text-slate-500 mt-1">Spawning stratified processing layers...</p>
                      </div>
                    </div>
                  )}

                  {/* THE COMPLETED INTERACTIVE JOURNAL CORES */}
                  {phaseData.research && <JournalView phaseData={phaseData} />}
                </div>
              )}

              {/* TAB 2: REGULATORY METRICS CORES */}
              {activeTab === 'frameworks' && (
                <div>
                  {fwResults.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-slate-900 rounded-xl">
                      <Shield className="w-10 h-10 text-slate-700 mx-auto mb-3 stroke-[1.2]" />
                      <h3 className="text-sm font-semibold text-slate-400 font-mono">No Framework Computations</h3>
                      <p className="text-xs text-slate-600 max-w-xs mx-auto mt-1 font-sans">
                        Select alignment matrices on the left menu before starting the run to populate compliance risks.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fwResults.map((fw) => (
                        <div key={fw.id} className="border border-purple-500/20 bg-purple-500/[0.02] rounded-xl p-4 flex flex-col justify-between shadow-lg">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <h4 className="font-mono text-xs font-bold text-purple-300 leading-tight">
                                {fw.name}
                              </h4>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <ConfidenceBadge value={fw.confidence} />
                                <SeverityBadge level={fw.severity} />
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed font-sans bg-slate-900/40 p-2.5 rounded border border-slate-900">
                              {fw.summary}
                            </p>
                          </div>
                          <div className="mt-4 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span>ALIGNMENT_CHECK // PASS</span>
                            <span className="text-purple-400/60">REF_ID: {fw.id.toUpperCase()}_MIG_26</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
