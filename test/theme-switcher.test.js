import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormMultiSwitchElement } from '@aarongustafson/form-multi-switch';
import { ThemeSwitcherElement } from '../theme-switcher.js';

let media;
function authored() {
	const control = document.createElement('theme-switcher');
	control.innerHTML = `<fieldset><legend>Appearance</legend>
		<label><input type="radio" name="appearance" value="system" checked>Device</label>
		<label><input type="radio" name="appearance" value="light">Light</label>
		<label><input type="radio" name="appearance" value="dark">Dark</label>
		</fieldset>`;
	return control;
}
async function connect(
	control = document.createElement('theme-switcher'),
	parent = document.body,
) {
	parent.append(control);
	await control.ready;
	return control;
}
const afterReset = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	localStorage.clear();
	document.cookie =
		'theme-switcher=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/';
	document.cookie =
		'site-theme=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/';
	document.cookie =
		'server-theme=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/';
	document.documentElement.removeAttribute('data-theme');
	media = new EventTarget();
	media.matches = false;
	vi.spyOn(window, 'matchMedia').mockReturnValue(media);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
	document.body.replaceChildren();
	document.documentElement.removeAttribute('data-theme');
	vi.restoreAllMocks();
	document.cookie =
		'theme-switcher=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/';
	document.cookie =
		'site-theme=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/';
	document.cookie =
		'server-theme=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/';
});

describe('theme-switcher', () => {
	it('inherits the base class and generates three light-DOM choices by default', async () => {
		const control = await connect();
		expect(control).toBeInstanceOf(ThemeSwitcherElement);
		expect(control).toBeInstanceOf(FormMultiSwitchElement);
		expect(control.shadowRoot).toBeNull();
		expect(
			[...control.querySelectorAll('input')].map((input) => input.value),
		).toEqual(['system', 'light', 'dark']);
		expect(control.value).toBe('system');
		expect(control.resolvedTheme).toBe('light');
		expect(document.documentElement.dataset.theme).toBe('system');
	});

	it('localizes the default labels and keeps generated radio groups independent', async () => {
		const first = document.createElement('theme-switcher');
		first.setAttribute('label', 'Thème');
		first.setAttribute('system-label', 'Appareil');
		first.setAttribute('light-label', 'Clair');
		first.setAttribute('dark-label', 'Sombre');
		await connect(first);
		const second = await connect();
		expect(first.querySelector('legend').textContent).toBe('Thème');
		expect(
			[...first.querySelectorAll('[data-multi-switch-label]')].map(
				(span) => span.textContent,
			),
		).toEqual(['Appareil', 'Clair', 'Sombre']);
		expect(first.name).not.toBe(second.name);
		first.setAttribute('system-label', 'Automatique');
		await first.ready;
		expect(first.querySelector('[data-value="system"]').textContent).toBe(
			'Automatique',
		);
	});

	it('preserves authored choices, names, labels, selection defaults, and ignores conflicting attributes', async () => {
		const control = authored();
		control.setAttribute('choices', 'invalid JSON');
		control.setAttribute('name', 'ignored');
		control.setAttribute('label', 'Ignored');
		control.setAttribute('value', 'missing');
		const input = control.querySelector('input');
		await connect(control);
		expect(control.querySelector('input')).toBe(input);
		expect(control.name).toBe('appearance');
		expect(control.label).toBe('Appearance');
		expect(control.value).toBe('system');
	});

	it('uses saved preference before the root theme and authored selection', async () => {
		localStorage.setItem('theme-switcher', 'dark');
		document.documentElement.dataset.theme = 'light';
		const control = await connect(authored());
		expect(control.value).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
	});

	it('follows System instead of a root theme without a saved preference', async () => {
		document.documentElement.dataset.theme = 'dark';
		const control = await connect(authored());
		expect(control.value).toBe('system');
		expect(document.documentElement.dataset.theme).toBe('system');
	});

	it('uses System initially without changing authored reset defaults', async () => {
		const control = authored();
		control.querySelector('input').defaultChecked = false;
		control.querySelector('input[value="dark"]').defaultChecked = true;
		const form = document.createElement('form');
		document.body.append(form);
		await connect(control, form);
		expect(control.value).toBe('system');
		expect(
			control.querySelector('input[value="dark"]').defaultChecked,
		).toBe(true);
		form.reset();
		await afterReset();
		expect(control.value).toBe('dark');
		expect(localStorage.getItem('theme-switcher')).toBe('dark');
	});

	it.each(['generated', 'configured'])(
		'uses System initially without changing the %s reset default',
		async (mode) => {
			const control = document.createElement('theme-switcher');
			if (mode === 'configured')
				control.configure({
					name: 'theme',
					label: 'Theme',
					choices: themesForTest(),
					value: 'dark',
				});
			else control.setAttribute('value', 'dark');
			const form = document.createElement('form');
			document.body.append(form);
			await connect(control, form);
			expect(control.value).toBe('system');
			expect(control.getAttribute('value')).toBe('dark');
			expect(
				control.querySelector('input[value="dark"]').defaultChecked,
			).toBe(true);
			form.reset();
			await afterReset();
			expect(control.value).toBe('dark');
		},
	);

	it('applies API updates, persists literal system, and emits theme details without base interaction events', async () => {
		const control = await connect();
		const change = vi.fn();
		const base = vi.fn();
		control.addEventListener('theme-switcher:change', change);
		control.addEventListener('form-multi-switch:change', base);
		control.value = 'dark';
		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(localStorage.getItem('theme-switcher')).toBe('dark');
		expect(change.mock.calls[0][0].detail).toMatchObject({
			value: 'dark',
			previousValue: 'system',
			resolvedTheme: 'dark',
			source: 'api',
		});
		control.value = 'system';
		expect(localStorage.getItem('theme-switcher')).toBe('system');
		expect(base).not.toHaveBeenCalled();
		expect(() => {
			control.value = null;
		}).toThrow();
		expect(() => {
			control.value = 'unknown';
		}).toThrow();
	});

	it('synchronizes native interaction between multiple controls without duplicate events', async () => {
		const first = await connect();
		const second = await connect();
		const change = vi.fn();
		second.addEventListener('theme-switcher:change', change);
		first.querySelector('input[value="dark"]').click();
		expect(first.value).toBe('dark');
		expect(second.value).toBe('dark');
		expect(change).toHaveBeenCalledOnce();
		expect(change.mock.calls[0][0].detail.source).toBe('sync');
	});

	it('follows system changes without overwriting a pinned preference', async () => {
		const control = await connect();
		const change = vi.fn();
		control.addEventListener('theme-switcher:change', change);
		media.matches = true;
		media.dispatchEvent(new Event('change'));
		expect(control.value).toBe('system');
		expect(control.resolvedTheme).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('system');
		expect(change.mock.calls[0][0].detail.source).toBe('system');
		control.value = 'light';
		media.matches = false;
		media.dispatchEvent(new Event('change'));
		media.matches = true;
		media.dispatchEvent(new Event('change'));
		expect(control.resolvedTheme).toBe('light');
		expect(localStorage.getItem('theme-switcher')).toBe('light');
	});

	it('uses custom storage keys and responds to cross-tab preference changes', async () => {
		const control = document.createElement('theme-switcher');
		control.storageKey = 'site-theme';
		await connect(control);
		window.dispatchEvent(
			new StorageEvent('storage', {
				key: 'site-theme',
				newValue: 'dark',
				storageArea: localStorage,
			}),
		);
		expect(control.value).toBe('dark');
		window.dispatchEvent(
			new StorageEvent('storage', {
				key: 'unrelated',
				newValue: 'light',
				storageArea: localStorage,
			}),
		);
		expect(control.value).toBe('dark');
		window.dispatchEvent(
			new StorageEvent('storage', {
				key: 'site-theme',
				newValue: null,
				storageArea: localStorage,
			}),
		);
		expect(control.value).toBe('system');
	});

	it('does not read or write storage in none mode', async () => {
		localStorage.setItem('theme-switcher', 'dark');
		const control = document.createElement('theme-switcher');
		control.storage = 'none';
		const storage = vi
			.spyOn(window, 'localStorage', 'get')
			.mockImplementation(() => {
				throw new DOMException('Blocked', 'SecurityError');
			});
		await connect(control);
		control.value = 'light';
		expect(storage).not.toHaveBeenCalled();
		expect(control.value).toBe('light');
	});

	it('reports unavailable storage but still changes the theme', async () => {
		vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
			throw new DOMException('Blocked', 'SecurityError');
		});
		const control = document.createElement('theme-switcher');
		const error = vi.fn();
		control.addEventListener('theme-switcher:error', error);
		await connect(control);
		control.value = 'dark';
		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(
			error.mock.calls.some(
				([event]) => event.detail.phase === 'storage',
			),
		).toBe(true);
		expect(console.error).toHaveBeenCalled();
	});

	it('ignores unsupported saved themes with an explicit diagnostic', async () => {
		localStorage.setItem('theme-switcher', 'unknown');
		const control = await connect();
		expect(control.value).toBe('system');
		expect(console.error).toHaveBeenCalled();
	});

	it('supports additional themes as plain values without injecting label HTML', async () => {
		const control = document.createElement('theme-switcher');
		control.configure({
			name: 'theme',
			label: 'Theme',
			choices: [
				{ label: 'Device', value: 'system' },
				{ label: 'Light', value: 'light' },
				{ label: 'Dark', value: 'dark' },
				{ label: '<img src=x>', value: 'sepia' },
			],
		});
		await connect(control);
		control.value = 'sepia';
		expect(control.resolvedTheme).toBe('sepia');
		expect(document.documentElement.dataset.theme).toBe('sepia');
		expect(control.querySelector('img')).toBeNull();
	});

	it('requires the three base theme values and reports invalid theme configuration', async () => {
		const control = document.createElement('theme-switcher');
		control.setAttribute('choices', '[{"label":"Only","value":"other"}]');
		control.setAttribute('value', 'other');
		document.body.append(control);
		await expect(control.ready).rejects.toThrow(/system|light|dark/);
		expect(console.error).toHaveBeenCalled();
	});

	it('restores the native default on reset and applies it to the page and peers', async () => {
		const form = document.createElement('form');
		document.body.append(form);
		const control = await connect(authored(), form);
		const second = await connect();
		control.value = 'dark';
		form.reset();
		await afterReset();
		expect(control.value).toBe('system');
		expect(second.value).toBe('system');
		expect(document.documentElement.dataset.theme).toBe('system');
	});

	it('does not change the theme for a canceled form reset', async () => {
		const form = document.createElement('form');
		document.body.append(form);
		const control = await connect(authored(), form);
		control.value = 'dark';
		form.addEventListener('reset', (event) => event.preventDefault());
		form.dispatchEvent(
			new Event('reset', { bubbles: true, cancelable: true }),
		);
		await afterReset();
		expect(control.value).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
	});

	it('cleans up media, storage, and synchronization on disconnect and supports reconnect', async () => {
		const control = await connect();
		const change = vi.fn();
		control.addEventListener('theme-switcher:change', change);
		control.remove();
		media.matches = true;
		media.dispatchEvent(new Event('change'));
		window.dispatchEvent(
			new StorageEvent('storage', {
				key: 'theme-switcher',
				newValue: 'dark',
				storageArea: localStorage,
			}),
		);
		expect(change).not.toHaveBeenCalled();
		await connect(control);
		change.mockClear();
		control.querySelector('input[value="dark"]').click();
		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(change).toHaveBeenCalledOnce();
	});

	it('applies generated value attributes but ignores those attributes with authored markup', async () => {
		const generated = await connect();
		generated.setAttribute('value', 'dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
		const markup = await connect(authored());
		markup.setAttribute('value', 'light');
		expect(markup.value).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
	});

	it('keeps the current selection while relabeling default choices', async () => {
		const control = await connect();
		control.value = 'dark';
		control.darkLabel = 'Night';
		await control.ready;
		expect(control.value).toBe('dark');
		control.setAttribute('value', 'light');
		expect(document.documentElement.dataset.theme).toBe('light');
	});

	it('applies inherited configure calls and supports recovery after invalid theme choices', async () => {
		const control = await connect();
		control.configure({
			name: 'updated',
			label: 'Updated theme',
			value: 'dark',
			choices: themesForTest(),
		});
		await control.ready;
		expect(control.value).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
		control.setAttribute('choices', '[{"label":"Dark","value":"dark"}]');
		await expect(control.ready).rejects.toThrow(/system/);
		expect(control.state).toBe('error');
		control.setAttribute('choices', JSON.stringify(themesForTest()));
		await control.ready;
		expect(control.state).toBe('ready');
	});

	it('loads a newly selected storage key and can turn persistence back on', async () => {
		localStorage.setItem('other-theme', 'dark');
		const control = await connect();
		control.storageKey = 'other-theme';
		expect(control.value).toBe('dark');
		control.storage = 'none';
		control.value = 'light';
		control.storage = 'local';
		expect(control.value).toBe('dark');
	});

	it('does not persist cross-tab updates or unrelated session-storage events', async () => {
		localStorage.setItem('theme-switcher', 'system');
		const control = await connect();
		window.dispatchEvent(
			new StorageEvent('storage', {
				key: 'theme-switcher',
				newValue: 'dark',
				storageArea: sessionStorage,
			}),
		);
		expect(control.value).toBe('system');
		window.dispatchEvent(
			new StorageEvent('storage', {
				key: 'theme-switcher',
				newValue: 'dark',
				storageArea: localStorage,
			}),
		);
		expect(control.value).toBe('dark');
		expect(localStorage.getItem('theme-switcher')).toBe('system');
	});

	it('makes differing custom-theme choices observable instead of showing the wrong selection', async () => {
		const first = await connect();
		const custom = document.createElement('theme-switcher');
		custom.setAttribute(
			'choices',
			JSON.stringify([
				...themesForTest(),
				{ value: 'sepia', label: 'Sepia' },
			]),
		);
		await connect(custom);
		const error = vi.fn();
		first.addEventListener('theme-switcher:error', error);
		custom.value = 'sepia';
		expect(first.value).toBeNull();
		expect(first.resolvedTheme).toBe('sepia');
		expect(error.mock.calls[0][0].detail.phase).toBe('synchronization');
		custom.value = 'light';
		expect(first.value).toBe('light');
	});

	it.each([null, 'dark', 'system'])(
		'does not apply or persist an early API assignment over saved %s or System',
		async (saved) => {
			if (saved !== null) localStorage.setItem('theme-switcher', saved);
			const control = document.createElement('theme-switcher');
			control.value = 'light';
			await connect(control);
			expect(control.value).toBe(saved ?? 'system');
			expect(document.documentElement.dataset.theme).toBe(
				saved ?? 'system',
			);
			expect(localStorage.getItem('theme-switcher')).toBe(saved);
			control.value = 'light';
			expect(control.value).toBe('light');
			expect(localStorage.getItem('theme-switcher')).toBe('light');
		},
	);

	it.each([
		['dark', 'light', 'local', 'dark'],
		['system', 'dark', 'local', 'system'],
		[null, 'dark', 'local', 'dark'],
		['missing', 'dark', 'local', 'dark'],
		[null, 'system', 'local', 'system'],
		[null, 'missing', 'local', 'system'],
		['dark', 'dark', 'none', 'system'],
	])(
		'restores %s before cookie %s with storage %s',
		async (saved, cookie, storage, expected) => {
			if (saved !== null) localStorage.setItem('theme-switcher', saved);
			document.cookie = `theme-switcher=${cookie}; Path=/`;
			document.documentElement.dataset.theme = 'light';
			const control = document.createElement('theme-switcher');
			control.cookie = true;
			control.storage = storage;
			control.value = 'light';
			control.setAttribute('value', 'light');
			await connect(control);
			expect(control.value).toBe(expected);
			expect(document.documentElement.dataset.theme).toBe(expected);
		},
	);

	it('does not validate ignored startup API choices against the restored theme', async () => {
		const control = document.createElement('theme-switcher');
		control.value = 'not-offered';
		await connect(control);
		expect(control.value).toBe('system');
		expect(() => {
			control.value = 'not-offered';
		}).toThrow(/Unsupported theme/);
	});

	it('ignores initial API writes during loading and respects queued storage events', async () => {
		const control = document.createElement('theme-switcher');
		let finish;
		vi.spyOn(control, 'loadModule').mockImplementation(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		control.script = './startup.js';
		document.body.append(control);
		await vi.waitFor(() => expect(control.state).toBe('loading'));
		control.value = 'light';
		window.dispatchEvent(
			new StorageEvent('storage', {
				key: 'theme-switcher',
				newValue: 'dark',
				storageArea: localStorage,
			}),
		);
		finish({});
		await control.ready;
		expect(control.value).toBe('dark');
		expect(localStorage.getItem('theme-switcher')).toBeNull();
	});

	it('ignores an early API value when joining an active page preference', async () => {
		const first = await connect();
		first.value = 'dark';
		const peer = document.createElement('theme-switcher');
		peer.value = 'light';
		peer.storage = 'none';
		await connect(peer);
		expect(peer.value).toBe('dark');
		expect(first.value).toBe('dark');
	});

	it('waits for parsed authored markup rather than generating over it', async () => {
		const readyState = vi
			.spyOn(document, 'readyState', 'get')
			.mockReturnValue('loading');
		const control = document.createElement('theme-switcher');
		document.body.append(control);
		expect(control.querySelector('fieldset')).toBeNull();
		control.innerHTML = authored().innerHTML;
		const input = control.querySelector('input');
		readyState.mockReturnValue('interactive');
		document.dispatchEvent(new Event('DOMContentLoaded'));
		await control.ready;
		expect(control.querySelector('input')).toBe(input);
		expect(control.label).toBe('Appearance');
	});

	it('does not initialize after disconnect while waiting for parsed markup', () => {
		vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
		const control = document.createElement('theme-switcher');
		document.body.append(control);
		control.remove();
		document.dispatchEvent(new Event('DOMContentLoaded'));
		expect(control.querySelector('fieldset')).toBeNull();
		expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
	});

	it('preserves a reentrant API update made in a theme change listener', async () => {
		const first = await connect();
		const second = await connect();
		first.addEventListener('theme-switcher:change', ({ detail }) => {
			if (detail.value === 'dark') first.value = 'light';
		});
		first.value = 'dark';
		expect(first.value).toBe('light');
		expect(second.value).toBe('light');
		expect(localStorage.getItem('theme-switcher')).toBe('light');
		expect(document.documentElement.dataset.theme).toBe('light');
	});

	it('keeps native checked defaults distinct from the live selection after observed changes', async () => {
		const form = document.createElement('form');
		document.body.append(form);
		const control = await connect(authored(), form);
		control
			.querySelector('input[value="system"]')
			.removeAttribute('checked');
		control
			.querySelector('input[value="dark"]')
			.setAttribute('checked', '');
		await Promise.resolve();
		await control.ready;
		expect(control.value).toBe('system');
		form.reset();
		await afterReset();
		expect(control.value).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
	});

	it('preserves an active preference while changing the generated name and group label', async () => {
		const control = await connect();
		control.value = 'dark';
		control.label = 'Updated appearance';
		control.name = 'updated-name';
		await control.ready;
		expect(control.value).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
	});

	it('rejects custom choices with empty theme values', async () => {
		const control = document.createElement('theme-switcher');
		control.setAttribute(
			'choices',
			JSON.stringify([...themesForTest(), { label: 'Blank', value: '' }]),
		);
		document.body.append(control);
		await expect(control.ready).rejects.toThrow(/nonempty/);
	});

	it('keeps inherited module loading and cleanup available', async () => {
		const cleanup = vi.fn();
		const initialize = vi.fn(() => cleanup);
		const control = document.createElement('theme-switcher');
		vi.spyOn(control, 'loadModule').mockResolvedValue({ initialize });
		control.script = './extra-behavior.js';
		await connect(control);
		expect(initialize).toHaveBeenCalledOnce();
		expect(document.documentElement.dataset.theme).toBe('system');
		control.remove();
		expect(cleanup).toHaveBeenCalledOnce();
	});

	it('rejects empty theme values and blank storage keys', async () => {
		const control = await connect();
		expect(() => {
			control.value = '';
		}).toThrow();
		expect(() => {
			control.storageKey = ' ';
		}).toThrow();
		control.setAttribute('storage-key', '');
		await expect(control.ready).rejects.toThrow(/storage-key/);
		control.storageKey = 'valid';
		await control.ready;
		expect(control.state).toBe('ready');
	});

	it('prefers localStorage and mirrors the saved preference to an optional cookie', async () => {
		localStorage.setItem('theme-switcher', 'light');
		document.cookie = 'theme-switcher=dark; Path=/; SameSite=Lax';
		const control = document.createElement('theme-switcher');
		control.cookie = true;
		await connect(control);
		expect(control.value).toBe('light');
		expect(document.cookie).toContain('theme-switcher=light');
		control.value = 'system';
		expect(document.cookie).toContain('theme-switcher=system');
		expect(localStorage.getItem('theme-switcher')).toBe('system');
	});

	it.each(['absent', 'invalid', 'blocked'])(
		'falls back to the cookie when localStorage is %s',
		async (state) => {
			document.cookie = 'theme-switcher=dark; Path=/';
			if (state === 'invalid')
				localStorage.setItem('theme-switcher', 'unknown');
			if (state === 'blocked')
				vi.spyOn(window, 'localStorage', 'get').mockImplementation(
					() => {
						throw new DOMException('Blocked', 'SecurityError');
					},
				);
			const control = document.createElement('theme-switcher');
			control.cookie = true;
			await connect(control);
			expect(control.value).toBe('dark');
			control.value = 'light';
			expect(document.cookie).toContain('theme-switcher=light');
			if (state !== 'blocked')
				expect(localStorage.getItem('theme-switcher')).toBe('light');
			if (state !== 'absent') expect(console.error).toHaveBeenCalled();
		},
	);

	it('supports separate cookie names and disables both mechanisms with storage none', async () => {
		const control = document.createElement('theme-switcher');
		control.storageKey = 'site-theme';
		control.cookie = 'server-theme';
		await connect(control);
		expect(control.cookie).toBe('server-theme');
		control.value = 'dark';
		expect(localStorage.getItem('site-theme')).toBe('dark');
		expect(document.cookie).toContain('server-theme=dark');
		control.storage = 'none';
		const local = vi
			.spyOn(window, 'localStorage', 'get')
			.mockImplementation(() => {
				throw new Error('Must not access localStorage.');
			});
		const read = vi.spyOn(document, 'cookie', 'get');
		const write = vi.spyOn(document, 'cookie', 'set');
		control.setAttribute('cookie', 'invalid name');
		control.setAttribute('cookie-max-age', 'invalid');
		await control.ready;
		control.value = 'light';
		window.dispatchEvent(new Event('focus'));
		expect(local).not.toHaveBeenCalled();
		expect(read).not.toHaveBeenCalled();
		expect(write).not.toHaveBeenCalled();
		expect(control.value).toBe('light');
	});

	it('does not read or write cookies without an explicit cookie opt-in', async () => {
		const read = vi.spyOn(document, 'cookie', 'get');
		const write = vi.spyOn(document, 'cookie', 'set');
		const control = await connect();
		control.value = 'dark';
		window.dispatchEvent(new Event('focus'));
		expect(control.cookie).toBeNull();
		expect(read).not.toHaveBeenCalled();
		expect(write).not.toHaveBeenCalled();
	});

	it('writes a cookie with a configurable lifetime, root path, and SameSite protection', async () => {
		const control = document.createElement('theme-switcher');
		control.cookie = true;
		control.storageKey = 'site-theme';
		control.cookieMaxAge = 86400;
		await connect(control);
		const write = vi.spyOn(document, 'cookie', 'set');
		control.value = 'dark';
		expect(write.mock.calls[0][0]).toContain(
			'site-theme=dark; Path=/; Max-Age=86400; SameSite=Lax',
		);
		expect(document.cookie).toContain('site-theme=dark');
		expect(localStorage.getItem('site-theme')).toBe('dark');
	});

	it('adds Secure to cookies on HTTPS pages', async () => {
		const control = document.createElement('theme-switcher');
		control.cookie = true;
		await connect(control);
		vi.spyOn(document, 'location', 'get').mockReturnValue(
			new URL('https://example.test/'),
		);
		const write = vi.spyOn(document, 'cookie', 'set');
		control.value = 'dark';
		expect(write.mock.calls[0][0]).toMatch(/; Secure$/);
	});

	it('reports blocked cookie writes without preventing a theme change', async () => {
		const control = document.createElement('theme-switcher');
		control.cookie = true;
		await connect(control);
		vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {});
		const error = vi.fn();
		control.addEventListener('theme-switcher:error', error);
		control.value = 'dark';
		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(localStorage.getItem('theme-switcher')).toBe('dark');
		expect(error.mock.calls[0][0].detail.phase).toBe('storage');
	});

	it('observes external cookie changes and deletion when a page becomes active', async () => {
		const control = document.createElement('theme-switcher');
		control.cookie = true;
		await connect(control);
		document.cookie = 'theme-switcher=dark; Path=/';
		window.dispatchEvent(new Event('focus'));
		expect(control.value).toBe('dark');
		expect(localStorage.getItem('theme-switcher')).toBe('dark');
		document.cookie =
			'theme-switcher=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/';
		window.dispatchEvent(new Event('focus'));
		expect(control.value).toBe('system');
		expect(localStorage.getItem('theme-switcher')).toBe('system');
	});

	it('rejects invalid storage modes, cookie names, and cookie lifetimes', async () => {
		const control = await connect();
		expect(() => {
			control.storage = 'session';
		}).toThrow();
		expect(() => {
			control.cookieMaxAge = 0;
		}).toThrow();
		control.setAttribute('storage', 'unsupported');
		await expect(control.ready).rejects.toThrow(/storage/);
		control.storage = 'local';
		control.cookie = true;
		control.setAttribute('storage-key', 'invalid name');
		await expect(control.ready).rejects.toThrow(/cookie name/i);
		control.storageKey = 'site-theme';
		control.setAttribute('cookie-max-age', 'NaN');
		await expect(control.ready).rejects.toThrow(/cookie-max-age/);
	});

	it('leaves native fallback usable without applying invalid theme configuration', async () => {
		const control = await connect();
		control.cookie = true;
		control.setAttribute('cookie', 'invalid; name');
		await expect(control.ready).rejects.toThrow(/cookie name/i);
		const write = vi.spyOn(document, 'cookie', 'set');
		control.querySelector('input[value="dark"]').click();
		expect(document.documentElement.dataset.theme).toBe('system');
		expect(() => {
			control.value = 'light';
		}).toThrow(/cookie name/i);
		expect(write).not.toHaveBeenCalled();
		control.cookie = false;
		await control.ready;
		control.value = 'light';
		expect(document.documentElement.dataset.theme).toBe('light');
	});

	it('reconciles relabeling snapshots with newer synchronized preferences', async () => {
		const first = await connect();
		const second = await connect();
		first.value = 'dark';
		second.darkLabel = 'Night';
		first.value = 'light';
		await second.ready;
		expect(first.value).toBe('light');
		expect(second.value).toBe('light');
		expect(document.documentElement.dataset.theme).toBe('light');
		expect(localStorage.getItem('theme-switcher')).toBe('light');
	});

	it.each([false, true])(
		'queues storage updates during regeneration without overriding queued API values (%s)',
		async (explicit) => {
			const control = await connect();
			control.value = 'dark';
			control.darkLabel = 'Night';
			if (explicit) control.value = 'system';
			window.dispatchEvent(
				new StorageEvent('storage', {
					key: 'theme-switcher',
					newValue: 'light',
					storageArea: localStorage,
				}),
			);
			await control.ready;
			expect(control.value).toBe(explicit ? 'system' : 'light');
			expect(document.documentElement.dataset.theme).toBe(
				explicit ? 'system' : 'light',
			);
			expect(localStorage.getItem('theme-switcher')).toBe(
				explicit ? 'system' : 'dark',
			);
		},
	);

	it('queues the latest storage event while a behavior module is loading', async () => {
		const control = await connect();
		control.cookie = true;
		control.value = 'dark';
		let finish;
		vi.spyOn(control, 'loadModule').mockImplementation(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		control.script = './slow.js';
		await vi.waitFor(() => expect(control.state).toBe('loading'));
		for (const newValue of ['dark', 'light']) {
			window.dispatchEvent(
				new StorageEvent('storage', {
					key: 'theme-switcher',
					newValue,
					storageArea: localStorage,
				}),
			);
		}
		finish({});
		await control.ready;
		expect(control.value).toBe('light');
		expect(document.cookie).toContain('theme-switcher=light');
		expect(localStorage.getItem('theme-switcher')).toBe('dark');
	});

	it('does not persist the old selection while configure batches its attributes', async () => {
		const control = await connect();
		control.setAttribute('value', 'dark');
		const temporary = document.createElement('theme-switcher');
		temporary.storage = 'none';
		await connect(temporary);
		temporary.value = 'light';
		control.configure({
			name: 'palette',
			label: 'Palette',
			choices: themesForTest(),
		});
		expect(localStorage.getItem('theme-switcher')).toBe('dark');
		await control.ready;
		expect(localStorage.getItem('theme-switcher')).toBe('dark');
	});

	it.each(['invalid', 'key', 'none', 'disconnect', 'sync'])(
		'does not apply an obsolete or invalid queued storage update (%s)',
		async (reason) => {
			const control = await connect();
			control.value = 'dark';
			control.darkLabel = 'Night';
			window.dispatchEvent(
				new StorageEvent('storage', {
					key: 'theme-switcher',
					newValue: reason === 'invalid' ? 'missing' : 'light',
					storageArea: localStorage,
				}),
			);
			if (reason === 'key') control.storageKey = 'site-theme';
			if (reason === 'none') control.storage = 'none';
			if (reason === 'disconnect') {
				control.remove();
				await connect(control);
			}
			if (reason === 'sync') {
				const peer = await connect();
				peer.value = 'dark';
			}
			await control.ready;
			expect(control.value).toBe('dark');
			if (reason === 'invalid') expect(console.error).toHaveBeenCalled();
		},
	);

	it('validates queued storage against newly prepared choices and handles storage clearing', async () => {
		const control = await connect();
		control.configure({
			name: 'palette',
			label: 'Palette',
			choices: [...themesForTest(), { value: 'sepia', label: 'Sepia' }],
		});
		window.dispatchEvent(
			new StorageEvent('storage', {
				key: 'theme-switcher',
				newValue: 'sepia',
				storageArea: localStorage,
			}),
		);
		await control.ready;
		expect(control.value).toBe('sepia');
		control.label = 'Updated palette';
		window.dispatchEvent(
			new StorageEvent('storage', {
				key: null,
				newValue: null,
				storageArea: localStorage,
			}),
		);
		await control.ready;
		expect(control.value).toBe('system');
	});

	it('shares successful cookie-write snapshots without persisting temporary peer updates', async () => {
		const first = document.createElement('theme-switcher');
		first.cookie = true;
		await connect(first);
		const second = document.createElement('theme-switcher');
		second.storageKey = 'site-theme';
		second.cookie = 'theme-switcher';
		await connect(second);
		first.value = 'dark';
		const temporary = document.createElement('theme-switcher');
		temporary.storage = 'none';
		await connect(temporary);
		temporary.value = 'light';
		window.dispatchEvent(new Event('focus'));
		expect(first.value).toBe('light');
		expect(second.value).toBe('light');
		expect(temporary.value).toBe('light');
		expect(document.cookie).toContain('theme-switcher=dark');
		expect(localStorage.getItem('theme-switcher')).toBe('dark');
		expect(localStorage.getItem('site-theme')).toBeNull();
		document.cookie = 'theme-switcher=system; Path=/';
		window.dispatchEvent(new Event('focus'));
		expect(first.value).toBe('system');
		expect(second.value).toBe('system');
	});

	it('does not reconcile a reset after the control disconnects', async () => {
		const form = document.createElement('form');
		document.body.append(form);
		const control = await connect(authored(), form);
		control.value = 'dark';
		form.reset();
		control.remove();
		await afterReset();
		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(localStorage.getItem('theme-switcher')).toBe('dark');
	});

	it('preserves explicit queued API values across relabeling and synchronization', async () => {
		const first = await connect();
		const second = await connect();
		first.value = 'dark';
		second.darkLabel = 'Night';
		second.value = 'light';
		second.label = 'Appearance';
		first.value = 'dark';
		await second.ready;
		expect(first.value).toBe('light');
		expect(second.value).toBe('light');
	});

	it('upgrades pre-definition name and label properties before assigning defaults', async () => {
		const control = document.createElement('theme-switcher');
		Object.defineProperties(control, {
			name: {
				value: 'site-appearance',
				writable: true,
				configurable: true,
			},
			label: {
				value: 'Thème du site',
				writable: true,
				configurable: true,
			},
		});
		await connect(control);
		expect(control.name).toBe('site-appearance');
		expect(control.label).toBe('Thème du site');
		expect(control.querySelector('input').name).toBe('site-appearance');
		expect(control.querySelector('legend').textContent).toBe(
			'Thème du site',
		);
	});

	it('applies non-composed form resets from a shadow tree to the page and peers', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = host.attachShadow({ mode: 'open' });
		const form = document.createElement('form');
		root.append(form);
		const control = await connect(authored(), form);
		const peer = await connect();
		control.value = 'dark';
		form.reset();
		await afterReset();
		expect(control.value).toBe('system');
		expect(peer.value).toBe('system');
		expect(document.documentElement.dataset.theme).toBe('system');
		expect(localStorage.getItem('theme-switcher')).toBe('system');
	});

	it.each([false, true])(
		'joins a temporary page preference with an explicit storage key (cookie %s)',
		async (cookie) => {
			const first = await connect();
			first.value = 'dark';
			document.cookie = 'theme-switcher=dark; Path=/';
			const temporary = document.createElement('theme-switcher');
			temporary.storage = 'none';
			await connect(temporary);
			temporary.value = 'light';
			const newcomer = document.createElement('theme-switcher');
			newcomer.storageKey = 'theme-switcher';
			newcomer.cookie = cookie;
			await connect(newcomer);
			window.dispatchEvent(new Event('focus'));
			expect(newcomer.value).toBe('light');
			expect(first.value).toBe('light');
			expect(temporary.value).toBe('light');
			expect(document.documentElement.dataset.theme).toBe('light');
			expect(localStorage.getItem('theme-switcher')).toBe('dark');
			expect(document.cookie).toContain('theme-switcher=dark');
		},
	);

	it('queues a newly configured theme without selecting against the old fieldset', async () => {
		const control = await connect();
		control.configure({
			name: 'palette',
			label: 'Palette',
			choices: [...themesForTest(), { value: 'sepia', label: 'Sepia' }],
		});
		expect(() => {
			control.value = 'sepia';
		}).not.toThrow();
		await control.ready;
		expect(control.value).toBe('sepia');
		expect(document.documentElement.dataset.theme).toBe('sepia');
		expect(localStorage.getItem('theme-switcher')).toBe('sepia');
	});

	it('validates pending API values only after preparing the new configuration', async () => {
		const control = await connect();
		control.configure({
			name: 'palette',
			label: 'Palette',
			choices: themesForTest(),
		});
		expect(() => {
			control.value = 'missing';
		}).not.toThrow();
		await expect(control.ready).rejects.toThrow(
			/Unsupported theme: missing/,
		);
		expect(document.documentElement.dataset.theme).toBe('system');
		control.configure({
			name: 'palette',
			label: 'Palette',
			choices: [...themesForTest(), { value: 'sepia', label: 'Sepia' }],
		});
		expect(() => {
			control.value = 'sepia';
		}).not.toThrow();
		await control.ready;
		expect(control.value).toBe('sepia');
	});

	it('keeps replacement groups generated after identical configure calls', async () => {
		const control = await connect();
		const config = {
			name: 'palette',
			label: 'Palette',
			value: 'dark',
			choices: themesForTest(),
		};
		control.configure(config);
		await control.ready;
		const previousGroup = control.querySelector('fieldset');
		control.configure(config);
		await control.ready;
		expect(control.querySelector('fieldset')).not.toBe(previousGroup);
		control.setAttribute('value', 'light');
		expect(control.value).toBe('light');
		expect(document.documentElement.dataset.theme).toBe('light');
	});

	it('preserves an active custom theme when an unsupported peer connects or regenerates', async () => {
		const custom = document.createElement('theme-switcher');
		custom.configure({
			name: 'palette',
			label: 'Palette',
			choices: [...themesForTest(), { value: 'sepia', label: 'Sepia' }],
		});
		await connect(custom);
		custom.value = 'sepia';
		const newcomer = document.createElement('theme-switcher');
		const error = vi.fn();
		newcomer.addEventListener('theme-switcher:error', error);
		await connect(newcomer);
		expect(newcomer.value).toBeNull();
		expect(newcomer.resolvedTheme).toBe('sepia');
		expect(newcomer.state).toBe('ready');
		expect(
			error.mock.calls.some(
				([event]) => event.detail.phase === 'synchronization',
			),
		).toBe(true);
		newcomer.darkLabel = 'Night';
		await newcomer.ready;
		expect(newcomer.value).toBeNull();
		expect(document.documentElement.dataset.theme).toBe('sepia');
		newcomer.storageKey = 'unused-theme';
		await newcomer.ready;
		expect(document.documentElement.dataset.theme).toBe('sepia');
		newcomer.remove();
		await connect(newcomer);
		expect(newcomer.value).toBeNull();
		expect(custom.value).toBe('sepia');
		expect(document.documentElement.dataset.theme).toBe('sepia');
		expect(localStorage.getItem('theme-switcher')).toBe('sepia');
		newcomer.value = 'light';
		expect(custom.value).toBe('light');
	});

	it('reports malformed cookie encoding without breaking initialization', async () => {
		document.cookie = 'theme-switcher=%broken; Path=/';
		const control = document.createElement('theme-switcher');
		control.cookie = true;
		await connect(control);
		expect(control.value).toBe('system');
		expect(console.error).toHaveBeenCalled();
	});
});

function themesForTest() {
	return ['system', 'light', 'dark'].map((value) => ({
		value,
		label: value,
	}));
}
