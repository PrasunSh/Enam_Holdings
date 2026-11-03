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

[View the current mobile screenshot](output/design/FINN_Live_Mobile.png). The architecture and mobile concepts in the design folder are planning artifacts; this screenshot shows the prototype.


FINN is a responsive investment-research prototype built for the **ENAM Holdings AI Engineer Build Challenge**. It explores two connected workflows: help an investor identify portfolio disclosures worth reviewing, then inspect the primary evidence and compare management guidance with reported outcomes.

The current application is a **rules-based historical demonstration**. It runs on curated JSON fixtures, makes no model calls, and requires no API keys. Live exchange monitoring, prices, automatic document discovery, and generated research are not connected to the application.

## Setup instructions

### Prerequisites

- Node.js **22.13.0 or newer** and npm. Node.js 24 is recommended for the TypeScript test command below.
- Windows, macOS, or Linux. Bash is not required for ordinary local development.
- Internet access to download dependencies; original evidence links also require internet access.
- Python 3.10+ only if you want to experiment with the separate market-data collector.

Confirm both `node --version` and `npm --version` work before continuing. If npm is not recognised, install Node.js with npm and reopen the terminal; a standalone Node executable is insufficient for the npm commands below.

### Run locally

From this repository’s root:

```sh
cd finn/site
npm ci
npm run dev
```

Open **http://localhost:5173**. Use the address printed by the development server if a different port is selected. To specify a port:

```sh
npm run dev -- --port 5174
```

No `.env` file, AI credentials, database provisioning, or migrations are needed for the current FINN workflows. A clean checkout defaults to the portable runtime profile.

### Build and preview

Run these commands from `finn/site`:

```sh
npm run build
npm start
```

The build produces `dist/`. The preview runs the built Cloudflare Worker locally; open the URL printed in the terminal. `npm start` requires a successful build and does not publish the application.

### Checks

```sh
node --experimental-strip-types --test tests/finn.test.mjs
npm run lint
```

The six existing test cases cover prioritisation rules, filtering and deduplication, missing/non-positive growth bases, guidance comparability and date boundaries, research-corpus restrictions, and evidence-link integrity. They do not verify a live data pipeline or full browser behaviour. There is currently no `npm test` script.

### Troubleshooting

- **Unsupported Node version:** check `node --version` and upgrade to a supported version before installing.
- **Port already occupied:** choose another port if another application uses it. If Vinext reports an existing server for this checkout, use that server or stop it before restarting; changing ports does not bypass that guard.
- **Preferences do not persist:** the app uses browser storage and shows a message when storage cannot be read or written. It remains usable for the current session.
- **Empty inbox:** select holdings in Portfolio, widen the historical date range, and check whether reviewed items are hidden. The live view intentionally reports that monitoring is unavailable.
- **No research matches:** use `INFY`, an as-of date of `2025-04-17`, and an empty search to open the supported historical case.

## Current features

### 1. Today: portfolio disclosure inbox

- Historical replay with date-range, company-selection, and event-category filters.
- Seven curated insight cards derived from three results documents covering Infosys, Polycab, and Persistent Systems. Card counts and distinct-document counts are shown separately.
- Deterministic **Review / Track / Routine** priorities, with a visible explanation for each classification. Governance, legal, and financial-risk language can override a routine category; unknown disclosures remain visible.
- Priority sorting and a collapsible routine-disclosures section.
- Mark items as reviewed, undo review, and optionally hide reviewed items.
- Expand quarterly financial metrics and inspect their source units and calculations.
- Jump from a disclosure to the company’s Research view with its publication date selected.
- An explicit unavailable state for today’s live feed, rather than presenting historical examples as current filings.

### 2. Research: check the story

- Company selection and an **evidence available as of** date to exclude later evidence.
- Keyword search over stored transcript excerpts, titles, and curated summaries. Every search term must match; this is not semantic search or full-document search.
- Two eligible Infosys earnings-call transcripts; no annual reports are currently included.
- Curated FY25 revenue-growth and operating-margin guidance compared with actual outcomes.
- Initial FY26 revenue-growth guidance with no outcome in the selected corpus.
- Comparability checks for company, metric, basis, unit, target period, and publication date. Results distinguish within, above, and below range, missing outcomes, and non-comparable records.
- Evidence dialogs with publication dates, PDF page references, stored excerpts, retrieval notes, and links to original documents.

### 3. Portfolio: monitoring universe

- An editable selection of **18 mock holdings** across sectors, with select-all and clear-selection actions.
- A coverage indicator for holdings with historical results evidence.
- Selected holdings and reviewed item IDs persist in the current browser under the `finn-v1` storage key.

These are demonstration holdings, not a representation of ENAM’s actual portfolio. Portfolio selection controls the inbox; Research can be explored independently.

### Financial and evidence handling

- Financial cards retain source-specific definitions and distinguish reported growth from calculated growth.
- INR-million values are converted to INR crore using the stored conversion factor; Infosys values are already in crore.
- Missing values remain unavailable. Non-positive comparison bases produce absolute changes instead of misleading percentage growth.
- EBITDA is not inferred where the source does not report it, and Infosys total PAT is distinguished from owner-attributable PAT in the fixture notes.
- Results releases support inbox evidence but are excluded from the stricter transcript/annual-report research corpus.

## Suggested walkthrough

1. Open **Today** and select **Replay 17 Apr 2025** to inspect the Infosys case.
2. Expand a results card, inspect a calculation, and open the original evidence.
3. Mark an item reviewed and enable **Hide reviewed**.
4. Select **Check the story** to move into Research. Compare revenue-growth and margin targets with outcomes.
5. Move the as-of date to `2025-01-16` to see the earlier evidence without the subsequent outcome.
6. Open **Portfolio**, change the selected holdings, and return to Today to see the filtering effect.

## Implementation and repository structure

The interface uses React 19, TypeScript, Tailwind CSS 4, and Next.js-style application routes, served through **Vinext/Vite**. The built application targets a Cloudflare Worker. FINN’s current domain logic runs against bundled fixtures; user preferences are stored locally in the browser.

```text
README.md                         Project overview and setup
finn/
  site/
    app/page.tsx                  Today, Research, Portfolio, evidence dialogs
    app/globals.css               Responsive interface styling
    lib/finn.ts                   Classification, filtering, growth, comparison, search
    data/facts.json               Application’s historical evidence fixtures
    data/portfolio.json           18-company mock universe
    tests/finn.test.mjs           Domain-logic and fixture-integrity tests
    scripts/market_data.py        Standalone experimental collector
    worker/index.ts              Cloudflare Worker entrypoint
    .openai/hosting.json          Sites hosting configuration
  research/
    README.md                     Fixture methodology and source caveats
    facts.json                    Research handoff dataset
    validation.json               Research validation record
    raw/                          Extracted source text (publisher PDFs linked in research README)
output/
  FINN_Project_Blueprint.md        Original design and implementation plan
  design/                        Architecture and mobile design concepts
```

[The application README](finn/site/README.md) provides FINN-specific setup, features, and runtime notes from the application directory. Optional D1/Drizzle, R2, authentication, and connector scaffolding is present, but FINN does not currently use it for accounts or persistent application records. The blueprint describes intended scope and future architecture, not a list of shipped features.

## Data provenance and scope

The fixture records manual verification on **27 October 2026**. It includes three results documents and two Infosys transcripts, with original historical publication dates preserved. See [the research notes](finn/research/README.md) for source links, units, definitions, and retrieval limitations.

The application loads `finn/site/data/facts.json`; the research handoff is separately stored in `finn/research/facts.json`. Changes to the research copy do not automatically update the application. Update and validate the application fixture deliberately when extending coverage.

Polycab and Persistent originals and extracted text are stored under `finn/research/raw/`. Infosys evidence retains official links and verified facts, but no local Infosys original is represented as downloaded. Evidence inspection links to the external PDFs rather than serving a complete local document archive.

### Experimental market-data collector

`finn/site/scripts/market_data.py` is a separate standard-library Python tool. It attempts to retrieve Yahoo Finance daily price data and NSE announcements, with an NSE RSS fallback. It caches snapshots under `finn/site/.sites-runtime/market/snapshot.json` and records source status/errors.

From `finn/site`, run a single refresh:

```sh
python scripts/market_data.py
```

Or start its local service with a scheduled refresh every 15 minutes:

```sh
python scripts/market_data.py --serve
```

The service binds to `127.0.0.1:8788` and exposes `GET /snapshot` and `POST /refresh`. **The current interface does not consume these endpoints.** Starting the collector does not enable live data in FINN. Public endpoints may reject requests, and RSS fallback does not establish complete date-range coverage. This collector is experimental, rather than a validated production feed.

## Current limitations

- **Data and integrations:** the app uses manually verified historical JSON fixtures with original publication dates. No live exchange feed, price feed (including EOD prices), AI calls, or automatic document discovery is connected. The separate experimental collector does not supply the interface.
- **Demonstration portfolio:** holdings are samples, not ENAM’s portfolio. Selections and review preferences are saved only in the current browser; they do not sync across devices or users.
- **Alerts:** alert execution and notification delivery are not connected.
- The prototype demonstrates the inbox-to-evidence workflow, rather than the full challenge scope.
- Historical results cover three companies; eligible research covers only Infosys. Selecting another holding does not trigger document discovery.
- No model-backed extraction, generated answers, conversational research, or automated management analysis is implemented.
- Search covers stored excerpts, and guidance records are manually curated.
- No FINN account or shared review workflow is implemented.
- Priorities are transparent rules, not investment ratings or buy/sell recommendations.

## Setup verification (3 November 2026)

Verified on Windows with Node.js 24.22.1 and the existing installed dependencies:

- All six domain tests passed.
- The build passed, and the built Worker preview returned HTTP 200 with FINN’s historical inbox at `/`.
- The existing development server on port 5173 returned HTTP 200 with FINN’s historical inbox. A duplicate launch was refused; use the existing server or stop it before restarting. Changing ports does not bypass Vinext’s per-checkout duplicate-server guard.
- All relative Markdown links in both READMEs resolved locally.
- Lint failed with three existing errors in `app/page.tsx`: two `react-hooks/set-state-in-effect` errors in browser-storage handling and one `@next/next/no-html-link-for-pages` error on the home link.

The environment provides Node.js but no npm executable, so `npm ci` failed before installation and a clean dependency install could not be verified. Build, lint, and preview checks used the exact Node entrypoints behind the documented npm scripts. The Worker preview required broader local file access than this session’s restricted execution allowed. These checks verify build and HTTP startup with existing dependencies, not a clean-machine install or interactive browser workflows.

## Potential future work

1. **Connect reliable live data.** Integrate and validate the collector or an authorised provider, expose freshness and partial-coverage states, and add ingestion scheduling, deduplication, and failure recovery.
2. **Expand primary-source coverage.** Discover and archive annual reports and transcripts for arbitrary supported NSE companies, retaining document versions, hashes, publication dates, and page-level citations.
3. **Automate extraction with validation.** Extract financial results and management guidance into typed records, validate units and accounting bases, flag uncertainty, and retain human review for ambiguous facts.
4. **Add evidence-grounded AI research.** Introduce retrieval and cited answers over approved primary documents, with as-of filtering, explicit abstention, and evaluations for factual accuracy and citation support.
5. **Track guidance over time.** Link initial targets, revisions, withdrawals, and comparable outcomes across periods; extend analysis to cash flow, capital allocation, and narrative-versus-numbers checks.
6. **Make monitoring configurable.** Add materiality thresholds, event preferences, price/volume context, scheduled digests, and notification delivery.
7. **Persist and share workflows.** Add authenticated accounts, database-backed watchlists, review history, notes, and cross-device access.
8. **Strengthen evaluation and operations.** Add end-to-end browser and accessibility checks, extraction benchmarks, broader company/sector cases, monitoring, and deployment automation.


## Public source distribution

This copy excludes temporary work, deployment archives, downloaded PDFs, build output, dependencies, local credentials, and existing Git history. The hosting manifest retains only the empty storage configuration needed for local builds; it does not identify the original hosting project. The public demo URL is intentionally retained so reviewers can try the prototype.

Install and run from `finn/site` using the setup instructions above. To deploy your own instance, configure your own hosting project. Do not copy production credentials into source files or browser code.
