import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const paths = [
	'theme-switcher.js',
	'define.js',
	'index.js',
	'test/browser.html',
	'test/browser.js',
	'test/peer.html',
	'test/observe.js',
	'demo/styles.css',
	'demo/system.svg',
	'demo/light.svg',
	'demo/dark.svg',
	...[
		'index.js',
		'define.js',
		'form-multi-switch.js',
		'form-multi-switch.css',
	].map((file) => `node_modules/@aarongustafson/form-multi-switch/${file}`),
];
const files = new Map(
	await Promise.all(
		paths.map(async (path) => [
			`/${path}`,
			await readFile(new URL(`../../${path}`, import.meta.url), 'utf8'),
		]),
	),
);

test.beforeEach(async ({ page }) => {
	await page.route('**/*', async (route) => {
		const url = new URL(route.request().url());
		if (url.pathname === '/fixture') {
			await route.fulfill({
				contentType: 'text/html',
				body: `<!doctype html><html lang="en"><head>
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<link rel="stylesheet" href="/demo/styles.css">
					${url.searchParams.has('external') ? '<link id="form-multi-switch-styles" rel="stylesheet" href="/node_modules/@aarongustafson/form-multi-switch/form-multi-switch.css">' : ''}
					<script type="importmap">{"imports": {
						"@aarongustafson/form-multi-switch": "/node_modules/@aarongustafson/form-multi-switch/index.js"
					}}</script>
					<script type="module" src="/define.js"></script>
				</head><body><form><fieldset id="ancestor"><legend>Theme controls</legend>
					<theme-switcher id="control" name="appearance" label="Reading appearance"
						storage-key="theme-switcher-browser" style="inline-size:30rem">
						${
							url.searchParams.has('authored')
								? `<fieldset><legend>Reading appearance</legend>
							<label><input type="radio" name="appearance" value="system" checked>System</label>
							<label><input type="radio" name="appearance" value="light">Light</label>
							<label><input type="radio" name="appearance" value="dark" ${url.searchParams.has('disabled-choice') ? 'disabled' : ''}>Dark</label>
						</fieldset>`
								: ''
						}
					</theme-switcher></fieldset>
					<button type="reset">Reset appearance</button>
				</form></body></html>`,
			});
			return;
		}
		const body = files.get(url.pathname);
		if (body === undefined) {
			await route.abort();
			return;
		}
		await route.fulfill({
			body,
			contentType: url.pathname.endsWith('.html')
				? 'text/html'
				: url.pathname.endsWith('.css')
					? 'text/css'
					: url.pathname.endsWith('.svg')
						? 'image/svg+xml'
						: 'text/javascript',
		});
	});
});

async function mount(page, authored, external) {
	const query = new URLSearchParams();
	if (authored) query.set('authored', '');
	if (external) query.set('external', '');
	await page.goto(`/fixture?${query}`);
	await page.evaluate(async () => {
		await customElements.whenDefined('theme-switcher');
		await document.querySelector('#control').ready;
	});
	return page.locator('#control');
}

async function state(page) {
	return page.evaluate(() => {
		const control = document.querySelector('#control');
		return {
			value: control.value,
			theme: document.documentElement.dataset.theme,
			saved: localStorage.getItem('theme-switcher-browser'),
			submitted: new FormData(document.querySelector('form')).get(
				'appearance',
			),
		};
	});
}

function radioTabKey(browserName) {
	// macOS WebKit follows the native form-control Tab preference.
	return browserName === 'webkit' && process.platform === 'darwin'
		? 'Alt+Tab'
		: 'Tab';
}

function contrast(first, second) {
	const luminance = (color) => {
		const channels = color
			.match(/[\d.]+/g)
			.slice(0, 3)
			.map(Number);
		return channels.reduce((sum, channel, index) => {
			const value = channel / 255;
			const linear =
				value <= 0.04045
					? value / 12.92
					: ((value + 0.055) / 1.055) ** 2.4;
			return sum + linear * [0.2126, 0.7152, 0.0722][index];
		}, 0);
	};
	const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
	return (values[0] + 0.05) / (values[1] + 0.05);
}

for (const colorScheme of ['light', 'dark']) {
	for (const external of [false, true]) {
		test(`${colorScheme}, ${external ? 'external' : 'injected'} CSS: inherited text, selection, icons, and focus contrast`, async ({
			page,
			browserName,
		}) => {
			await page.emulateMedia({ colorScheme });
			const control = await mount(page, false, external);
			await control.evaluate((element) => {
				element.classList.add('icons');
			});
			await page.keyboard.press(radioTabKey(browserName));
			const colors = await control.evaluate((element) => {
				const selected = element.querySelector('[data-selected]');
				const selectedStyle = getComputedStyle(selected);
				const unselectedStyle = getComputedStyle(
					element.querySelector('[data-value="light"]'),
				);
				return {
					selected: selectedStyle.color,
					selectedBackground: selectedStyle.backgroundColor,
					unselected: unselectedStyle.color,
					unselectedBackground: unselectedStyle.backgroundColor,
					outline: selectedStyle.outlineColor,
					outlineStyle: selectedStyle.outlineStyle,
					page: getComputedStyle(document.body).backgroundColor,
					icon: getComputedStyle(selected, '::before')
						.backgroundColor,
					resolved: element.resolvedTheme,
				};
			});
			expect(colors.resolved).toBe(colorScheme);
			expect(
				contrast(colors.selected, colors.selectedBackground),
			).toBeGreaterThanOrEqual(4.5);
			expect(
				contrast(colors.unselected, colors.unselectedBackground),
			).toBeGreaterThanOrEqual(4.5);
			expect(
				contrast(
					colors.selectedBackground,
					colors.unselectedBackground,
				),
			).toBeGreaterThanOrEqual(3);
			expect(colors.outlineStyle).toBe('solid');
			expect(
				contrast(colors.outline, colors.page),
			).toBeGreaterThanOrEqual(3);
			expect(colors.icon).toBe(colors.selected);
		});
	}
}

test('existing browser integration checks', async ({ page }) => {
	await page.goto('/test/browser.html');
	await page.waitForFunction(() => window.browserTestsComplete);
	const results = await page.evaluate(() => window.browserResults);
	expect(results.length).toBeGreaterThan(0);
	expect(results.filter(({ passed }) => !passed)).toEqual([]);
});

for (const authored of [false, true]) {
	for (const external of [false, true]) {
		const mode = `${authored ? 'authored' : 'generated'}, ${external ? 'external' : 'injected'} CSS`;
		test(`${mode}: keyboard, focus hooks, targets, and read-only submission`, async ({
			page,
			browserName,
		}) => {
			const control = await mount(page, authored, external);
			await expect(
				page.getByRole('group', { name: 'Reading appearance' }),
			).toBeVisible();
			const system = control.getByRole('radio', {
				name: 'System',
				exact: true,
			});
			const light = control.getByRole('radio', {
				name: 'Light',
				exact: true,
			});
			await page.keyboard.press(radioTabKey(browserName));
			await expect(system).toBeFocused();
			const label = control.locator('[data-value="system"]');
			await expect(label).toHaveAttribute('data-focus', '');
			await expect(label).toHaveCSS('outline-style', 'solid');
			await expect(label).toHaveCSS('outline-width', '3px');
			await control.evaluate((element) => {
				element.style.setProperty(
					'--multi-switch-outline',
					'4px dotted CanvasText',
				);
				element.style.setProperty(
					'--multi-switch-outline-offset',
					'6px',
				);
			});
			await expect(label).toHaveCSS('outline-style', 'dotted');
			await expect(label).toHaveCSS('outline-width', '4px');
			await expect(label).toHaveCSS('outline-offset', '6px');
			for (const choice of await control
				.locator('[data-multi-switch-choice]')
				.all()) {
				const bounds = await choice.boundingBox();
				expect(bounds.width).toBeGreaterThanOrEqual(44);
				expect(bounds.height).toBeGreaterThanOrEqual(44);
			}
			await page.keyboard.press('ArrowRight');
			await expect(light).toBeChecked();
			expect(await state(page)).toEqual({
				value: 'light',
				theme: 'light',
				saved: 'light',
				submitted: 'light',
			});
			await control.evaluate((element) => {
				element.readOnly = true;
			});
			await control.locator('[data-value="dark"]').click();
			await light.focus();
			await page.keyboard.press('ArrowRight');
			await page.keyboard.press('Space');
			await expect(light).toBeChecked();
			expect(await state(page)).toEqual({
				value: 'light',
				theme: 'light',
				saved: 'light',
				submitted: 'light',
			});
		});

		test(`${mode}: host, own fieldset, and ancestor disabling retain and reset the theme`, async ({
			page,
		}) => {
			for (const mechanism of ['host', 'fieldset', 'ancestor']) {
				const control = await mount(page, authored, external);
				await control.evaluate(async (element, disable) => {
					element.cookie = true;
					element.value = 'dark';
					window.themeChanges = [];
					window.baseChanges = [];
					element.addEventListener(
						'theme-switcher:change',
						(event) => {
							window.themeChanges.push(event.detail);
						},
					);
					element.addEventListener(
						'form-multi-switch:change',
						(event) => {
							window.baseChanges.push(event.detail);
						},
					);
					if (disable === 'host') element.disabled = true;
					else if (disable === 'fieldset')
						element.querySelector('fieldset').disabled = true;
					else element.parentElement.disabled = true;
					await element.ready;
				}, mechanism);
				const selected = control.getByRole('radio', {
					name: 'Dark',
					exact: true,
				});
				await expect(selected).toBeChecked();
				await expect(selected).toBeDisabled();
				const label = control.locator('[data-value="dark"]');
				await expect(label).toHaveAttribute('data-selected', '');
				await expect(label).toHaveAttribute('data-disabled', '');
				const gray = await page.evaluate(() => {
					const probe = document.createElement('span');
					probe.style.color = 'GrayText';
					document.body.append(probe);
					const color = getComputedStyle(probe).color;
					probe.remove();
					return color;
				});
				await expect(label).toHaveCSS('color', gray);
				await control
					.locator('[data-value="light"]')
					.click({ force: true });
				expect(await state(page)).toEqual({
					value: 'dark',
					theme: 'dark',
					saved: 'dark',
					submitted: null,
				});
				expect(await page.evaluate(() => window.baseChanges)).toEqual(
					[],
				);
				expect(await page.evaluate(() => window.themeChanges)).toEqual(
					[],
				);
				await page
					.getByRole('button', { name: 'Reset appearance' })
					.click();
				await expect
					.poll(() => state(page))
					.toEqual({
						value: 'system',
						theme: 'system',
						saved: 'system',
						submitted: null,
					});
				expect(await page.evaluate(() => document.cookie)).toContain(
					'theme-switcher-browser=system',
				);
				expect(await page.evaluate(() => window.themeChanges)).toEqual([
					expect.objectContaining({
						value: 'system',
						previousValue: 'dark',
						source: 'reset',
					}),
				]);
				await control.evaluate(async (element, disable) => {
					if (disable === 'host') element.disabled = false;
					else if (disable === 'fieldset')
						element.querySelector('fieldset').disabled = false;
					else element.parentElement.disabled = false;
					await element.ready;
				}, mechanism);
				await expect(
					control.getByRole('radio', { name: 'System', exact: true }),
				).toBeEnabled();
				expect((await state(page)).submitted).toBe('system');
				await control.locator('[data-value="light"]').click();
				expect(await page.evaluate(() => window.baseChanges)).toEqual([
					expect.objectContaining({
						value: 'light',
						previousValue: 'system',
					}),
				]);
			}
		});

		test(`${mode}: disabled individual choice and peer/API synchronization`, async ({
			page,
		}) => {
			const control = await mount(page, authored, external);
			await control.evaluate((element) => {
				element.value = 'dark';
				element.querySelector('input[value="dark"]').disabled = true;
			});
			const dark = control.getByRole('radio', {
				name: 'Dark',
				exact: true,
			});
			await expect(dark).toBeChecked();
			await expect(dark).toBeDisabled();
			await control.locator('[data-value="light"]').click();
			await control.locator('[data-value="dark"]').click({ force: true });
			await expect(
				control.getByRole('radio', { name: 'Light', exact: true }),
			).toBeChecked();
			await page.keyboard.press('ArrowRight');
			await expect(dark).not.toBeChecked();
			const native = await control.locator('input:checked').inputValue();
			expect(await state(page)).toEqual({
				value: native,
				theme: native,
				saved: native,
				submitted: native,
			});
			await control.evaluate(async (element) => {
				element.value = 'dark';
				element.disabled = true;
				await element.ready;
				const peer = document.createElement('theme-switcher');
				peer.id = 'peer';
				peer.storageKey = element.storageKey;
				document.body.append(peer);
				await peer.ready;
				peer.value = 'light';
			});
			await expect(
				control.getByRole('radio', { name: 'Light', exact: true }),
			).toBeChecked();
			expect(await state(page)).toEqual({
				value: 'light',
				theme: 'light',
				saved: 'light',
				submitted: null,
			});
			await control.evaluate((element) => {
				element.value = 'dark';
			});
			await expect(dark).toBeChecked();
			await expect(
				page.locator('#peer input[value="dark"]'),
			).toBeChecked();
			expect(await state(page)).toEqual({
				value: 'dark',
				theme: 'dark',
				saved: 'dark',
				submitted: null,
			});
		});
	}
}

test('forced-color icons follow the automatically adjusted label foreground', async ({
	page,
	browserName,
}) => {
	test.skip(
		browserName !== 'chromium',
		'Forced colors are emulated only in Chromium.',
	);
	await page.emulateMedia({ forcedColors: 'active' });
	await page.goto('/test/browser.html');
	await page.waitForFunction(() => window.browserTestsComplete);
	expect(
		await page.evaluate(() =>
			window.browserResults.filter(({ passed }) => !passed),
		),
	).toEqual([]);
});

test.describe('native fallback', () => {
	test.use({ javaScriptEnabled: false });
	test('authored radios retain names, disabled state, and keyboard operation without JavaScript', async ({
		page,
		browserName,
	}) => {
		await page.goto('/fixture?authored&disabled-choice');
		const system = page.getByRole('radio', { name: 'System', exact: true });
		const light = page.getByRole('radio', { name: 'Light', exact: true });
		await expect(
			page.getByRole('group', { name: 'Reading appearance' }),
		).toBeVisible();
		await expect(system).toBeChecked();
		await expect(
			page.getByRole('radio', { name: 'Dark', exact: true }),
		).toBeDisabled();
		await page.keyboard.press(radioTabKey(browserName));
		await expect(system).toBeFocused();
		await page.keyboard.press('ArrowRight');
		await expect(light).toBeChecked();
		await page.getByRole('button', { name: 'Reset appearance' }).click();
		await expect(system).toBeChecked();
	});
});
