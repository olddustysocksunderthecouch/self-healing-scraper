# Self-Healing Scraper — Master To-Do List

> **Note** Tasks are grouped into sequential phases. Each phase builds on the output of the previous one; you can release a working MVP after Phase 3 and iterate from there.

---

## Phase 0 ▸ Project Scaffolding & Repo Hygiene

- [x] 0.1 Initialise **Git** repo on GitHub; add Apache-2.0 `LICENSE` & text placeholders for `README.md`, `CONTRIBUTING.md`, and `AGENTS.md`.
- [x] 0.2 Set up **package manager** (PNPM) with `package.json`.
- [x] 0.3 Configure **TypeScript** (`tsconfig.json`, strict mode) & add basic ESLint + Prettier configs.
- [x] 0.4 Install baseline deps: `typescript`, `ts-node`, `jest`, `@types/jest`, `puppeteer`, `eslint`, `prettier`.
- [x] 0.5 Create root directory structure `src/`, `tests/`, `.github/workflows/`.
- [x] 0.6 Add **Husky** with pre-commit (lint) and pre-push (jest) hooks.

---

## Phase 1 ▸ Core Scraper MVP

Goal: Produce a working scraper for a single site with persistent output and basic drift detection.

- [x] 1.1 Define **data contract** (`types/ScrapeResult.ts`) and export interfaces used across modules.
- [x] 1.2 Implement **Scraper base class** (`src/scraper/BaseScraper.ts`) handling Puppeteer boot-strap, navigation, and teardown.
- [x] 1.3 Create first **site-specific scraper** (`src/scraper/exampleSite.ts`) with Jest fixture + tests under `tests/scraper/exampleSite.test.ts`.
- [x] 1.4 Implement **StorageAdapter** interface and provide **fileStore** default (`src/storage/fileStore.ts`).
- [x] 1.5 Build **Validator** service (`src/validator/index.ts`) that flags N consecutive missing fields (env-configurable).
- [x] 1.6 Wire components together in CLI entry-point `src/cli/selfheal.ts` (mode: scrape-only) and add smoke test.
- [x] 1.7 Update example site to use Property24 rental listing (https://www.property24.com/to-rent/walmer-estate/cape-town/western-cape/10163) as the source for fixtures and tests. (2025-05-27)
- [x] 1.8 Implement dedicated p24Scraper with robust selectors and fallback mechanisms for Property24 site. (2025-05-27)
- [x] 1.9 Add tests for p24Scraper including fixture tests and a skipped live test for manual verification. (2025-05-27)

---

## Phase 2 ▸ Healing Orchestrator & Self-Repair

Goal: Automatically patch broken scrapers when the **Validator** signals selector drift.

| Ref | Task                                                                                                         | Owner | Status |
|-----|--------------------------------------------------------------------------------------------------------------|-------|--------|
| 2.1 | Create **ClaudeWrapper** (`src/healer/claudeWrapper.ts`) that spawns `claude --dangerously-skip-permissions --output-format json`, | core  | ✓ |
|     | streams stdout/stderr, and processes JSON output.                                                          |       | |
| 2.2 | Implement **HealingOrchestrator** (`src/healer/healOrchestrator.ts`) with retry & exponential back-off,      | core  | ✓ |
|     | configurable via env/args, and optional `postSuccess` callback (git auto-commit helper).                      |       | |
| 2.3 | Extend CLI with `--heal` flag – on drift run orchestrator and propagate exit codes (0 success, 3 heal-fail). | core  | ✓ |
| 2.4 | Add Jest tests: mock Claude process, validate retry/back-off & CLI integration.                               | core  | ✓ |
| 2.5 | CI commit automation (`auto-heal:` prefix) will be tackled in Phase 3­ workflows – skipped for now.           | core  | ☐ |
| 2.6 | Create **CLAUDE.md** file with detailed instructions for Claude Code to follow when repairing scrapers.     | core  | ✓ |
| 2.7 | Implement **`scraper-setup` CLI command** that:                                                            | core  | ✓ |
|     | • Takes `<siteId>` and `<url>` (or infers siteId)                                                          |       | |
|     | • Saves an HTML snapshot to `tests/fixtures/<siteId>.html`                                                 |       | |
|     | • Invokes Claude Code to generate `src/scraper/<siteId>.ts` **and** Jest test skeleton                     |       | |
|     | • Auto-commits with `auto-heal:init:` prefix on success                                                    |       | |
|     | • Skips generation if scraper file already exists (idempotent)                                            |       | |

---

## Phase 3 ▸ Scheduling, CI, & Quality Gates

Goal: Run scraper + healer on an hourly cadence and enforce code quality.

- [x] 3.1 Add **GitHub Actions** workflow that executes `pnpm selfheal scrape` on cron schedule (`0 * * * *`). (2025-05-27)
- [x] 3.2 Provide optional **systemd-timer** unit files for non-GitHub environments. (2025-05-27)
- [x] 3.3 Build **CI workflow** (`.github/workflows/ci.yml`) running lint, unit tests, and TypeScript compilation on every PR. (2025-05-27)
- [ ] 3.4 Configure branch protection rules to block merge on red CI.
- [x] 3.5 Ensure Jest coverage ≥ 90 %; add badge in `README.md`. (2025-05-27)

---

## Phase 4 ▸ Memory

Goal: Implement a memory system for the scraper and healing process to track history, enable smarter healing decisions, and preserve scraping results over time.

| Ref | Task                                                                                                         | Owner | Status |
|-----|--------------------------------------------------------------------------------------------------------------|-------|--------|
| 4.1 | Create **ScraperMemory** (`src/memory/ScraperMemory.ts`) to track and persist scraper performance history.   | core  | ☐ |
|     | • Store data in JSONL files organized by scraper ID                                                           |       |        |
|     | • Track drift occurrences with timestamps and affected fields                                                 |       |        |
|     | • Calculate success/failure rates over time                                                                   |       |        |
| 4.2 | Implement **ScrapeHistoryAdapter** interface and file-based implementation (`src/memory/fileHistory.ts`).     | core  | ☐ |
|     | • Save all scrape results in a JSONL file with one entry per scrape                                           |       |        |
|     | • Include timestamp, URL, scraper ID, and full result in each entry                                           |       |        |
|     | • Support filtering/querying history by scraper ID, date range, and success status                            |       |        |
| 4.3 | Add **HealingMemory** (`src/memory/HealingMemory.ts`) to record Claude's healing actions in a markdown file.  | core  | ☐ |
|     | • Create a `HEALING_MEMORY.md` file for each scraper to store healing history                                 |       |        |
|     | • Format each entry with timestamp, affected selectors, and Claude's reasoning                                |       |        |
|     | • Track success/failure of healing attempts with before/after results                                         |       |        |
|     | • Structure the markdown with headers and code blocks for easy human readability                              |       |        |
| 4.4 | Enhance **HealingOrchestrator** to use the `HEALING_MEMORY.md` file for smart retry strategies.              | core  | ☐ |
|     | • Read from `HEALING_MEMORY.md` to check previous successful fixes for similar issues                         |       |        |
|     | • Include relevant sections of the memory file in Claude's prompt to inform healing                           |       |        |
|     | • Parse markdown structure to extract selector patterns and previous solutions                                |       |        |
|     | • Add option to revert to previous working version if multiple heal attempts fail                             |       |        |
| 4.5 | Extend CLI with `--history` flag to display scraper performance statistics and past healing events.           | core  | ☐ |
|     | • Show success rate over time                                                                                 |       |        |
|     | • Display trend analysis of most common drift patterns                                                        |       |        |
|     | • Visualize performance improvements after healing                                                            |       |        |
| 4.6 | Create a **JSONL export utility** that exports all scrape results to a specified directory.                   | core  | ☐ |
|     | • Support incremental exports (only new results since last export)                                            |       |        |
|     | • Include metadata about healing events related to each scrape result                                         |       |        |
|     | • Allow filtering by date range, scraper ID, and result status                                                |       |        |
| 4.7 | Implement **in-memory caching** to optimize performance for frequently accessed history records.              | core  | ☐ |
|     | • Cache recent scrape results and healing attempts                                                            |       |        |
|     | • Use LRU (Least Recently Used) strategy for cache management                                                 |       |        |
|     | • Provide configurable cache size limits                                                                      |       |        |

---

## Phase 5 ▸ Extensibility & Plugin Ecosystem

Goal: Make the framework pluggable for community contributions.

- [ ] 5.1 Implement **sqlStore** (PostgreSQL) adapter conforming to `StorageAdapter` interface.
- [ ] 5.2 Design **plugin loader** that auto-registers additional storage adapters or validators via file naming convention.
- [ ] 5.3 Build **Site Scaffold CLI** (`pnpm selfheal init-site`) generating scraper + test skeletons from templates.
- [ ] 5.4 Document adapter & plugin APIs in `docs/plugins.md`.

---

## Phase 6 ▸ Community & Documentation Polish

Goal: Finalise docs, contribution workflows, and project presentation.

- [ ] 6.1 Fill in **AGENTS.md** with full ruleset for LLM agents (prompt guidelines, safety, etc.).
- [ ] 6.2 Complete **ARCHITECTURE.md** appendices (Rules, Agent Architecture, Integration Points, Troubleshooting).
- [x] 6.3 Expand **README.md** with quick-start, docker instructions, and GIF demo. (2025-05-19)
- [ ] 6.4 Add **ISSUE / PR templates** and **CODE_OF_CONDUCT.md** to `.github/`.
- [ ] 6.5 Publish initial blog post & tweetstorm announcing v0.1.

## Phase 7 ▸ Containerisation & Deployment

Goal: Deliver one-command start via Docker Compose and production-grade K8s manifests.

- [ ] 7.1 Author **multi-stage Dockerfile** (builder → slim runtime) tagged `self-healing-scraper:latest`.
- [ ] 7.2 Create **docker-compose.yml** exposing CLI as a service and mounting local volume for JSON output.
- [ ] 7.3 Supply **Kubernetes CronJob** manifest under `deploy/k8s/cronjob.yaml`.
- [ ] 7.4 Publish image via GitHub Container Registry on release tags.

---