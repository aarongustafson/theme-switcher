import { ThemeSwitcherElement } from './theme-switcher.js';

export function defineComponentName(tagName = 'theme-switcher') {
	const hasWindow = typeof window !== 'undefined';
	const registry = hasWindow ? window.customElements : undefined;

	if (!registry || typeof registry.define !== 'function') {
		return false;
	}

	if (!registry.get(tagName)) {
		registry.define(tagName, ThemeSwitcherElement);
	}

	return true;
}

defineComponentName();
