import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { cwd } from 'node:process';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { FormMultiSwitchElement } from '@aarongustafson/form-multi-switch';
import { ThemeSwitcherElement } from '../theme-switcher.js';

const root = pathToFileURL(`${cwd()}/`);
const manifest = JSON.parse(
	readFileSync(new URL('custom-elements.json', root), 'utf8'),
);
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));

describe('package contracts', () => {
	it('keeps class-only exports separate from guarded registration', async () => {
		const registration = vi.spyOn(customElements, 'define');
		const { ThemeSwitcherElement: exported } = await import('../index.js');
		expect(exported).toBe(ThemeSwitcherElement);
		expect(registration).not.toHaveBeenCalled();
		const { defineThemeSwitcher } = await import('../define.js');
		expect(defineThemeSwitcher()).toBe(true);
		expect(defineThemeSwitcher()).toBe(true);
		expect(registration).not.toHaveBeenCalled();
		registration.mockRestore();
	});

	it('ships every declared export and declaration', () => {
		for (const target of Object.values(pkg.exports)) {
			for (const path of typeof target === 'string'
				? [target]
				: Object.values(target)) {
				expect(existsSync(new URL(path, root)), path).toBe(true);
				expect(pkg.files).toContain(path.replace(/^\.\//, ''));
			}
		}
		expect(pkg.dependencies['@aarongustafson/form-multi-switch']).toBe(
			'^0.1.0',
		);
	});

	const restorationScripts = [
		...readFileSync(new URL('README.md', root), 'utf8').matchAll(
			/```html\n<script>([\s\S]*?)<\/script>\n```/g,
		),
	].map((match) => match[1]);

	describe('documented early restoration scripts', () => {
		it.each([
			['localStorage', 0, 'dark', '', 'dark'],
			['literal System', 0, 'system', '', 'system'],
			['cookie fallback', 1, null, 'theme-switcher=dark', 'dark'],
			[
				'localStorage precedence',
				1,
				'light',
				'theme-switcher=dark',
				'light',
			],
			[
				'unsupported local value',
				1,
				'unknown',
				'theme-switcher=dark',
				'dark',
			],
			[
				'blocked localStorage',
				1,
				new Error('Blocked'),
				'theme-switcher=dark',
				'dark',
			],
			['malformed cookie', 1, null, 'theme-switcher=%broken', null],
			[
				'no valid saved choice',
				1,
				'unknown',
				'theme-switcher=unknown',
				null,
			],
		])(
			'restores %s without overriding a server theme with invalid data',
			(_name, index, saved, cookie, expected) => {
				const setAttribute = vi.fn();
				const diagnostics = { warn: vi.fn() };
				const readCookie = vi.fn(() => cookie);
				runInNewContext(restorationScripts[index], {
					document: {
						get cookie() {
							return readCookie();
						},
						documentElement: { setAttribute },
					},
					localStorage: {
						getItem: () => {
							if (saved instanceof Error) throw saved;
							return saved;
						},
					},
					console: diagnostics,
				});
				if (expected === null)
					expect(setAttribute).not.toHaveBeenCalled();
				else
					expect(setAttribute).toHaveBeenCalledWith(
						'data-theme',
						expected,
					);
				if (['system', 'light', 'dark'].includes(saved))
					expect(readCookie).not.toHaveBeenCalled();
				if (saved instanceof Error || cookie.includes('%broken'))
					expect(diagnostics.warn).toHaveBeenCalled();
			},
		);
	});

	it('rejects conflicting custom-element registrations explicitly', async () => {
		const { defineThemeSwitcher } = await import('../define.js');
		const registration = vi
			.spyOn(customElements, 'get')
			.mockReturnValue(class extends HTMLElement {});
		try {
			expect(() => defineThemeSwitcher()).toThrow(/already registered/);
		} finally {
			registration.mockRestore();
		}
	});

	it('keeps demos paired and documents the current storage API', () => {
		const html = readFileSync(new URL('demo/index.html', root), 'utf8');
		const template = document.createElement('template');
		template.innerHTML = html;
		const pairs = template.content.querySelectorAll('.code-demo-pair');
		expect(pairs.length).toBeGreaterThanOrEqual(10);
		for (const pair of pairs) {
			expect(pair.firstElementChild.tagName).toBe('PRE');
			expect(pair.querySelector('.demo')).not.toBeNull();
		}
		for (const frame of template.content.querySelectorAll('iframe')) {
			expect(frame.title.trim()).not.toBe('');
		}
		for (const file of [
			'README.md',
			'demo/index.html',
			'demo/extra.html',
		]) {
			const text = readFileSync(new URL(file, root), 'utf8');
			expect(text).not.toContain('no-persist');
			expect(text).toContain('storage="none"');
		}
		expect(html).toContain('cookie');
		expect(
			template.content.querySelector('script[type="importmap"]')
				.textContent,
		).toContain('@aarongustafson/form-multi-switch');
	});

	it('leads with generated controls and keeps authored forms as secondary reference', () => {
		const readme = readFileSync(new URL('README.md', root), 'utf8');
		expect(readme).toContain(
			'](https://aarongustafson.github.io/theme-switcher/)',
		);
		expect(readme).toContain(
			'](https://aarongustafson.github.io/theme-switcher/demo/)',
		);
		expect(readme).toContain('## Use the generated control');
		expect(readme).toContain('## Authored radios and forms');
		expect(readme.indexOf('## Use the generated control')).toBeLessThan(
			readme.indexOf('## Authored radios and forms'),
		);
		expect(readme.indexOf('## Configuration')).toBeLessThan(
			readme.indexOf('## Authored radios and forms'),
		);
		const template = document.createElement('template');
		template.innerHTML = readFileSync(
			new URL('demo/index.html', root),
			'utf8',
		);
		const controls = template.content.querySelectorAll('theme-switcher');
		expect(controls[0].id).toBe('default');
		for (const id of [
			'default',
			'temporary',
			'use-system',
			'appearance-form',
		]) {
			expect(template.content.querySelector(`#${id}`), id).not.toBeNull();
		}
		const form = template.content.querySelector('#appearance-form');
		expect(
			form.closest('details')?.querySelector('summary').textContent,
		).toContain('Authored radios and form submission');
		expect(
			template.content.querySelector(
				'a[href="https://github.com/aarongustafson/form-multi-switch"]',
			),
		).not.toBeNull();
	});

	it('uses HighlightText for the selected icon in forced-colors mode', () => {
		const css = readFileSync(new URL('demo/styles.css', root), 'utf8');
		const selectedIcon = css.match(
			/\.icons \[data-selected\]::before \{[^}]+\}/,
		)?.[0];
		expect(selectedIcon).toContain('background: HighlightText;');
	});

	it('demonstrates Arabic icon labels with inherited language and direction', () => {
		const template = document.createElement('template');
		template.innerHTML = readFileSync(
			new URL('demo/index.html', root),
			'utf8',
		);
		const control = template.content.querySelector('#arabic');
		expect(control).not.toBeNull();
		expect(control.parentElement.lang).toBe('ar');
		expect(control.parentElement.dir).toBe('rtl');
		expect(control.hasAttribute('dir')).toBe(false);
		expect(control.classList.contains('icons')).toBe(true);
		expect(control.getAttribute('label')).toBe('مظهر الموقع');
		expect(
			['system-label', 'light-label', 'dark-label'].map((name) =>
				control.getAttribute(name),
			),
		).toEqual(['النظام', 'فاتح', 'داكن']);
		const readme = readFileSync(new URL('README.md', root), 'utf8');
		expect(readme).toContain('<html lang="ar" dir="rtl">');
	});

	it('documents the same visually hidden legend CSS used by the icon-only demo', () => {
		const template = document.createElement('template');
		template.innerHTML = readFileSync(
			new URL('demo/index.html', root),
			'utf8',
		);
		const control = template.content.querySelector('#icon-only');
		expect(control.classList.contains('hide-legend')).toBe(true);
		expect(control.getAttribute('label')).toBe('Icon-only appearance');
		const css = readFileSync(new URL('demo/styles.css', root), 'utf8');
		const rule = css.match(
			/theme-switcher\.hide-legend legend \{[^}]+\}/,
		)?.[0];
		expect(rule).toBeDefined();
		expect(rule).toContain('clip-path: inset(50%)');
		expect(rule).not.toMatch(/display:\s*none|visibility:\s*hidden/);
		const readme = readFileSync(new URL('README.md', root), 'utf8');
		expect(readme.replace(/\s+/g, '')).toContain(rule.replace(/\s+/g, ''));
		const example = control.closest('.demo-section');
		expect(
			example.querySelector('pre code').textContent.replace(/\s+/g, ''),
		).toContain(rule.replace(/\s+/g, ''));
		expect(example.querySelector('p').textContent).toContain('author CSS');
		expect(readme).toContain('not a built-in component option');
	});

	it('provides a working refresh button below the cookie iframe', async () => {
		const template = document.createElement('template');
		template.innerHTML = readFileSync(
			new URL('demo/index.html', root),
			'utf8',
		);
		const frame = template.content.querySelector(
			'iframe[src="./cookie.html"]',
		);
		const button = frame.nextElementSibling;
		expect(button?.tagName).toBe('BUTTON');
		expect(button.type).toBe('button');
		expect(button.getAttribute('aria-controls')).toBe(frame.id);
		expect(button.textContent.trim()).toBe('Refresh cookie example');
		expect(button.disabled).toBe(true);
		const temporary = template.content.querySelector('#temporary');
		Object.defineProperty(temporary, 'ready', { value: Promise.resolve() });
		const reload = vi.spyOn(frame, 'src', 'set');
		const source = frame.src;
		const code = readFileSync(
			new URL('demo/demo.js', root),
			'utf8',
		).replace(/^import ['"]\.\.\/define\.js['"];\s*/, '');
		await runInNewContext(`(async () => {${code}})()`, {
			document: template.content,
			console,
			FormData,
		});
		expect(button.disabled).toBe(false);
		button.click();
		expect(reload).toHaveBeenCalledExactlyOnceWith(source);
		reload.mockRestore();
	});

	it('ends the demo with a live early-restoration iframe, without an extra behavior-module example', () => {
		const template = document.createElement('template');
		template.innerHTML = readFileSync(
			new URL('demo/index.html', root),
			'utf8',
		);
		expect(
			template.content.querySelector('theme-switcher[script]'),
		).toBeNull();
		expect(
			template.content.querySelector(
				'.demo-section:last-child iframe[src="./early.html"]',
			),
		).not.toBeNull();
		expect(template.content.querySelector('#demo-errors')).not.toBeNull();
	});

	it.each(['dark', 'system', 'unknown', null, new Error('Blocked')])(
		'runs the iframe head restoration before CSS and component registration for %s',
		(saved) => {
			const template = document.createElement('template');
			template.innerHTML = readFileSync(
				new URL('demo/early.html', root),
				'utf8',
			);
			const script = template.content.querySelector('script:not([type])');
			const stylesheet = template.content.querySelector(
				'link[rel="stylesheet"]',
			);
			const registration = template.content.querySelector(
				'script[type="module"]',
			);
			const nodes = [
				...template.content.querySelectorAll('script, link'),
			];
			expect(nodes.indexOf(script)).toBeLessThan(
				nodes.indexOf(stylesheet),
			);
			expect(nodes.indexOf(stylesheet)).toBeLessThan(
				nodes.indexOf(registration),
			);
			expect(registration.getAttribute('src')).toBe('../define.js');
			const control = template.content.querySelector('theme-switcher');
			const setAttribute = vi.fn();
			const warn = vi.fn();
			const getItem = vi.fn(() => {
				if (saved instanceof Error) throw saved;
				return saved;
			});
			runInNewContext(script.textContent, {
				document: { documentElement: { setAttribute } },
				localStorage: { getItem },
				console: { warn },
			});
			expect(getItem).toHaveBeenCalledWith(
				control.getAttribute('storage-key'),
			);
			expect(setAttribute).toHaveBeenCalledWith(
				'data-theme',
				saved === 'dark' || saved === 'system' ? saved : 'system',
			);
			if (saved instanceof Error) expect(warn).toHaveBeenCalled();
			expect(
				template.content.querySelector('a[href="./early.html"]'),
			).not.toBeNull();
		},
	);

	it('describes inherited behavior and every added observed attribute', () => {
		const declaration = manifest.modules[0].declarations[0];
		expect(declaration.superclass).toMatchObject({
			name: 'FormMultiSwitchElement',
			package: '@aarongustafson/form-multi-switch',
		});
		expect(declaration.tagName).toBeUndefined();
		const added = ThemeSwitcherElement.observedAttributes.filter(
			(name) => !FormMultiSwitchElement.observedAttributes.includes(name),
		);
		expect(declaration.attributes.map(({ name }) => name).sort()).toEqual(
			added.sort(),
		);
		const registrations = manifest.modules
			.flatMap((module) => module.exports ?? [])
			.filter(({ kind }) => kind === 'custom-element-definition');
		expect(registrations.map(({ name }) => name)).toEqual([
			'theme-switcher',
		]);
	});

	it('keeps the manifest and declarations aligned for new events and properties', () => {
		const declaration = manifest.modules[0].declarations[0];
		const types = readFileSync(
			new URL('theme-switcher.d.ts', root),
			'utf8',
		);
		for (const { name } of [
			...declaration.members,
			...declaration.events,
		]) {
			expect(types).toContain(name);
		}
	});
});
