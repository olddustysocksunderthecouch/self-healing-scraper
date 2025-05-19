# Self-Healing Scraper

> **Self-Healing Scraper** is an opinionated TypeScript framework that **detects selector drift and automatically patches itself** using an LLM (OpenAI Codex CLI). Ship your scrapers once – they will look after themselves from then on.

---

## ✨ Key Features

• **Self-repairing selectors** – when the HTML layout of the target site changes, the built-in validator flags consecutive extraction failures, kicks off the healing orchestrator and lets Codex submit a pull-request style patch.

• **Plug-and-play storage** – start with simple JSON-on-disk; swap in Postgres, DynamoDB, S3 or anything that implements the `StorageAdapter` interface.

• **Fully typed, battle-tested utilities** – a common `BaseScraper` class, robust retry helpers and Jest fixtures take the pain out of writing site-specific modules.

• **First-class DX** – strict TypeScript, ESLint + Prettier, Vitest/Jest, Husky hooks and GitHub Actions are pre-wired so you can focus on business logic, not boilerplate.

• **Container-ready** – one-command launch with Docker Compose or Kubernetes CronJobs.

---

## 🚀 Quick Start (Local)

Requirements: **Node 20 LTS** (managed automatically if you use [Volta](https://volta.sh)) and **pnpm** ≥ 8.6.

```bash
# 1. Install dependencies
pnpm install

# 2. Run the example scraper (example.com product page)
pnpm scrape https://example.com/product/123

# → JSON result is printed and persisted under ~/.selfheal/data/exampleSite.json
```

If a selector mismatch is detected, the CLI exits with code `2` and logs:

```
⚠️  Drift detected for exampleSite. Healing orchestrator should be triggered.
```

Hook this exit code into your CI/CD (or the provided GitHub Action) to automatically fork the healing pipeline.

### Docker (Optional)

```bash
docker compose up --build selfheal
# or
docker run -it self-healing-scraper:latest scrape https://example.com/product/123
```

---

## 🗄️ Project Layout

```
src/
  scraper/            ▶ site-specific scrapers (exampleSite.ts, …)
  storage/            ▶ StorageAdapter implementations (fileStore, sqlStore, …)
  validator/          ▶ DriftValidator – detects missing fields
  healer/             ▶ Healing orchestrator + Codex wrapper (coming soon)
  cli/                ▶ selfheal.ts – single entry-point binary
tests/                ▶ Jest unit & e2e tests (mirrors src/ structure)
docs/                 ▶ Additional markdown docs
```

Key contracts live under `src/types/` and remain stable across releases.

---

## 🛠️ Development

```bash
# Run type-check & build to ./build
pnpm build

# Auto-recompile on save
pnpm build:watch

# Lint & format
pnpm lint           # ESLint (airbnb-base + prettier)
pnpm prettier       # Fix formatting issues

# Tests
pnpm test           # Jest with Puppeteer runner
pnpm test:coverage  # Generate coverage report
```

Pre-commit hooks run `pnpm lint` automatically. Push hooks execute the full test suite so that broken code never hits `main`.

---

## 📚 Further Reading

• [ARCHITECTURE.md](ARCHITECTURE.md) – deep dive into components and data-flow diagram.

• [AGENTS.md](AGENTS.md) – prompt guidelines & safety rails for the LLM workers.

• [TASK.md](TASK.md) – project roadmap & phased feature checklist.

• [`src/` docs](./src) – inline comments and JSDoc on every public function.

---

## 🤝 Contributing

We **love** contributions! Check out [CONTRIBUTING.md](CONTRIBUTING.md) to get started. All code is licensed under **Apache-2.0**, and we follow the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct.

---

## 📄 License

Copyright © 2025 Adrian Bunge.

Licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.
