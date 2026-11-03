# Verified historical fixtures

`facts.json` is the structured integration handoff. It was manually verified against official primary documents on 27 October 2026. It is not output from a deployed generic extractor and is not a live exchange feed.

## Contents

- Infosys Q3 FY25 and Q4 FY25 transcript evidence: full-year revenue guidance 4.5-5.0% in constant currency versus 4.2% actual; 20-22% operating-margin guidance versus 21.1% actual.
- Infosys Q4 FY25 consolidated Ind AS summary: current, prior quarter and prior-year quarter values for revenue, PBT and total PAT.
- Polycab Q4 FY25 company results release: revenue, reported EBITDA, PAT, and company-reported growth rates.
- Persistent Q4 FY26 company results release: revenue, EBIT, PBT and PAT. EBITDA is not in this source.
- Historical event cards, including the McCamish proposed litigation settlement, MRE acquisition agreement, dividend recommendation and routine RSU grant.

## Use correctly

Preserve historical dates and a visible historical-replay label. Do not call these today's filings. Multiple Infosys events originate in a single financial-results filing. The source-count and event-count are different.

The `page` fields are one-based PDF page positions. The `evidenceQuote` fields are short direct quotes; `evidenceSummary`, event summaries and interpretations are paraphrases or explicit calculations. Do not add further verbatim passages without considering the aggregate quotation limit per source.

Only the two call transcripts are eligible for the stricter pull corpus. Company press releases and quarterly financial statements provide push evidence; they are not annual reports or transcripts.

Persistent and Polycab source units are INR million; multiply by 0.1 to show crore. Infosys is already INR crore. Percentages explicitly prefixed `reported` are rounded company disclosures, not independently recalculated numbers. Do not infer exact prior-period amounts from them.

Infosys total PAT includes non-controlling interests. The owner-attributable number differs. EBITDA is deliberately absent where it is not directly reported. Keep source-specific metric definitions.

## Retrieval record

The Polycab and Persistent PDFs were downloaded directly from official public URLs and extracted using pypdf. Their file hashes and lengths are in `facts.json`; local originals and extraction text are in `raw/`.

Infosys PDFs were inspected through the web reader. Direct Python download requests returned HTTP 403; no bypass was attempted. A public NSE alternative for the April board-outcome document timed out. Consequently, no local Infosys original is represented as downloaded. Its source links and compact verified facts remain available.

`validation.json` checks dates, links between objects, valid page references, quotation lengths and computed Infosys changes. It does not establish universal parsing quality, complete company coverage or the behaviour of a future production pipeline.

## Source links

Every object in `facts.json` resolves to one of the official URLs in its `sources` collection. Main primary sources:

- [Infosys Q3 FY25 transcript](https://www.infosys.com/investors/reports-filings/quarterly-results/2024-2025/q3/documents/transcripts/earningscall.pdf)
- [Infosys Q4 FY25 transcript](https://www.infosys.com/investors/reports-filings/quarterly-results/2024-2025/q4/documents/transcripts/earningscall.pdf)
- [Infosys Q4 FY25 results](https://www.infosys.com/investors/reports-filings/quarterly-results/2024-2025/q4/documents/q4-and-12m-fy25-financial-results-auditorsreports.pdf)
- [Persistent Q4 FY26 results](https://www.persistent.com/wp-content/uploads/2026/04/press-release-q4fy26.pdf)
- [Polycab Q4 FY25 results](https://cms.polycab.com/media/5vpnwedq/press-release-q4fy25.pdf)
