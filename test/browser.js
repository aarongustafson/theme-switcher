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
			await Promise.resolve();
			assert(
				control.value === 'dark' &&
					document.documentElement.dataset.theme === 'dark',
				'A canceled reset changed the preference.',
			);
			form.reset();
			await Promise.resolve();
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
];

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
