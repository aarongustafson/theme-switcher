import {
	ThemeSwitcherElement,
	type MultiSwitchConfiguration,
	type ThemeChangeSource,
} from '@aarongustafson/theme-switcher';
import { defineThemeSwitcher } from '@aarongustafson/theme-switcher/define.js';
import { FormMultiSwitchElement } from '@aarongustafson/form-multi-switch';

const control = document.createElement('theme-switcher');
const base: FormMultiSwitchElement = control;
const configuration: MultiSwitchConfiguration = {
	name: 'theme',
	label: 'Theme',
	choices: ['system', 'light', 'dark'].map((value) => ({
		value,
		label: value,
	})),
};
base.configure(configuration);
control.value = 'dark';
control.storageKey = undefined;
control.systemLabel = 'Device';
control.lightLabel = null;
control.darkLabel = 'Night';
control.storage = 'local';
control.cookie = true;
control.cookie = 'server-theme';
control.cookie = false;
const cookie: string | null = control.cookie;
control.cookieMaxAge = 86400;
const selected: string | null = control.value;
const resolved: string | null = control.resolvedTheme;
const instance: ThemeSwitcherElement = control;
const readiness: Promise<void> = instance.ready;
const registered: boolean = defineThemeSwitcher();
control.addEventListener('theme-switcher:change', (event) => {
	const source: ThemeChangeSource = event.detail.source;
	const value: string = event.detail.value;
	void [source, value];
});
control.addEventListener('theme-switcher:error', (event) => {
	const error: unknown = event.detail.error;
	void error;
});
// @ts-expect-error A theme preference cannot be cleared.
control.value = null;
// @ts-expect-error Storage keys must be strings.
control.storageKey = 7;
// @ts-expect-error Only documented persistence mechanisms are supported.
control.storage = 'session';
void [base, selected, resolved, readiness, registered, cookie];
