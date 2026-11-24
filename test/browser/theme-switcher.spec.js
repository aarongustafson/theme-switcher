import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { expectNativeFocus, serveDemo } from './demo-fixture.js';

const paths = [
	'theme-switcher.js',
	'define.js',
	'index.js',
	'test/browser.html',
	'test/browser.js',
	'test/peer.html',
	'test/observe.js',
	'demo/styles.css',
	'demo/demo-shell.css',
	'demo/embedded.css',
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
					<link rel="stylesheet" href="/demo/demo-shell.css">
					<link rel="stylesheet" href="/demo/styles.css">
					<link rel="stylesheet" href="/demo/embedded.css">
					${url.searchParams.has('external') ? '<link id="form-multi-switch-styles" rel="stylesheet" href="/node_modules/@aarongustafson/form-multi-switch/form-multi-switch.css">' : ''}
					<script type="importmap">{"imports": {
						"@aarongustafson/form-multi-switch": "/node_modules/@aarongustafson/form-multi-switch/index.js"
					}}</script>
					<script type="module" src="/define.js"></script>
				</head><body data-demo-page="embedded"><form><fieldset id="ancestor"><legend>Theme controls</legend>
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

test('native-first demo retains authored reset defaults while changing and sharing the page preference', async ({
	page,
}) => {
	await page.unrouteAll({ behavior: 'wait' });
	await serveDemo(page);
	await page.goto('http://code-demo.test/demo/index.html#native-radios');
	const first = page.locator('.code-demo-pair').first();
	const control = first.locator('theme-switcher');
	await expect(control).toHaveAttribute('id', 'native');
	await expect(
		control.getByRole('group', { name: 'Color theme' }),
	).toBeVisible();
	const system = control.getByRole('radio', { name: 'System', exact: true });
	await system.focus();
	await page.keyboard.press('ArrowRight');
	await expect(
		control.getByRole('radio', { name: 'Light', exact: true }),
	).toBeChecked();
	await expect(control.locator('[data-value="light"]')).toHaveAttribute(
		'data-focus',
		'',
	);
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(page.locator('#default input[value="light"]')).toBeChecked();
	expect(
		await control.evaluate((element) => ({
			submitted: new FormData(element.closest('form')).get('theme'),
			saved: localStorage.getItem('theme-switcher-demo'),
			default: element.querySelector('[value="system"]').defaultChecked,
		})),
	).toEqual({ submitted: 'light', saved: 'light', default: true });
	await first.getByRole('button', { name: 'Reset appearance' }).click();
	await expect(system).toBeChecked();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');
	await expect(page.locator('#default input[value="system"]')).toBeChecked();
	await page.unrouteAll({ behavior: 'wait' });
});

test('every demo alternative has a unique fragment targeting its heading and example', async ({
	page,
}) => {
	await page.unrouteAll({ behavior: 'wait' });
	await serveDemo(page);
	for (const name of [
		'index',
		'esm',
		'unpkg',
		'early',
		'extra',
		'cookie',
		'fallback',
		'storage',
	]) {
		await page.goto(`http://code-demo.test/demo/${name}.html`);
		const blocks =
			name === 'index'
				? page.locator('.demo-section')
				: page.locator('main > section, body > section');
		expect(await blocks.count()).toBeGreaterThan(0);
		for (const block of await blocks.all()) {
			const id = await block.getAttribute('id');
			expect(id).toMatch(/^[a-z][a-z0-9-]+$/);
			await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
			await expect(block.locator('h2, h3').first()).toBeVisible();
			await page.evaluate((fragment) => {
				location.hash = fragment;
			}, id);
			await expect(block).toHaveJSProperty('id', id);
			expect(
				await block.evaluate((element) => element.matches(':target')),
			).toBe(true);
		}
		const ids = await page
			.locator('[id]')
			.evaluateAll((elements) => elements.map((element) => element.id));
		expect(new Set(ids).size).toBe(ids.length);
	}
	await page.unrouteAll({ behavior: 'wait' });
});

test('shared defaults preserve the selected page theme and isolated reading palette', async ({
	page,
}) => {
	await page.unrouteAll({ behavior: 'wait' });
	await serveDemo(page);
	await page.goto('http://code-demo.test/demo/index.html');
	const control = page.locator('#default');
	await control.getByRole('radio', { name: 'Dark', exact: true }).focus();
	await page.keyboard.press('Space');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
	const frame = page.frameLocator('iframe[src="./extra.html"]');
	await frame.getByRole('radio', { name: 'Sepia', exact: true }).focus();
	await page.keyboard.press('Space');
	await expect(frame.locator('html')).toHaveAttribute('data-theme', 'sepia');
	await expect(frame.locator('body')).toHaveCSS(
		'background-color',
		'rgb(246, 236, 214)',
	);
	await expect(frame.locator('body')).toHaveCSS('color', 'rgb(73, 57, 33)');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expectNativeFocus(page.locator('button[aria-controls]').first());
	await page.unrouteAll({ behavior: 'wait' });
});

test('localized and icon-only demos keep native names, focus, and narrow RTL layout', async ({
	page,
	browserName,
}) => {
	await page.unrouteAll({ behavior: 'wait' });
	await serveDemo(page);
	await page.setViewportSize({ width: 320, height: 800 });
	await page.goto('http://code-demo.test/demo/index.html#arabic-rtl');
	await expect(
		page.locator('#french-labels').getByRole('group', { name: 'Thème' }),
	).toBeVisible();
	const arabic = page.locator('#arabic');
	await expect(arabic).toHaveCSS('direction', 'rtl');
	const system = arabic.getByRole('radio', { name: 'النظام', exact: true });
	await system.focus();
	await expect(system).toBeFocused();
	await page.keyboard.press('ArrowRight');
	// Native WebKit radios advance in DOM order here; Chromium and Firefox
	// reverse horizontal arrow direction in RTL.
	const next = browserName === 'webkit' ? 'light' : 'dark';
	await expect(
		arabic.getByRole('radio', {
			name: next === 'light' ? 'فاتح' : 'داكن',
			exact: true,
		}),
	).toBeChecked();
	await expect(arabic.locator(`[data-value="${next}"]`)).toHaveAttribute(
		'data-focus',
		'',
	);
	await expect(page.locator('html')).toHaveAttribute('data-theme', next);
	const icons = page.locator('#icon-only');
	await expect(
		icons.getByRole('group', { name: 'Icon-only appearance' }),
	).toBeVisible();
	for (const name of ['System', 'Light', 'Dark']) {
		await expect(
			icons.getByRole('radio', { name, exact: true }),
		).toHaveCount(1);
	}
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
	await page.unrouteAll({ behavior: 'wait' });
});

test('early demo restores before enhancement and falls back to System for invalid or blocked storage', async ({
	page,
}) => {
	await page.unrouteAll({ behavior: 'wait' });
	await serveDemo(page, {
		transformHtml: (html) =>
			html.replace(
				'<script type="module" src="../define.js"></script>',
				'',
			),
	});
	await page.goto('http://code-demo.test/demo/early.html');
	for (const saved of ['dark', 'system', 'unknown']) {
		await page.evaluate(
			(value) => localStorage.setItem('theme-switcher-early-demo', value),
			saved,
		);
		await page.reload();
		await expect(page.locator('html')).toHaveAttribute(
			'data-theme',
			saved === 'unknown' ? 'system' : saved,
		);
		await expect(page.getByRole('radio')).toHaveCount(0);
	}
	await page.addInitScript(() => {
		Object.defineProperty(window, 'localStorage', {
			get() {
				throw new DOMException('Blocked', 'SecurityError');
			},
		});
	});
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');
	await page.unrouteAll({ behavior: 'wait' });
});

test('cookie demo prefers local storage, restores the cookie fallback, and can reload', async ({
	page,
}) => {
	await page.unrouteAll({ behavior: 'wait' });
	await serveDemo(page);
	await page.goto('http://code-demo.test/demo/cookie.html');
	await page.evaluate(() => {
		localStorage.setItem('theme-switcher-cookie-demo', 'light');
		document.cookie = 'theme-switcher-cookie-demo=dark; Path=/';
	});
	await page.reload();
	await expect(
		page.getByRole('radio', { name: 'Light', exact: true }),
	).toBeChecked();
	expect(await page.evaluate(() => document.cookie)).toContain(
		'theme-switcher-cookie-demo=light',
	);
	await page.evaluate(() => {
		localStorage.removeItem('theme-switcher-cookie-demo');
		document.cookie = 'theme-switcher-cookie-demo=dark; Path=/';
	});
	await page.reload();
	await expect(
		page.getByRole('radio', { name: 'Dark', exact: true }),
	).toBeChecked();
	expect(
		await page.evaluate(() =>
			localStorage.getItem('theme-switcher-cookie-demo'),
		),
	).toBe('dark');
	await page.unrouteAll({ behavior: 'wait' });
});

test('storage fixture reports a nonfatal diagnostic while keyboard theme changes still work', async ({
	page,
}) => {
	await page.unrouteAll({ behavior: 'wait' });
	await serveDemo(page);
	await page.goto('http://code-demo.test/demo/storage.html');
	await expect(page.locator('theme-switcher')).toHaveAttribute(
		'data-multi-switch-state',
		'ready',
	);
	await expect(page.getByRole('status')).toContainText('storage:');
	await page.getByRole('radio', { name: 'Light', exact: true }).focus();
	await page.keyboard.press('Space');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(
		page.getByRole('radio', { name: 'Light', exact: true }),
	).toBeChecked();
	await expect(page.getByRole('status')).toContainText(
		'Storage intentionally blocked',
	);
	await page.unrouteAll({ behavior: 'wait' });
});

test('CDN source pages do not request theme modules or create live controls', async ({
	page,
}) => {
	await page.unrouteAll({ behavior: 'wait' });
	await serveDemo(page);
	const requests = [];
	page.on('request', (request) => requests.push(request.url()));
	for (const file of ['esm', 'unpkg']) {
		await page.goto(`http://code-demo.test/demo/${file}.html`);
		await expect(page.locator('main pre code')).toBeVisible();
		await expect(page.locator('theme-switcher')).toHaveCount(0);
		await expect(page.getByRole('radio')).toHaveCount(0);
	}
	expect(
		requests.filter((url) =>
			/esm\.sh|unpkg\.com|\/define\.js|\/theme-switcher\.js/.test(url),
		),
	).toEqual([]);
	await page.unrouteAll({ behavior: 'wait' });
});

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
	test('actual fallback form submits without changing the theme or loading enhancement', async ({
		page,
	}) => {
		await page.unrouteAll({ behavior: 'wait' });
		await serveDemo(page);
		await page.goto(
			'http://code-demo.test/demo/fallback.html#native-form-submission',
		);
		const system = page.getByRole('radio', { name: 'System', exact: true });
		await system.focus();
		await page.keyboard.press('ArrowRight');
		await expect(
			page.getByRole('radio', { name: 'Light', exact: true }),
		).toBeChecked();
		await page.getByRole('button', { name: 'Submit to the URL' }).click();
		await expect(page).toHaveURL(/fallback\.html\?theme=light/);
		await expect(page.locator('html')).not.toHaveAttribute('data-theme');
		await expect(page.locator('theme-switcher')).not.toHaveAttribute(
			'data-multi-switch-state',
		);
		await page.goto('http://code-demo.test/demo/index.html');
		await expect(page.locator('#native').getByRole('radio')).toHaveCount(3);
		await expect(page.locator('#default').getByRole('radio')).toHaveCount(
			0,
		);
	});
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
