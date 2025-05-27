# Self‑Healing Scraper – Technical Specification

**Version:** 0.1  **Date:** 19 May 2025  **Editors:** Adrian Bunge & Contributors

---

## 1  Background & Purpose

Modern web pages evolve frequently, breaking fragile data‑extraction scripts and creating maintenance overhead. This project delivers a **fully‑autonomous, self‑healing web scraper** that detects selector drift, asks an LLM (Claude Code) to patch itself, validates the patch with unit tests, and commits the fix—without human intervention.

Key goals:

- **Zero‑touch maintenance** – selector breakages are repaired automatically within minutes.
- **Database‑agnostic** – persistence layers are pluggable; default is JSON‑on‑git.
- **Drop‑in deployability** – one‑command launch on a laptop, VM, or Kubernetes.
- **Open‑source friendliness** – clear interfaces, permissive licence, contribution guide.

---

## 2  Architecture Overview

```
┌────────────┐  hourly ┌────────┐ JSON  ┌────────────┐
│   CRON     │ ───────▶│Scraper │──────▶│ Storage    │
└────────────┘         └────────┘       └────────────┘
       │                   │                 ▲
       │                   ▼                 │
       │            ┌────────────┐           │
       │  drift?    │ Validator  │─no drift──┘
       │   yes       └────┬──────┘
       │                  ▼
       │         ┌─────────────────┐ retry ok?
       │         │HealingOrchestra │─────────▶ done
       │         └────┬────────────┘
       ▼              ▼
   claude code CLI  ──patch+tests──▶ Jest ▶ commit ▶ push
```

## Service Components

| Service                  | Responsibilities                                            | Default Implementation                    |
| ------------------------ | ----------------------------------------------------------- | ----------------------------------------- |
| **Scheduler**            | Fire scrape job every hour                                  | GitHub Actions cron or systemd‑timer      |
| **Scraper Registry**     | Select appropriate scraper based on URL patterns            | `ScraperRegistry.ts`                      |
| **Scraper**              | Puppeteer script → returns JSON                             | `src/scraper/<site>.ts`                   |
| **Storage Adapter**      | Persist output + retrieve history                           | `fileStore` (JSON), `sqlStore` (Postgres) |
| **Validator**            | Count consecutive missing fields                            | In‑memory Map (optionally Redis)          |
| **Healing Orchestrator** | Retry → invoke Claude Code → gate on tests → commit               | `healOrchestrator.ts`                     |
| **Claude Code Wrapper**  | Spawn `claude --dangerously-skip-permissions --output-format json`, pass context, capture output | `claudeWrapper.ts`                         |
| **CI Runner**            | Run `npm test`, block merge on red                          | GitHub Actions, local hook                |

## Service Descriptions

### Scheduler

Responsible for triggering scrape jobs at regular intervals (hourly). Can be implemented using either GitHub Actions cron jobs or systemd timers.

### Scraper Registry

Manages all available scrapers and automatically selects the appropriate one based on URL patterns. Implements pattern matching with support for wildcards and named parameters.

### Scraper

Core component that executes Puppeteer scripts to scrape websites and returns structured JSON data. Implemented as site-specific modules in `src/scraper/`. Each scraper defines URL patterns it can handle.

### Storage Adapter

Handles data persistence and retrieval. Supports multiple storage backends:

- `fileStore`: JSON-based file storage
- `sqlStore`: PostgreSQL database storage

### Validator

Monitors and validates scraped data by tracking consecutive missing fields. Uses an in-memory Map by default, with optional Redis integration.

### Healing Orchestrator

Manages the self-healing process:

1. Retries failed scrapes
2. Invokes Claude Code for fixes
3. Validates changes through tests
4. Commits successful fixes

### Claude Code Wrapper

Interface to the Claude Code CLI system:

- Spawns `claude` processes with autonomous flags
- Uses `--dangerously-skip-permissions` to run without user interaction
- Outputs structured data via `--output-format json`
- Pipes context through command input
- Parses and processes JSON responses
- Manages error handling and retry logic

### CI Runner

Ensures code quality through:

- Running `npm test`
- Blocking merges on test failures
- Supports both GitHub Actions and local pre-commit hooks

---

## 3  Standards & Conventions

### 3.1 Code & Tooling

- **Language:** TypeScript 5, `"strict": true`.
- **Runtime:** Node 20 LTS, Puppeteer 22 (bundled Chromium).
- **Style:** ESLint Airbnb base + Prettier.
- **Testing:** Jest + `@testing-library/dom` for selector assertions.
- **Commits:** Conventional Commits; auto‑heal messages use `auto-heal:` prefix.
- **LLM Guide:** `CLAUDE.md` at repo root supplies system instructions (Always write tests, never remove existing ones, run `npm test` until green, etc.).

### 3.2 Security & Compliance

- Claude Code runs **network‑sandboxed**; only target URL is fetched by Puppeteer.
- Secrets (e.g., `ANTHROPIC_API_KEY`) injected via env vars or GitHub OIDC—not checked into git.
- HTML snapshots truncated to ≤ 1 MB before entering LLM prompt.
- Uses `CLAUDE.md` in project root to maintain context and provide guidance to Claude Code.
- Permissions skipping (`--dangerously-skip-permissions`) only used in automated CI environments.

### 3.3 Repository Layout (excerpt)

```
src/
  scraper/            ▶ site‑specific scrapers + ScraperRegistry
  storage/            ▶ pluggable adapters (file, sql, …)
  validator/          ▶ drift detection logic
  healer/             ▶ orchestration + Claude Code wrapper
  cli/                ▶ `selfheal.ts` entry‑point
  utils/              ▶ utility functions (e.g., URL pattern matching)
.tests/
.docker/
.github/workflows/
CLAUDE.md
```

---

## 4  Optimised for Community Adoption

### 4.1 One‑Command Start

```bash
# local machine
pnpm install && pnpm selfheal scrape

# server / any OS
docker compose up --build -d
```

### 4.2 Extensible Plugin Interfaces

- **StorageAdapter**

  ```ts
  export interface StorageAdapter {
    save(ts: Date, data: Record<string, unknown>): Promise<void>;
    last(n: number): Promise<Record<string, unknown>[]>;
  }
  ```

  Contributors can drop `mongoStore.ts`, `dynamoStore.ts`, etc. without touching core.

- **Site Scaffold CLI**

  ```bash
  pnpm selfheal init-site myshop \
      --url https://shop.com/p/123 \
      --selector price='.price' title='h1' sku='[data-sku]'
  ```

  Generates scraper stub, fixture, and Jest tests—lowering onboarding friction.

### 4.3 Containerised, but not Required

- Docker Compose uses multi‑stage build (node‑builder → slim‑runtime) for 250 MB image.
- Kubernetes CronJob YAML provided in `/deploy/k8s/` for production clusters.
- Native execution remains first‑class for hobbyists.

### 4.4 Open‑Source Hygiene

- **License:** Apache‑2.0 (compatible with Claude Code terms).
- **CONTRIBUTING.md** – PR flow, coding standards, CLA bot.
- **Issue templates** – bug, feature request, site addition.
- **Automated lint/test in CI** – keeps main branch healthy for everyone.

---

## 5  Appendices

### A. Environment Variables

| Name                | Purpose                             | Example                         |
| ------------------- | ----------------------------------- | ------------------------------- |
| `ANTHROPIC_API_KEY` | Auth for Claude Code CLI            | `sk-ant-api...`                 |
| `SCRAPE_URL`        | Target URL (or list)                | `https://example.com/product/1` |
| `MISS_THRESHOLD`    | N consecutive misses before healing | `3`                             |
| `STORAGE_ADAPTER`   | `file`, `sql`, `mongo`, …           | `file`                          |

### B. Glossary

- **Selector drift** – change in site HTML that causes previously valid CSS/XPath selectors to fail.
- **Healing** – automated edit‑compile‑test‑commit cycle executed by Claude Code.
- **Golden fixture** – static snapshot of HTML saved for regression tests.