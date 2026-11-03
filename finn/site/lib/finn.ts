import companies from "../data/portfolio.json" with { type: "json" };
export type Priority = "review" | "track" | "routine";
export type Filing = { id: string; symbol: string; category: string; title: string; summary: string; publishedOn: string; sourceId: string; page: number; resultId?: string };

export function classify(event: Pick<Filing, "category" | "title" | "summary">): { priority: Priority; reason: string } {
  const text = `${event.title} ${event.summary}`.toLowerCase();
  if (/resign|auditor.{0,30}(concern|qualification)|default|insolvency|settlement|regulatory order/.test(text)) return { priority: "review", reason: "Governance, legal or financial-risk language requires review." };
  if (/board meeting|meeting notice|newspaper|advertisement/.test(text)) return { priority: "routine", reason: "Administrative notice; not a published financial result." };
  const materialReasons: Record<string, string> = {
    results: "Results announcements can materially affect the investment view.",
    "M&A": "Mergers and acquisitions can change the company’s outlook and valuation.",
    management_change: "Leadership changes can affect strategy and execution.",
    litigation: "Legal proceedings can affect the company’s finances and operations.",
  };
  if (materialReasons[event.category]) return { priority: "review", reason: materialReasons[event.category] };
  if (["dividend", "capex", "credit_rating", "guidance", "bonus_split"].includes(event.category)) return { priority: "track", reason: "Capital allocation or operating update to track." };
  if (event.category === "routine") return { priority: "routine", reason: "Routine administrative disclosure; retained for inspection." };
  return { priority: "track", reason: "Unclassified disclosure retained for review, not silently hidden." };
}

export function selectEvents(events: Filing[], options: { symbols: string[]; from: string; to: string; category: string; reviewed: string[]; hideReviewed: boolean }) {
  const rank = { review: 0, track: 1, routine: 2 };
  const seen = new Set<string>();
  return events.filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return options.symbols.includes(e.symbol) && e.publishedOn >= options.from && e.publishedOn <= options.to && (options.category === "all" || e.category === options.category) && (!options.hideReviewed || !options.reviewed.includes(e.id));
  }).sort((a,b) => rank[classify(a).priority] - rank[classify(b).priority] || b.publishedOn.localeCompare(a.publishedOn) || a.id.localeCompare(b.id));
}

export function change(current: number | null, previous: number | null | undefined): string {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return "Unavailable";
  if (previous <= 0) return `${current > 0 && previous < 0 ? "Loss to profit · " : current < 0 && previous === 0 ? "Zero to loss · " : ""}Δ ${(current - previous).toLocaleString("en-IN", { maximumFractionDigits: 2 })} (source units)`;
  const pct = (current - previous) / previous * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% calculated`;
}

export type Comparable = { symbol: string; metric: string; basis: string; unit: string; targetPeriod: string };
export function compareGuidance(target: Comparable & { lower: number; upper: number; statementDate: string }, outcome: (Comparable & { value: number; publishedOn: string }) | null, asOf: string) {
  if (target.statementDate > asOf) return "Not yet stated";
  if (!outcome || outcome.publishedOn > asOf) return "No outcome in selected corpus";
  if (["symbol", "metric", "basis", "unit", "targetPeriod"].some(k => target[k as keyof Comparable] !== outcome[k as keyof Comparable])) return "Not comparable";
  if (![target.lower, target.upper, outcome.value].every(Number.isFinite) || target.lower > target.upper) return "Not comparable";
  if (outcome.value < target.lower) return `Below range · ${(target.lower - outcome.value).toFixed(1)} ${target.unit === "percent" ? "pp" : target.unit} below lower bound`;
  if (outcome.value > target.upper) return `Above range · ${(outcome.value - target.upper).toFixed(1)} ${target.unit === "percent" ? "pp" : target.unit} above upper bound`;
  return "Within range";
}

export type EvidenceSource = { id: string; symbol: string; title: string; publishedOn: string; pullEligible: boolean; evidenceQuote: string; evidenceSummary: string };
export function searchEvidence<T extends EvidenceSource>(sources: T[], symbol: string, query: string, asOf: string): T[] {
  const terms = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return sources.filter(s => s.pullEligible && s.symbol === symbol.toUpperCase().trim() && s.publishedOn <= asOf && terms.every(term => `${s.title} ${s.evidenceQuote} ${s.evidenceSummary}`.toLowerCase().includes(term)));
}

export const portfolio = companies;
