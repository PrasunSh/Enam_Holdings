# FINN — An investor’s attention, well spent

**Current version: 0.1.0 · Documentation updated 3 November 2026**

FINN connects a portfolio-disclosure inbox with source inspection and management-guidance comparisons. The current release includes the public responsive prototype, historical replay, browser-local review tracking, and a mock watchlist.

| Current release | Coverage |
| --- | --- |
| Portfolio | 18 mock holdings |
| Historical inbox | 7 insight cards from 3 results documents |
| Results | Infosys, Polycab, Persistent Systems |
| Research corpus | 2 Infosys earnings-call transcripts; no annual reports |
| Guidance | 3 curated records: 2 FY25 comparisons and 1 FY26 target without an outcome |
| Complete source registry | 6 source records; research eligibility is restricted to the 2 transcripts |
| Persistence | Selected holdings and reviewed item IDs in the current browser |

## Try the public prototype on your phone

**[Open FINN — live prototype](https://finn-investor-intelligence.prasunshrivastav2005.chatgpt.site)**

Open the link in Safari or Chrome on your phone. No installation, sign-in, or API key is required.

### Two-minute trial

1. In **Today**, tap **Replay 17 Apr 2025** to focus on the Infosys historical case.
2. Find **Revenue rises; profit comparison needs context**, expand **Explore quarterly numbers**, then tap **View evidence**. Inspect the source excerpt and use **Open original document** to read the filing.
3. Close the evidence dialog. Mark a card reviewed, then select **Hide reviewed** to remove it from the inbox.
4. Tap **Check the story** to compare management guidance with the reported outcome. In **Research**, try searching for `margin`.
5. In **Portfolio**, deselect Infosys and return to **Today** to see the inbox change. Use **Select all** in Portfolio to restore the sample holdings.

This is a historical, rules-based demonstration using curated evidence, not a live market feed. Holdings and review state are saved only in your current browser. Original documents open on external publisher sites.

Recorded phone verification: browser checks at 320 px and 390 px widths, including navigation, replay, financial details, evidence dialogs, review filtering, research, and portfolio selection. This is responsive-browser testing, not a physical iPhone/Android device test. The current interface uses compact navigation, 16 px form controls on small screens, and centred evidence dialogs.

[View the current mobile screenshot](../../output/design/FINN_Live_Mobile.png). The architecture and mobile concepts in the design folder are planning artifacts; this screenshot shows the prototype.


FINN is a responsive investment-research prototype for the ENAM Holdings AI Engineer Build Challenge. It connects a prioritised portfolio-disclosure inbox with primary-source evidence and management-guidance comparisons.

This version is a **rules-based historical demonstration** using manually verified JSON fixtures. No API keys are required. Live feeds, prices, automatic document discovery, and AI-generated research are not connected to the interface.

## Setup

### Prerequisites

- Node.js **22.13.0 or newer** and npm; Node.js 24 is recommended for running the TypeScript tests.
- Windows, macOS, or Linux. Ordinary local development does not require Bash.
- Internet access for dependency installation and opening original source documents.
- Optional: Python 3.10+ for the standalone experimental market-data collector.

Confirm both `node --version` and `npm --version` work before continuing. If npm is not recognised, install Node.js with npm and reopen the terminal; a standalone Node executable is insufficient for the npm commands below.

### Start development

Run from this directory (`finn/site`):

```sh
npm ci
npm run dev
```

If starting from the repository root, first run `cd finn/site`.

Open **http://localhost:5173**, or the address printed by the server. To choose another port:

```sh
npm run dev -- --port 5174
```

No `.env` file, database setup, migrations, authentication configuration, or AI credentials are needed for the current application. Clean checkouts default to the portable runtime profile.

### Build and preview

```sh
npm run build
npm start
```

Build output is written to `dist/`. The preview runs the built Cloudflare Worker locally; use the URL printed in the terminal. Build before running `npm start`. These commands do not publish the application.

### Checks

```sh
node --experimental-strip-types --test tests/finn.test.mjs
npm run lint
```

There is no `npm test` script. The six existing tests cover classification, date and portfolio filtering, deduplication, reviewed-item filtering, financial changes, guidance comparability, research eligibility, and fixture evidence links. They do not establish live-feed reliability or full browser behaviour.

## Features

### Today — portfolio disclosure inbox

- Replay seven historical insight cards from three results documents covering Infosys, Polycab, and Persistent Systems.
- Filter by dates, selected holdings, and event category.
- See deterministic **Review / Track / Routine** priorities and the reason for each classification. Routine items are collapsed; unknown disclosures remain visible.
- Expand quarterly metrics, inspect calculation notes, and follow source-page links.
- Mark items reviewed, undo review, and hide reviewed items.
- Move directly from a filing into Research using its company and publication date.
- Distinguish insight-card counts from distinct source-document counts.

The live view explicitly reports that monitoring is unavailable. Historical fixtures retain their original dates.

### Research — check the story

- Explore two Infosys earnings-call transcripts using a company selector and an evidence-as-of date.
- Search stored titles, excerpts, and curated summaries; every search term must match. Search does not cover full documents.
- Compare curated FY25 revenue-growth and operating-margin targets with reported outcomes.
- Inspect initial FY26 revenue-growth guidance with no outcome in the selected corpus.
- Check company, metric, basis, unit, target period, and publication dates before comparing guidance with outcomes.
- Inspect source dialogs containing excerpts, summaries, page references, retrieval notes, and original-document links.

No annual reports are included yet. Results releases support the inbox but are excluded from the research corpus. Unsupported companies show an explicit coverage message.

### Portfolio — monitoring universe

- Select from 18 mock holdings across sectors, individually or with select-all/clear actions.
- See which companies have historical results coverage.
- Persist selected holdings and reviewed item IDs in this browser using the `finn-v1` storage key.

These are demonstration holdings, not ENAM’s actual portfolio. Portfolio selection filters Today; Research can be explored independently.

### Financial handling

Financial cards distinguish reported growth from calculated growth, preserve missing values, and convert INR-million source values to INR crore where applicable. Non-positive comparison bases produce absolute changes instead of percentage growth. Source-specific definitions are retained; unavailable EBITDA is not inferred.

## Try the prototype

1. Open Today and choose **Replay 17 Apr 2025**.
2. Expand an Infosys results card and inspect a calculation and its evidence.
3. Mark an item reviewed, then enable **Hide reviewed**.
4. Choose **Check the story** to compare guidance with actual outcomes.
5. Set the research as-of date to `2025-01-16` to inspect the earlier evidence without later outcomes.
6. Change holdings in Portfolio and return to Today to see the effect.

## Implementation

FINN uses React 19, TypeScript, Tailwind CSS 4, and Next.js-style routes served by Vinext/Vite. Its build targets a Cloudflare Worker. Current domain logic uses bundled data; preferences live in browser storage.

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Today, Research, Portfolio, and evidence dialogs |
| `app/globals.css` | Responsive interface styling |
| `lib/finn.ts` | Classification, filtering, growth calculations, guidance comparison, and search |
| `data/facts.json` | Historical evidence used by the application |
| `data/portfolio.json` | Mock portfolio universe |
| `tests/finn.test.mjs` | Domain-logic and fixture-integrity tests |
| `scripts/market_data.py` | Separate experimental market-data collector |
| `worker/index.ts` | Production Worker entrypoint |
| `.openai/hosting.json` | Sites hosting configuration |

Optional D1/Drizzle, R2, authentication, and connector scaffolding remains in the project. FINN does not currently use it for accounts or persistent application records.

The runtime helpers default to portable development on a clean checkout. Sites-managed environments can select their own local execution profile in ignored `.sites-runtime/` state. Keep `.sites-runtime/`, `.wrangler/`, dependencies, and generated builds out of source control. `npm run db:generate` is available for future schema work; it is not required for this prototype.

## Evidence and coverage

The fixture records manual verification on **27 October 2026**, covering three results documents and two transcripts. See the [research notes](../research/README.md) for official sources, accounting definitions, units, and retrieval caveats.

The app reads `data/facts.json`. The research handoff at `../research/facts.json` is separate; editing that file does not automatically update the interface. Update and validate the application fixture deliberately when adding coverage.

Polycab and Persistent source PDFs and extraction text are stored in `../research/raw/`. Infosys evidence has official links and verified facts, but no local original is represented as downloaded. The interface links to original external PDFs.

See the [repository README](../../README.md) for the broader overview and the [project blueprint](../../output/FINN_Project_Blueprint.md) for the original plan. The blueprint includes proposed capabilities that have not shipped.

## Optional experimental collector

The standalone collector uses Python’s standard library to attempt Yahoo Finance daily-price retrieval and NSE announcement retrieval, with an NSE RSS fallback.

Run once from this directory:

```sh
python scripts/market_data.py
```

Or run its local service with a refresh scheduled every 15 minutes:

```sh
python scripts/market_data.py --serve
```

It stores a snapshot under `.sites-runtime/market/snapshot.json` and serves `GET /snapshot` and `POST /refresh` on `127.0.0.1:8788`.

**The interface does not consume this service.** Starting it does not enable live monitoring in FINN. Public endpoints can reject requests, and the RSS fallback cannot guarantee complete date-range coverage. Source status and errors are recorded in the snapshot.

## Troubleshooting

- **Unsupported runtime:** check `node --version` and install a supported Node.js version.
- **Occupied port:** choose another port if another application uses it. If Vinext reports an existing server for this checkout, use that server or stop it before restarting; changing ports does not bypass that guard.
- **Empty inbox:** select holdings, widen the historical date range, and check the hide-reviewed setting. Live mode intentionally has no connected feed.
- **No research evidence:** select `INFY`, use `2025-04-17` as the as-of date, and clear the search.
- **Preferences reset:** browser storage may be unavailable or cleared; the app displays storage errors and remains usable for the session.

## Current limitations

Coverage is deliberately small: results for three companies and research for Infosys only. There is no generic document discovery, automated extraction, conversational research, live-data display, notification delivery, shared review history, or cross-device preference sync. Priorities are transparent rules, not investment ratings.

## Setup verification (3 November 2026)

Verified on Windows with Node.js 24.22.1 and the existing installed dependencies:

- All six domain tests passed.
- The build passed, and the built Worker preview returned HTTP 200 with FINN’s historical inbox at `/`.
- The existing development server on port 5173 returned HTTP 200 with FINN’s historical inbox. A duplicate launch was refused; use the existing server or stop it before restarting. Changing ports does not bypass Vinext’s per-checkout duplicate-server guard.
- All relative Markdown links in both READMEs resolved locally.
- Lint failed with three existing errors in `app/page.tsx`: two `react-hooks/set-state-in-effect` errors in browser-storage handling and one `@next/next/no-html-link-for-pages` error on the home link.

The environment provides Node.js but no npm executable, so `npm ci` failed before installation and a clean dependency install could not be verified. Build, lint, and preview checks used the exact Node entrypoints behind the documented npm scripts. The Worker preview required broader local file access than this session’s restricted execution allowed. These checks verify build and HTTP startup with existing dependencies, not a clean-machine install or interactive browser workflows.

## Potential future work

1. Connect validated live filings and price data with visible freshness, coverage, and failure states.
2. Discover and archive annual reports and transcripts for more companies, preserving dates, versions, and page-level evidence.
3. Automate financial and guidance extraction with unit/basis validation and review of uncertain records.
4. Add evidence-grounded AI research with citations, as-of filtering, abstention, and factual-accuracy evaluations.
5. Track guidance revisions and outcomes across periods; extend analysis to cash flow and capital allocation.
6. Add configurable monitoring thresholds, digests, and notifications.
7. Add authenticated accounts, shared notes, database-backed watchlists, and cross-device persistence.
8. Expand browser, accessibility, extraction, and operational testing.

