import { defineConfig } from '@playwright/test';

const baseURL = process.env.VISUAL_BASE_URL || 'https://127.0.0.1:9443';
const target = new URL(baseURL);
const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);

if (!loopbackHosts.has(target.hostname) && process.env.ALLOW_REMOTE_VISUAL_BASELINE !== 'true') {
  throw new Error(
    `Refusing to run visual baselines against non-local host ${target.hostname}. `
      + 'Set ALLOW_REMOTE_VISUAL_BASELINE=true only for an explicitly approved remote comparison.',
  );
}

export default defineConfig({
  testDir: './tests/visual',
  outputDir: './test-results/visual',
  snapshotPathTemplate: '{testDir}/baselines/{projectName}/{arg}{ext}',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.005,
      scale: 'css',
    },
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    browserName: 'chromium',
    colorScheme: 'light',
    ignoreHTTPSErrors: true,
    locale: 'en-SG',
    timezoneId: 'Asia/Singapore',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 },
    },
    {
      name: 'mobile-chromium',
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
