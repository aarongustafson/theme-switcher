import '../define.js';

const fixture = document.querySelector('#fixture');
const results = document.querySelector('#results');
const key = 'theme-switcher-browser';

function assert(condition, message) {
	if (!condition) throw new Error(message);
}
async function until(predicate) {
	for (let attempt = 0; attempt < 180; attempt += 1) {
		if (predicate()) return;
		await new Promise((resolve) => requestAnimationFrame(resolve));
	}
	throw new Error('Timed out waiting for the expected browser update.');
}
async function setup(markup = '') {
	fixture.replaceChildren();
	document.documentElement.removeAttribute('data-theme');
	localStorage.removeItem(key);
	document.cookie = `${key}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`;
	const control = document.createElement('theme-switcher');
	control.storageKey = key;
	control.innerHTML = markup;
	fixture.append(control);
	await control.ready;
	return control;
}
const afterReset = () => new Promise((resolve) => setTimeout(resolve, 0));
const radios = `<fieldset><legend>Reading appearance</legend>
	<label><input type="radio" name="appearance" value="system" checked>Device</label>
	<label><input type="radio" name="appearance" value="light">Light</label>
	<label><input type="radio" name="appearance" value="dark">Dark</label></fieldset>`;

const tests = [
	[
		'Default native group and literal System preference',
		async () => {
			const control = await setup();
			assert(
				control.querySelectorAll('input').length === 3,
				'Expected three radios.',
			);
			assert(
				!control.shadowRoot,
				'Controls must remain in the light DOM.',
			);
			assert(
				control.value === 'system' &&
					document.documentElement.dataset.theme === 'system',
				'System was not kept literal.',
			);
			assert(
				control.resolvedTheme ===
					(matchMedia('(prefers-color-scheme: dark)').matches
						? 'dark'
						: 'light'),
				'System resolution disagrees with the browser.',
			);
		},
	],
	[
		'Startup restores saved user choices or System instead of author defaults',
		async () => {
			for (const saved of [null, 'dark', 'system']) {
				fixture.replaceChildren();
				localStorage.removeItem(key);
				if (saved !== null) localStorage.setItem(key, saved);
				document.documentElement.dataset.theme = 'dark';
				const control = document.createElement('theme-switcher');
				control.storageKey = key;
				control.setAttribute('value', 'dark');
				control.value = 'light';
				fixture.append(control);
				await control.ready;
				assert(
					control.value === (saved ?? 'system') &&
						document.documentElement.dataset.theme ===
							(saved ?? 'system') &&
						localStorage.getItem(key) === saved,
					'Startup author configuration replaced or persisted a user preference.',
				);
				assert(
					control.querySelector('input[value="dark"]').defaultChecked,
					'Startup changed the generated reset default.',
				);
				if (control.value === 'system')
					assert(
						control.resolvedTheme ===
							(matchMedia('(prefers-color-scheme: dark)').matches
								? 'dark'
								: 'light'),
						'System did not follow the device preference.',
					);
			}
		},
	],
	[
		'Authored checked defaults affect reset, not the initial user preference',
		async () => {
			await setup();
			fixture.replaceChildren();
			const form = document.createElement('form');
			const control = document.createElement('theme-switcher');
			control.storageKey = key;
			control.innerHTML = radios
				.replace('value="system" checked', 'value="system"')
				.replace('value="dark"', 'value="dark" checked');
			form.append(control);
			fixture.append(form);
			await control.ready;
			assert(
				control.value === 'system',
				'An authored default forced the startup theme.',
			);
			assert(
				new FormData(form).get('appearance') === 'system',
				'FormData did not use the initial user preference.',
			);
			form.reset();
			await afterReset();
			assert(
				control.value === 'dark' &&
					localStorage.getItem(key) === 'dark',
				'Native reset lost the authored default.',
			);
		},
	],
	[
		'Authored names, form submission, and canceled native reset',
		async () => {
			const control = await setup(radios);
			const form = document.createElement('form');
			fixture.append(form);
			form.append(control);
			await control.ready;
			control.value = 'dark';
			assert(
				new FormData(form).get('appearance') === 'dark',
				'FormData lost the native radio.',
			);
			form.addEventListener('reset', (event) => event.preventDefault(), {
				once: true,
			});
			form.reset();
			await afterReset();
			assert(
				control.value === 'dark' &&
					document.documentElement.dataset.theme === 'dark',
				'A canceled reset changed the preference.',
			);
			form.reset();
			await afterReset();
			assert(
				control.value === 'system' &&
					localStorage.getItem(key) === 'system',
				'Reset did not restore and persist the authored default.',
			);
		},
	],
	[
		'Same-page synchronization and API event semantics',
		async () => {
			const first = await setup();
			const second = document.createElement('theme-switcher');
			second.storageKey = key;
			fixture.append(second);
			await second.ready;
			let themeChanges = 0;
			let baseChanges = 0;
			second.addEventListener('theme-switcher:change', () => {
				themeChanges += 1;
			});
			first.addEventListener('form-multi-switch:change', () => {
				baseChanges += 1;
			});
			first.value = 'dark';
			assert(
				second.value === 'dark' &&
					themeChanges === 1 &&
					baseChanges === 0,
				'API synchronization changed the interaction contract.',
			);
			first.querySelector('input[value="light"]').click();
			assert(
				first.value === 'light' &&
					second.value === 'light' &&
					baseChanges === 1,
				'Native interaction did not synchronize.',
			);
		},
	],
	[
		'Direction inherits from ancestors and html, with an explicit override',
		async () => {
			const control = await setup();
			const wrapper = document.createElement('div');
			wrapper.lang = 'ar';
			wrapper.dir = 'rtl';
			fixture.append(wrapper);
			wrapper.append(control);
			control.style.inlineSize = '30rem';
			await control.ready;
			const previousDirection =
				document.documentElement.getAttribute('dir');
			const system = control.querySelector('[data-value="system"]');
			const dark = control.querySelector('[data-value="dark"]');
			try {
				assert(
					!control.hasAttribute('dir') &&
						getComputedStyle(control).direction === 'rtl',
					'The control did not inherit ancestor direction.',
				);
				assert(
					system.getBoundingClientRect().left >
						dark.getBoundingClientRect().left,
					'RTL did not reverse the visual segment order.',
				);
				wrapper.removeAttribute('dir');
				document.documentElement.dir = 'rtl';
				assert(
					getComputedStyle(control).direction === 'rtl',
					'The control did not inherit html direction.',
				);
				control.dir = 'ltr';
				assert(
					getComputedStyle(control).direction === 'ltr' &&
						system.getBoundingClientRect().left <
							dark.getBoundingClientRect().left,
					'An explicit direction did not override the document.',
				);
			} finally {
				if (previousDirection === null)
					document.documentElement.removeAttribute('dir');
				else
					document.documentElement.setAttribute(
						'dir',
						previousDirection,
					);
			}
		},
	],
	[
		'Translated labels retain the live selection after regeneration',
		async () => {
			const control = await setup();
			control.value = 'dark';
			control.systemLabel = 'Appareil';
			control.lightLabel = 'Clair';
			control.darkLabel = 'Sombre';
			await control.ready;
			assert(
				control.value === 'dark',
				'Relabeling reset the preference.',
			);
			assert(
				control.querySelector('[data-value="dark"]').textContent ===
					'Sombre',
				'Updated labels were not rendered.',
			);
			control.setAttribute('value', 'light');
			assert(
				document.documentElement.dataset.theme === 'light',
				'A regenerated group lost its value-attribute behavior.',
			);
		},
	],
	[
		'Custom theme values and text-only labels',
		async () => {
			const control = await setup();
			control.configure({
				name: 'palette',
				label: 'Palette',
				value: 'sepia',
				choices: [
					{ value: 'system', label: 'System' },
					{ value: 'light', label: 'Light' },
					{ value: 'dark', label: 'Dark' },
					{ value: 'sepia', label: '<img src=x>' },
				],
			});
			await control.ready;
			assert(
				control.value === 'sepia' && control.resolvedTheme === 'sepia',
				'Custom theme was misclassified.',
			);
			assert(
				!control.querySelector('img'),
				'A choice label became HTML.',
			);
		},
	],
	[
		'Invalid theme configuration falls back to visible native radios',
		async () => {
			const control = await setup();
			control.configure({
				name: 'invalid',
				label: 'Invalid themes',
				choices: [{ value: 'dark', label: 'Dark' }],
				value: 'dark',
			});
			let rejected = false;
			try {
				await control.ready;
			} catch {
				rejected = true;
			}
			const input = control.querySelector('input');
			assert(
				rejected && control.state === 'error',
				'Invalid theme configuration did not reject readiness.',
			);
			assert(
				getComputedStyle(input).clipPath === 'none',
				'Configuration failure left nonfunctional enhanced controls visible.',
			);
		},
	],
	[
		'Optional behavior modules load and clean up',
		async () => {
			const control = await setup();
			const output = document.createElement('output');
			fixture.append(output);
			control.script = './observe.js';
			await control.ready;
			control.value = 'dark';
			assert(
				output.textContent === 'dark → dark',
				'The optional initializer did not see theme events.',
			);
			control.remove();
			assert(
				output.textContent === 'Listener disconnected.',
				'Module cleanup did not run.',
			);
		},
	],
	[
		'Real storage events synchronize separate documents without echo writes',
		async () => {
			const control = await setup();
			const frame = document.createElement('iframe');
			frame.title = 'Storage synchronization test';
			frame.src = './peer.html';
			fixture.append(frame);
			await new Promise((resolve, reject) => {
				frame.onload = resolve;
				frame.onerror = () =>
					reject(new Error('Storage peer failed to load.'));
			});
			const peer = frame.contentDocument.querySelector('theme-switcher');
			await peer.ready;
			peer.value = 'dark';
			await until(() => control.value === 'dark');
			assert(
				document.documentElement.dataset.theme === 'dark',
				'The storage event did not apply the theme.',
			);
			control.value = 'light';
			await until(() => peer.value === 'light');
			assert(
				localStorage.getItem(key) === 'light',
				'A peer wrote a stale preference back.',
			);
			let finish;
			control.loadModule = () =>
				new Promise((resolve) => {
					finish = resolve;
				});
			for (const explicit of [false, true]) {
				control.script = `./pending-storage-${explicit}.js`;
				await until(() => control.state === 'loading');
				if (explicit) control.value = 'system';
				const received = new Promise((resolve) =>
					window.addEventListener('storage', resolve, { once: true }),
				);
				peer.value = explicit ? 'light' : 'dark';
				await received;
				finish({});
				await control.ready;
				assert(
					control.value === (explicit ? 'system' : 'dark'),
					'A storage event during loading was lost or replaced a queued API value.',
				);
				await until(() => peer.value === control.value);
			}
			peer.value = 'dark';
			await until(() => control.value === 'dark');
			localStorage.removeItem(key);
			await until(() => peer.value === 'system');
			frame.remove();
		},
	],
	[
		'Repeated connection installs one stylesheet and removes old listeners',
		async () => {
			const control = await setup();
			let changes = 0;
			control.addEventListener('theme-switcher:change', () => {
				changes += 1;
			});
			for (let count = 0; count < 10; count += 1) {
				control.remove();
				fixture.append(control);
				await control.ready;
			}
			changes = 0;
			control.querySelector('input[value="dark"]').click();
			assert(
				changes === 1,
				'Repeated connection left duplicate event listeners.',
			);
			assert(
				document.querySelectorAll('#form-multi-switch-styles')
					.length === 1,
				'Default styles were installed repeatedly.',
			);
		},
	],
	[
		'Cookie backing mirrors localStorage and survives reload-style restoration',
		async () => {
			let control = await setup();
			control.cookie = true;
			control.value = 'dark';
			assert(
				document.cookie.includes(`${key}=dark`) &&
					localStorage.getItem(key) === 'dark',
				'Both stores were not updated.',
			);
			control.remove();
			localStorage.removeItem(key);
			document.documentElement.removeAttribute('data-theme');
			control = document.createElement('theme-switcher');
			control.storageKey = key;
			control.cookie = true;
			fixture.append(control);
			await control.ready;
			assert(
				control.value === 'dark' &&
					localStorage.getItem(key) === 'dark',
				'Cookie fallback did not restore and reconcile localStorage.',
			);
			control.storage = 'none';
			control.value = 'light';
			assert(
				document.cookie.includes(`${key}=dark`) &&
					localStorage.getItem(key) === 'dark',
				'Storage none did not override cookie backing.',
			);
		},
	],
	[
		'Regeneration preserves newer sync and queued API values',
		async () => {
			const first = await setup();
			const second = document.createElement('theme-switcher');
			second.storageKey = key;
			fixture.append(second);
			await second.ready;
			first.value = 'dark';
			second.darkLabel = 'Night';
			first.value = 'light';
			await second.ready;
			assert(
				first.value === 'light' && second.value === 'light',
				'Relabeling restored a stale preference.',
			);
			const config = {
				name: 'palette',
				label: 'Palette',
				choices: ['system', 'light', 'dark', 'sepia'].map((value) => ({
					value,
					label: value,
				})),
			};
			second.configure(config);
			second.value = 'sepia';
			second.label = 'Updated palette';
			first.value = 'dark';
			await second.ready;
			assert(
				second.value === 'sepia' && first.value === null,
				'A queued API preference was discarded.',
			);
			second.configure(config);
			await second.ready;
			second.configure(config);
			await second.ready;
			second.setAttribute('value', 'light');
			assert(
				document.documentElement.dataset.theme === 'light' &&
					first.value === 'light',
				'An identical configure call lost generated behavior.',
			);
		},
	],
	[
		'Properties assigned before custom-element definition survive upgrade',
		async () => {
			await setup();
			fixture.replaceChildren();
			const tag = 'theme-switcher-upgrade-test';
			const control = document.createElement(tag);
			control.name = 'site-appearance';
			control.label = 'Thème du site';
			control.storage = 'none';
			control.value = 'dark';
			fixture.append(control);
			customElements.define(
				tag,
				class extends customElements.get('theme-switcher') {},
			);
			await control.ready;
			assert(
				control.name === 'site-appearance' &&
					control.querySelector('input').name === 'site-appearance',
				'Upgrade discarded the authored name.',
			);
			assert(
				control.label === 'Thème du site' &&
					control.querySelector('legend').textContent ===
						'Thème du site',
				'Upgrade discarded the localized group label.',
			);
			assert(
				control.value === 'system',
				'An early API assignment overrode the initial user preference.',
			);
		},
	],
	[
		'Native resets work for internal and externally associated shadow-tree forms',
		async () => {
			const peer = await setup();
			const host = document.createElement('div');
			fixture.append(host);
			const root = host.attachShadow({ mode: 'closed' });
			const form = document.createElement('form');
			form.id = 'shadow-theme-form';
			const control = document.createElement('theme-switcher');
			control.storageKey = key;
			control.innerHTML = radios;
			root.append(form);
			form.append(control);
			await control.ready;
			control.value = 'dark';
			form.addEventListener('reset', (event) => event.preventDefault(), {
				once: true,
			});
			form.reset();
			await afterReset();
			assert(
				control.value === 'dark' && peer.value === 'dark',
				'A canceled shadow-tree reset changed the preference.',
			);
			form.reset();
			await afterReset();
			assert(
				control.value === 'system' &&
					peer.value === 'system' &&
					localStorage.getItem(key) === 'system',
				'The native non-composed reset did not apply outside the shadow tree.',
			);
			for (const input of control.querySelectorAll('input'))
				input.setAttribute('form', form.id);
			root.append(control);
			await control.ready;
			control.value = 'light';
			assert(
				new FormData(form).get('appearance') === 'light',
				'External shadow-tree form association failed.',
			);
			form.reset();
			await afterReset();
			assert(
				control.value === 'system' &&
					document.documentElement.dataset.theme === 'system',
				'An externally associated reset did not update the page.',
			);
		},
	],
	[
		'New controls preserve temporary and unsupported custom page preferences',
		async () => {
			const first = await setup();
			first.value = 'dark';
			document.cookie = `${key}=dark; Path=/`;
			const temporary = document.createElement('theme-switcher');
			temporary.storage = 'none';
			fixture.append(temporary);
			await temporary.ready;
			temporary.value = 'light';
			const newcomer = document.createElement('theme-switcher');
			newcomer.storageKey = key;
			newcomer.cookie = true;
			fixture.append(newcomer);
			await newcomer.ready;
			window.dispatchEvent(new Event('focus'));
			assert(
				newcomer.value === 'light' &&
					first.value === 'light' &&
					localStorage.getItem(key) === 'dark',
				'Connecting a stored control replaced or persisted the temporary preference.',
			);
			first.configure({
				name: 'palette',
				label: 'Palette',
				value: 'sepia',
				choices: ['system', 'light', 'dark', 'sepia'].map((value) => ({
					value,
					label: value,
				})),
			});
			await first.ready;
			first.value = 'sepia';
			const standard = document.createElement('theme-switcher');
			standard.storageKey = key;
			fixture.append(standard);
			await standard.ready;
			assert(
				standard.value === null &&
					standard.resolvedTheme === 'sepia' &&
					first.value === 'sepia',
				'An unsupported new peer replaced the active custom theme.',
			);
			standard.darkLabel = 'Night';
			await standard.ready;
			assert(
				standard.value === null &&
					document.documentElement.dataset.theme === 'sepia',
				'Regeneration replaced an unsupported active theme.',
			);
		},
	],
	[
		'Configuring a persistent control does not save a temporary peer preference',
		async () => {
			const control = await setup();
			control.setAttribute('value', 'dark');
			const temporary = document.createElement('theme-switcher');
			temporary.storage = 'none';
			fixture.append(temporary);
			await temporary.ready;
			temporary.value = 'light';
			control.configure({
				name: 'palette',
				label: 'Palette',
				choices: ['system', 'light', 'dark'].map((value) => ({
					value,
					label: value,
				})),
			});
			assert(
				localStorage.getItem(key) === 'dark',
				'Configuration saved the old fieldset selection.',
			);
			await control.ready;
			assert(
				localStorage.getItem(key) === 'dark',
				'Configuration saved a temporary page preference.',
			);
		},
	],
	[
		'Cookie-backed peers share write snapshots without saving each other’s storage',
		async () => {
			const first = await setup();
			first.cookie = true;
			const second = document.createElement('theme-switcher');
			second.storageKey = `${key}-peer`;
			second.cookie = key;
			localStorage.removeItem(second.storageKey);
			fixture.append(second);
			await second.ready;
			first.value = 'dark';
			const temporary = document.createElement('theme-switcher');
			temporary.storage = 'none';
			fixture.append(temporary);
			await temporary.ready;
			temporary.value = 'light';
			window.dispatchEvent(new Event('focus'));
			assert(
				first.value === 'light' &&
					second.value === 'light' &&
					localStorage.getItem(key) === 'dark' &&
					localStorage.getItem(second.storageKey) === null,
				'A stale peer cookie snapshot restored or saved the wrong preference.',
			);
		},
	],
	[
		'Selected decorative icons use a contrasting system foreground',
		async () => {
			const control = await setup();
			control.classList.add('icons');
			control.value = 'dark';
			const selected = control.querySelector('[data-value="dark"]');
			const probe = document.createElement('span');
			probe.style.cssText =
				'background: HighlightText; forced-color-adjust: none;';
			fixture.append(probe);
			const icon = getComputedStyle(selected, '::before');
			assert(
				icon.backgroundColor ===
					getComputedStyle(probe).backgroundColor,
				'The selected icon is not HighlightText.',
			);
			assert(
				icon.backgroundColor !==
					getComputedStyle(selected).backgroundColor,
				'The selected icon disappears into its background.',
			);
			assert(
				icon.maskImage.includes('dark.svg'),
				'The selected icon has no identifying symbol.',
			);
		},
	],
];

if (new URL(location.href).searchParams.has('native-reset')) {
	tests.push([
		'Trusted reset-button activation reconciles native radios, theme, storage, and peers',
		async () => {
			const control = await setup(radios);
			const form = document.createElement('form');
			const button = document.createElement('button');
			button.type = 'reset';
			button.textContent = 'Reset appearance';
			fixture.append(form);
			form.append(control, button);
			await control.ready;
			const peer = document.createElement('theme-switcher');
			peer.storageKey = key;
			fixture.append(peer);
			await peer.ready;
			control.value = 'dark';
			await new Promise((resolve) =>
				button.addEventListener('click', () => setTimeout(resolve, 0), {
					once: true,
				}),
			);
			await afterReset();
			assert(
				control.value === 'system' &&
					peer.value === 'system' &&
					document.documentElement.dataset.theme === 'system' &&
					localStorage.getItem(key) === 'system',
				`A reset-button activation left theme state out of sync: ${JSON.stringify(
					{
						value: control.value,
						peer: peer.value,
						root: document.documentElement.dataset.theme,
						saved: localStorage.getItem(key),
						state: control.state,
					},
				)}`,
			);
		},
	]);
}

window.browserResults = [];
for (const [name, test] of tests) {
	const result = document.createElement('li');
	try {
		await test();
		result.textContent = `PASS: ${name}`;
		window.browserResults.push({ name, passed: true });
	} catch (error) {
		result.textContent = `FAIL: ${name}: ${error.message}`;
		window.browserResults.push({
			name,
			passed: false,
			error: error.message,
		});
		console.error(error);
	}
	results.append(result);
}
fixture.replaceChildren();
localStorage.removeItem(key);
document.cookie = `${key}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`;
window.browserTestsComplete = true;
