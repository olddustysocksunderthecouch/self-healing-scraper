/**
 * Configuration file consumed by `jest-puppeteer`.
 *
 * We spin up a Chromium instance in headless mode; additional Puppeteer
 * launch flags that help stabilise CI runs can be added here later.
 */

export default {
  launch: {
    headless: true,
    // Slow down operations ever so slightly – this tends to make flaky
    // behaviour show up less often when running in constrained CI
    // environments.
    slowMo: 10,
  },
};
