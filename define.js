import { ThemeSwitcherElement } from './theme-switcher.js';

export function defineThemeSwitcher() {
	const hasWindow = typeof window !== 'undefined';
	const registry = hasWindow ? window.customElements : undefined;

	if (!registry || typeof registry.define !== 'function') {
		return false;
	}

	const existing = registry.get('theme-switcher');
	if (existing && existing !== ThemeSwitcherElement) {
		throw new Error(
			'theme-switcher is already registered with a different constructor.',
		);
	}
	if (!existing) {
		registry.define('theme-switcher', ThemeSwitcherElement);
	}

	return true;
}

defineThemeSwitcher();
