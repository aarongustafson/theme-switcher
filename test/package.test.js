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
				runInNewContext(restorationScripts[index], {
					document: { cookie, documentElement: { setAttribute } },
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
