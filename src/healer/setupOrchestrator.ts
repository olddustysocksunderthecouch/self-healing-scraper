import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CodexWrapper } from './codexWrapper.js';
import { gitAutoCommit } from './healOrchestrator.js';

/**
 * Orchestrates the *initial* scraper generation for a new site. It stores an
 * HTML snapshot that Codex can reference in tests and invokes the Codex CLI
 * to author `src/scraper/<siteId>.ts` plus a matching Jest test.
 */
export interface SetupOptions {
  commit?: boolean; // default true
}

export class SetupOrchestrator {
  private readonly codex: CodexWrapper;
  private readonly commit: boolean;

  constructor(
    codex: CodexWrapper = new CodexWrapper(),
    { commit = true }: SetupOptions = {},
  ) {
    this.codex = codex;
    // Allow tests to disable git operations via env variable
    this.commit = process.env.SKIP_GIT_COMMIT === '1' ? false : commit;
  }

  /**
   * Ensure fixtures directory exists and write snapshot.
   */
  private async saveSnapshot(siteId: string, url: string): Promise<string> {
    const fixturesDir = path.resolve('tests/fixtures');
    await fs.mkdir(fixturesDir, { recursive: true });

    const targetPath = path.join(fixturesDir, `${siteId}.html`);

    // Fast-path: source is already a local HTML file (file:// URL)
    if (url.startsWith('file://')) {
      const srcPath = fileURLToPath(url);
      await fs.copyFile(srcPath, targetPath);
      return targetPath;
    }

    // Fallback: fetch via HTTP(S)
    // Node 20 provides global fetch.
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch HTML (${res.status})`);

    const html = await res.text();
    await fs.writeFile(targetPath, html, 'utf8');
    return targetPath;
  }

  /**
   * Run Codex once to create the scraper. Returns true on success.
   */
  private async runCodex(siteId: string, snapshotPath: string, url: string): Promise<boolean> {
    // For now we simply rely on the repository context + the snapshot path
    // being present. Additional prompt engineering could be passed via
    // environment variables or a temporary instruction file.

    // Example plan: pass env var so prompts can reference it in pre-commit
    const exitCode = await this.codex.run([
      '--context', snapshotPath,
      '--var', `SITE_ID=${siteId}`,
      '--var', `TARGET_URL=${url}`,
    ]);

    return exitCode === 0;
  }

  /**
   * Public entry point. Handles the full flow.
   */
  async setup(siteId: string, url: string): Promise<boolean> {
    const scraperFile = path.resolve(`src/scraper/${siteId}.ts`);
    const exists = await fs
      .stat(scraperFile)
      .then(() => true)
      .catch(() => false);

    if (exists) {
      console.log(`✅  Scraper for '${siteId}' already exists – skipping generation.`);
      return true;
    }

    console.log(`📸  Saving HTML snapshot for ${url}…`);
    const snapshot = await this.saveSnapshot(siteId, url);

    console.log('🤖  Invoking Codex to generate scraper…');
    const success = await this.runCodex(siteId, snapshot, url);

    if (success && this.commit) {
      console.log('📝  Committing generated scraper…');
      try {
        await gitAutoCommit(`initial ${siteId} scraper`);
      } catch (err) {
        console.warn('⚠️  Git commit failed:', err);
      }
    }

    return success;
  }
}
