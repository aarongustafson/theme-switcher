import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './test/browser',
	fullyParallel: true,
	workers: 2,
	use: { baseURL: 'http://theme-switcher.test' },
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', use: { ...devices['Desktop Safari'] } },
	],
});
