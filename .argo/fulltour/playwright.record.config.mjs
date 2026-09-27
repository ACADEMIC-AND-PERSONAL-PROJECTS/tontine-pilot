import { defineConfig } from '@playwright/test';

export default defineConfig({
  preserveOutput: 'always',
  outputDir: "/home/khadim/Desktop/PROJECTS/HACKATHONS/AWS/ZERO-TO-SHIPPED/TONTINE-PILOT/tontine-pilot/test-results",
  retries: 0,
  projects: [
    {
      name: 'demos',
      testDir: "/home/khadim/Desktop/PROJECTS/HACKATHONS/AWS/ZERO-TO-SHIPPED/TONTINE-PILOT/tontine-pilot/demos",
      testMatch: "fulltour.demo.ts",
      use: {
        headless: true,
        browserName: "chromium",
        baseURL: "http://localhost:3101",
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        video: 'off',
        trace: 'off',
      },
    },
  ],
});
