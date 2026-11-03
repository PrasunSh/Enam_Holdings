"use client";

import { useEffect, useRef, useState } from "react";
import facts from "@/data/facts.json";
import { change, classify, compareGuidance, portfolio, searchEvidence, selectEvents, type Filing } from "@/lib/finn";

type Metric = { key: string; label: string; rawLabel?: string; value: number | null; previousQuarter?: number | null; previousYear?: number | null; reportedQoqPct?: number; reportedYoyPct?: number; note?: string; qoqSourcePage?: number };
type Result = { id: string; sourceId: string; page: number; period: string; basis: string; unit: string; normalisationToCrore?: number; metrics: Metric[]; context: string[] };
type Evidence = { sourceId: string; page?: number; note?: string };
const allSymbols = portfolio.map(p => p[0]);
const categories = [...new Set(facts.events.map(e => e.category))];
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default function Home() {
  const [tab, setTab] = useState("Today");
  const [mode, setMode] = useState("replay");
  const [from, setFrom] = useState("2025-04-17");
  const [to, setTo] = useState("2026-04-21");
  const [category, setCategory] = useState("all");
  const [symbols, setSymbols] = useState(allSymbols);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [hideReviewed, setHideReviewed] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [symbol, setSymbol] = useState("INFY");
  const [query, setQuery] = useState("");
  const [asOf, setAsOf] = useState("2025-04-17");
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("finn-v1") || "null");
      if (saved && Array.isArray(saved.symbols) && saved.symbols.every((s: unknown) => typeof s === "string" && allSymbols.includes(s)) && Array.isArray(saved.reviewed) && saved.reviewed.every((s: unknown) => typeof s === "string")) { setSymbols(saved.symbols); setReviewed(saved.reviewed); }
    } catch { setStorageError("Saved preferences could not be loaded. Changes will still work in this session."); }
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem("finn-v1", JSON.stringify({ symbols, reviewed })); } catch { setStorageError("Browser storage is unavailable. Preferences will reset when you leave."); }
  }, [symbols, reviewed, storageReady]);
  useEffect(() => { if (evidence) dialog.current?.showModal(); else dialog.current?.close(); }, [evidence]);
  const events = mode === "replay" ? selectEvents(facts.events, { symbols, from, to, category, reviewed, hideReviewed }) : [];
  const important = events.filter(e => classify(e).priority !== "routine");
  const routine = events.filter(e => classify(e).priority === "routine");
  const sources = searchEvidence(facts.sources, symbol, query, asOf);
  const corpus = searchEvidence(facts.sources, symbol, "", asOf);
  const selectedSource = facts.sources.find(s => s.id === evidence?.sourceId);
  const guidance = facts.guidance.filter(g => g.symbol === symbol.trim().toUpperCase() && g.statementDate <= asOf);
  function toggleReviewed(id: string) { setReviewed(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
  function openEvidence(sourceId: string, page?: number, note?: string) { setEvidence({ sourceId, page, note }); }
  function resultCard(result: Result) {
    return <div className="result-grid"><p className="result-basis">{result.period} · {result.basis} · displayed in INR crore</p>{result.metrics.map(m => <div className="metric" key={m.key}><div><span>{m.label}</span><strong>{m.value === null ? "Unavailable" : (m.value * (result.normalisationToCrore ?? 1)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong></div><p>QoQ: {m.reportedQoqPct !== undefined ? `${m.reportedQoqPct > 0 ? "+" : ""}${m.reportedQoqPct}% reported` : change(m.value, m.previousQuarter)}</p><p>YoY: {m.reportedYoyPct !== undefined ? `${m.reportedYoyPct > 0 ? "+" : ""}${m.reportedYoyPct}% reported` : change(m.value, m.previousYear)}</p>{m.note && <p>{m.note}</p>}<button className="text-button" onClick={() => openEvidence(result.sourceId, result.page, `${m.rawLabel ?? m.label}: ${m.value ?? "not reported"} in original INR ${result.unit}. ${result.normalisationToCrore ? "Crore = original value × 0.1. " : ""}${m.previousQuarter != null ? `Prior quarter: ${m.previousQuarter}; prior year: ${m.previousYear}. Growth = (current − prior) / prior × 100 for positive bases. ` : "Growth rates marked reported are company disclosures; exact prior values are not reconstructed. "}${m.qoqSourcePage ? `Reported QoQ appears on page ${m.qoqSourcePage}. ` : ""}${m.note ?? ""}`)}>Inspect calculation ↗</button></div>)}<div className="result-context">{result.context.map(c => <p key={c}>{c}</p>)}</div></div>;
  }
  function eventCard(event: Filing) {
    const rule = classify(event);
    const result = facts.results.find(r => r.id === event.resultId);
    return <article className={`event-card ${reviewed.includes(event.id) ? "reviewed" : ""}`} key={event.id}>
      <div className="card-meta"><span className={`badge ${rule.priority}`}>{rule.priority}</span><strong>{event.symbol}</strong><span>{event.category}</span><time>{event.publishedOn}</time></div>
      <h3>{event.title}</h3><p>{event.summary}</p><p className="rule-reason">Why this matters: {rule.reason}</p>
      {result && <details><summary>Explore quarterly numbers</summary>{resultCard(result)}</details>}
      <div className="card-actions"><button onClick={() => openEvidence(event.sourceId, event.page)}>View evidence ↗</button><button className="text-button" onClick={() => { setSymbol(event.symbol); setAsOf(event.publishedOn); setQuery(""); setTab("Research"); }}>Check the story →</button><button className="text-button review-action" aria-pressed={reviewed.includes(event.id)} onClick={() => toggleReviewed(event.id)}>{reviewed.includes(event.id) ? "✓ Reviewed · undo" : "Mark reviewed"}</button></div>
    </article>;
  }
  return <div className="finn-app">
    <header className="site-header"><a className="wordmark" href="/">finn<span>●</span></a><span className="tagline">An investor’s attention, well spent.</span><span className="mode-tag">Rules-based prototype</span></header>
    <nav className="main-nav" aria-label="Main navigation">{["Today", "Research", "Portfolio"].map((name, i) => <button key={name} aria-current={tab === name ? "page" : undefined} onClick={() => setTab(name)}><span>0{i + 1}</span>{name}</button>)}</nav>
    <main>
      <div className="notice"><span className="status-dot"/><div>Demo uses verified historical disclosures, shown with their original dates.</div></div>
      {storageError && <p role="status" className="notice">{storageError}</p>}
      {tab === "Today" && <>
        <div className="page-heading"><div><p className="eyebrow">YOUR PORTFOLIO BRIEF</p><h1>Focus on what changed.</h1><p>Read the change. Understand the context. Follow the evidence.</p></div><div className="stat"><strong>{important.length.toString().padStart(2,"0")}</strong><span>items to inspect</span></div></div>
        <div className="toolbar"><label>Data view<select value={mode} onChange={e => setMode(e.target.value)}><option value="replay">Historical replay</option><option value="live">Today · feed unavailable</option></select></label><label>From<input type="date" value={from} disabled={mode !== "replay"} onChange={e => setFrom(e.target.value)}/></label><label>Through<input type="date" value={to} disabled={mode !== "replay"} onChange={e => setTo(e.target.value)}/></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label className="checkbox-label"><input type="checkbox" checked={hideReviewed} onChange={e => setHideReviewed(e.target.checked)}/>Hide reviewed</label></div>
        {mode === "replay" && <div className="coverage-line"><span>{events.length} insight cards · {new Set(events.map(e => e.sourceId)).size} distinct source documents · {symbols.length} selected holdings</span><button className="text-button" onClick={() => { setFrom("2025-04-17"); setTo("2025-04-17"); }}>Replay 17 Apr 2025</button><button className="text-button" onClick={() => { setFrom("2025-04-17"); setTo("2026-04-21"); }}>All historical fixtures</button></div>}
        {mode === "live" ? <div className="empty"><h2>Live monitoring is not connected.</h2><p>As of {today()} (India), we cannot establish what was filed today. Historical examples are available in replay mode.</p><button onClick={() => setMode("replay")}>Explore historical replay</button></div> : from > to || !from || !to ? <p role="alert" className="empty">Choose a valid start and end date. The end must be on or after the start.</p> : <><div className="inbox-layout"><section aria-label="Prioritised items">{important.length ? important.map(eventCard) : <div className="empty"><h2>No matching priority items.</h2><p>Try a wider date range, include reviewed items, or check your selected holdings. This is a limited historical corpus.</p></div>}{routine.length > 0 && <details className="routine"><summary>Routine disclosures · {routine.length}</summary>{routine.map(eventCard)}</details>}</section><aside className="context-panel"><p className="eyebrow">THE COVERAGE NOTE</p><h2>Know what you’re seeing.</h2><p>Seven historical insights come from three results documents. Multiple cards can refer to the same filing.</p><dl><dt>Results coverage</dt><dd>Infosys, Polycab, Persistent</dd><dt>Research coverage</dt><dd>2 Infosys call transcripts</dd><dt>Fixture verification record</dt><dd>27 October 2026</dd></dl><p>Review / Track / Routine are deterministic rules, not investment ratings.</p><button className="text-button" onClick={() => setTab("Portfolio")}>Manage portfolio →</button></aside></div></>}
      </>}
      {tab === "Research" && <>
        <div className="page-heading"><div><p className="eyebrow">THE EVIDENCE WORKSPACE</p><h1>Check the story.</h1><p>Trace management’s expectations to a comparable outcome.</p></div></div>
        <div className="toolbar"><label>NSE symbol<input list="companies" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())}/><datalist id="companies">{portfolio.map(p => <option key={p[0]} value={p[0]}>{p[1]}</option>)}</datalist></label><label>Evidence available as of<input type="date" value={asOf} onChange={e => setAsOf(e.target.value)}/></label><label className="search-label">Search stored excerpts<input type="search" placeholder="Try margin or constant currency" value={query} onChange={e => setQuery(e.target.value)}/></label></div>
        <p className="coverage-line">{corpus.length} eligible transcripts · 0 annual reports · Search covers stored excerpts and editorial summaries, not full documents.</p>
        {!corpus.length ? <div className="empty"><h2>No eligible research evidence for this selection.</h2><p>{symbol || "This company"} has no annual report or transcript in this local corpus by {asOf || "the selected date"}. Results releases are excluded from research. Automatic discovery is not implemented.</p><button onClick={() => { setSymbol("INFY"); setAsOf("2025-04-17"); setQuery(""); }}>Open the Infosys historical case</button></div> : <>
          <div className="section-heading"><h2>Promised versus delivered</h2><span>Curated inputs · calculated comparisons</span></div>
          <div className="guidance-grid">{guidance.map(g => { const actual = g.actual != null && g.actualPublishedOn && g.actualPublishedOn <= asOf ? g.actual : null; const outcome = actual !== null ? { symbol:g.symbol, metric:g.metric, basis:g.basis, unit:g.unit, targetPeriod:g.targetPeriod, value:actual, publishedOn:g.actualPublishedOn! } : null; return <article className="guidance-card" key={g.id}><p className="eyebrow">{g.targetPeriod} · {g.metric}</p><h3>{compareGuidance(g, outcome, asOf)}</h3><p>{g.basis}</p><div className="comparison"><div><small>MANAGEMENT TARGET</small><strong>{g.lower}–{g.upper}%</strong><button className="text-button" onClick={() => openEvidence(g.sourceId, g.page, `${g.speaker}, ${g.role}. Statement date: ${g.statementDate}. Target: ${g.targetPeriod}. This is a manually curated guidance record; metric and period matching were confirmed in the fixture.`)}>Statement ↗</button></div><div><small>REPORTED OUTCOME</small><strong>{actual === null ? "—" : `${actual}%`}</strong>{actual !== null && g.actualSourceId ? <button className="text-button" onClick={() => openEvidence(g.actualSourceId!, g.actualPage)}>Outcome ↗</button> : <span className="small">Not in selected evidence</span>}</div></div><p className="small">Target period: {g.targetPeriodStart} to {g.targetPeriodEnd}. Above or below a range is not a buy/sell recommendation.</p></article>; })}</div>
          <div className="section-heading"><h2>Source excerpts</h2><span>{sources.length} matches · all search terms required</span></div>
          <div className="quick-search">{["", "margin", "constant currency", "guidance"].map(q => <button key={q} onClick={() => setQuery(q)}>{q || "All excerpts"}</button>)}</div>
          {sources.length ? sources.map(s => <article className="source-card" key={s.id}><div className="card-meta"><span className="badge track">Transcript</span><time>{s.publishedOn}</time></div><h3>{s.title}</h3><blockquote>{s.evidenceQuote}</blockquote><p><strong>Curated summary:</strong> {s.evidenceSummary}</p><button onClick={() => openEvidence(s.id)}>Inspect source ↗</button></article>) : <div className="empty">No stored excerpt matches these terms. This does not establish that the full documents omit the topic.</div>}
        </>}
      </>}
      {tab === "Portfolio" && <>
        <div className="page-heading"><div><p className="eyebrow">YOUR MONITORING UNIVERSE</p><h1>A deliberate watchlist.</h1><p>18 proposed mock holdings. Selection controls the historical inbox.</p></div><div className="stat"><strong>{symbols.length}</strong><span>selected companies</span></div></div>
        <p className="notice">Sample portfolio for demonstration. Changes are saved in this browser.</p>
        <div className="quick-search"><button onClick={() => setSymbols(allSymbols)}>Select all</button><button onClick={() => setSymbols([])}>Clear selection</button></div><div className="portfolio-grid">{portfolio.map(([ticker, name, sector]) => <label className="holding" key={ticker}><input type="checkbox" checked={symbols.includes(ticker)} onChange={() => setSymbols(prev => prev.includes(ticker) ? prev.filter(s => s !== ticker) : [...prev, ticker])}/><div><strong>{name}</strong><span>{ticker} · {sector}</span><small>{facts.events.some(e => e.symbol === ticker) ? "Historical results available" : "No source coverage yet"}</small></div></label>)}</div>
      </>}
    </main><footer>FINN / Evidence before interpretation<span>No investment recommendations</span></footer>
    <dialog ref={dialog} onCancel={() => setEvidence(null)} onClose={() => setEvidence(null)} aria-labelledby="evidence-title"><div className="dialog-heading"><p className="eyebrow">SOURCE INSPECTION</p><button aria-label="Close evidence" onClick={() => setEvidence(null)}>✕</button></div>{selectedSource && <><h2 id="evidence-title">{selectedSource.title}</h2><p>{selectedSource.symbol} · published {selectedSource.publishedOn}</p><p className="badge track">{selectedSource.pullEligible ? "Eligible for research" : "Push evidence only"}</p><p>PDF page {evidence?.page ?? selectedSource.relevantPages.join(", ")} of {selectedSource.pages}</p>{evidence?.note && <div className="notice">{evidence.note}</div>}<h3>Stored source excerpt</h3><blockquote>{selectedSource.evidenceQuote}</blockquote><p className="small">Document-level excerpt; may come from another relevant page listed below. Inspect the original for this specific fact.</p><h3>Curated source summary</h3><p>{selectedSource.evidenceSummary}</p><p className="small">Relevant PDF pages: {selectedSource.relevantPages.join(", ")}. Retrieval record: {selectedSource.retrievalStatus}. Source verification is inherited from the existing fixture, not a fresh download.</p><a className="primary-link" href={`${selectedSource.url}#page=${evidence?.page ?? selectedSource.relevantPages[0]}`} target="_blank" rel="noreferrer">Open original document ↗</a></>}</dialog>
  </div>;
}
