import { FormMultiSwitchElement } from '@aarongustafson/form-multi-switch';
export type {
	MultiSwitchChoice,
	MultiSwitchConfiguration,
	MultiSwitchBehaviorModule,
	MultiSwitchSelectionDetail,
	MultiSwitchErrorDetail,
	MultiSwitchState,
} from '@aarongustafson/form-multi-switch';

export type ThemeChangeSource =
	| 'initial'
	| 'user'
	| 'api'
	| 'attribute'
	| 'configuration'
	| 'reset'
	| 'storage'
	| 'sync'
	| 'system';
export type ThemeStorage = 'local' | 'none';
export interface ThemeChangeDetail {
	/** The page preference, including custom values. System remains literal. */
	value: string;
	previousValue: string | null;
	resolvedTheme: string;
	previousResolvedTheme: string | null;
	source: ThemeChangeSource;
}
export interface ThemeErrorDetail {
	error: unknown;
	phase: 'configuration' | 'storage' | 'synchronization';
}
export interface ThemeReadyDetail {
	value: string | null;
	resolvedTheme: string | null;
}

export class ThemeSwitcherElement extends FormMultiSwitchElement {
	static readonly observedAttributes: string[];
	/** Current selection; null before setup or if this control lacks the page theme. */
	get value(): string | null;
	/** Apply and save an offered theme without changing the reset default.
	 * While pending, queue it for validation against the prepared choices; ready
	 * rejects an unsupported queued value. Ready-state assignments throw instead.
	 */
	set value(value: string);
	/** System resolves to light/dark; custom theme values pass through unchanged. */
	readonly resolvedTheme: string | null;
	get storageKey(): string;
	set storageKey(value: string | null | undefined);
	get storage(): ThemeStorage;
	set storage(value: ThemeStorage | null | undefined);
	/** Effective optional cookie name; a bare cookie attribute uses storageKey. */
	get cookie(): string | null;
	set cookie(value: string | boolean | null | undefined);
	/** Positive cookie lifetime in seconds, defaulting to one year. */
	cookieMaxAge: number;
	get systemLabel(): string;
	set systemLabel(value: string | null | undefined);
	get lightLabel(): string;
	set lightLabel(value: string | null | undefined);
	get darkLabel(): string;
	set darkLabel(value: string | null | undefined);
	/** Includes theme configuration errors; storage failures are nonfatal. */
	readonly state: 'pending' | 'loading' | 'ready' | 'error';
	/** Resolves after native enhancement and theme setup; rejects on invalid configuration. */
	readonly ready: Promise<void>;
}

declare global {
	interface HTMLElementTagNameMap {
		'theme-switcher': ThemeSwitcherElement;
	}
	interface HTMLElementEventMap {
		'theme-switcher:change': CustomEvent<ThemeChangeDetail>;
		'theme-switcher:ready': CustomEvent<ThemeReadyDetail>;
		'theme-switcher:error': CustomEvent<ThemeErrorDetail>;
	}
}
