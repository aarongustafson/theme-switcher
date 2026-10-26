import { beforeAll } from 'vitest';
import { ThemeSwitcherElement } from '../theme-switcher.js';

const elementName = 'theme-switcher'.toLowerCase();

// Define the custom element before tests run
beforeAll(() => {
	if (!customElements.get(elementName)) {
		customElements.define(elementName, ThemeSwitcherElement);
	}

	// Make the class available globally for testing static methods
	globalThis.ThemeSwitcherElement = ThemeSwitcherElement;
});
