# Self‑Healing Scraper — Master To‑Do List

> **Note** Tasks are grouped into sequential phases. Each phase builds on the output of the previous one; you can release a working MVP after Phase 3 and iterate from there.

---

## Phase 0 ▸ Project Scaffolding & Repo Hygiene

- [ ] 0.1 Initialise **Git** repo on GitHub; add Apache‑2.0 `LICENSE` & text placeholders for `README.md`, `CONTRIBUTING.md`, and `AGENTS.md`.
- [ ] 0.2 Set up **package manager** (PNPM) with `package.json` & `pnpm-workspace.yaml` (if monorepo).
- [ ] 0.3 Configure **TypeScript** (`tsconfig.json`, strict mode) & add basic ESLint + Prettier configs.
- [ ] 0.4 Install baseline deps: `typescript`, `ts-node`, `jest`, `@types/jest`, `puppeteer`, `eslint`, `prettier`.
- [ ] 0.5 Create root directory structure `src/`, `tests/`, `.github/workflows/`.
- [ ] 0.6 Add **Husky** with pre‑commit (lint) and pre‑push (jest) hooks.

---

## Phase 1 ▸ Core Scraper MVP

- [ ] 1.1 Implement `src/scraper/exampleSite.ts` using Puppeteer ― hard‑code a demo URL & selectors.
- [ ] 1.2 Define `ScrapeResult` interface & export `scrape(url): Promise<ScrapeResult>`.
- [ ] 1.3 Build CLI wrapper `src/cli/selfheal.ts scrape` that calls the scraper & logs JSON to stdout.
- [ ] 1.4 Write **Jest unit test** that loads an HTML fixture into `page.setContent()`; assert scraped fields.
- [ ] 1.5 Add golden HTML fixture in `tests/fixtures/exampleSite.html`.
- [ ] 1.6 Ensure `npm test` passes locally & in Husky pre‑push hook.

Deliverable → "scrape & test locally" working demo.

---

## Phase 2 ▸ Storage & Validator

- [ ] 2.1 Create `src/storage/index.ts` with `StorageAdapter` interface ↦ `save()` & `last()` methods.
- [ ] 2.2 Implement `fileStore.ts` (writes `data/YYYY‑MM‑DD‑HH.json`).
- [ ] 2.3 Add lightweight **in‑memory miss counter** via `Map<string,number>` in `validator/validator.ts`.
- [ ] 2.4 Extend CLI (`selfheal.ts scrape`) to: ① call scraper, ② persist JSON, ③ run validator.
- [ ] 2.5 Unit tests for validator edge‑cases (miss threshold, reset on success).

Deliverable → hourly scrape saves JSON & flags drift (without healing yet).

---

## Phase 3 ▸ Healing Orchestrator + Codex Integration

- [ ] 3.1 Scaffold `src/healer/healOrchestrator.ts` with retry logic & Codex fallback.
- [ ] 3.2 Write `src/healer/codexWrapper.ts` that (a) creates `.codex_ctx/` context files, (b) calls `codex -q -a full-auto`, (c) returns pass/fail.
- [ ] 3.3 Draft **AGENTS.md** with rules: always add tests, run `npm test`, commit on green.
- [ ] 3.4 Update CLI mode `selfheal.ts heal` to be triggered when validator indicates drift.
- [ ] 3.5 Integration test: simulate failing selector ⇒ ensure Codex edits scraper & tests pass.
- [ ] 3.6 Implement auto‑commit & push (`git checkout -b heal‑<ts>` ➝ `git push`).
- [ ] 3.7 Add Slack/email alert for cases where Codex fails 3× attempts.

MVP complete – project can self‑patch.

---

## Phase 4 ▸ CI/CD & Containerisation

- [ ] 4.1 Write **GitHub Actions** workflow `scrape.yml` to run `selfheal scrape` hourly via cron.
- [ ] 4.2 Add `heal.yml` workflow triggered on scrape failure to run `selfheal heal`.
- [ ] 4.3 Build `Dockerfile` (multi‑stage) with Node 20 + Puppeteer dependencies.
- [ ] 4.4 Create `docker-compose.yml` for local/server one‑liner deployment.
- [ ] 4.5 Publish image to GHCR or Docker Hub (manual or GHA).

---

## Phase 5 ▸ Extensibility & Plug‑ins

- [ ] 5.1 Implement `sqlStore.ts` using `pg` + SQL schema migration script.
- [ ] 5.2 Add interface checks (`StorageAdapter` type tests).
- [ ] 5.3 Build CLI generator `init-site` to scaffold new scrapers & tests.
- [ ] 5.4 Add readme section "Adding a New Site" with code snippet.
- [ ] 5.5 Create sample `mongoStore.ts` PR (good first issue).

---

## Phase 6 ▸ Production Deploy Recipes

- [ ] 6.1 Provide **Kubernetes CronJob** YAML (+ PVC & secret manifests).
- [ ] 6.2 Author Cloud Run / AWS Lambda wrapper script for on‑demand runs.
- [ ] 6.3 Document scaling guidance (parallel scrapers, CPU/RAM, cost).

---

## Phase 7 ▸ Documentation, Community & Polish

- [ ] 7.1 Finalise full `README.md` with badges, quick‑start, architecture diagram.
- [ ] 7.2 Expand `CONTRIBUTING.md` – PR flow, test coverage expectations.
- [ ] 7.3 Add `CODE_OF_CONDUCT.md`.
- [ ] 7.4 Tag `v0.1.0` release & write change‑log.
- [ ] 7.5 Announce project on README, Twitter / LinkedIn.

---

### Nice‑to‑Have Backlog

- Visual dashboard (Next.js) for scraping health and data trends.
- Heuristic selector repair before invoking Codex to reduce token cost.
- Multi‑tenant config so one repo can host many scrapers with isolated validation thresholds.
- Support for additional LLM providers (Gemini, Mistral) via Codex CLI `--provider` flag.

---

**Legend:**
_✅ Completed 🚧 In‑progress 🟦 Blocked / external dependency_

_End of to‑do list._
