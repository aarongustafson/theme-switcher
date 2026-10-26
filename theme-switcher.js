import { FormMultiSwitchElement } from '@aarongustafson/form-multi-switch';

const documents = new WeakMap();
const themes = ['system', 'light', 'dark'];
const labelAttributes = ['system-label', 'light-label', 'dark-label'];
const storageModes = ['local', 'none'];
const cookieName = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
let sequence = 0;

/**
 * A light-DOM theme preference control with native radio semantics.
 * @element theme-switcher
 * @extends FormMultiSwitchElement
 */
export class ThemeSwitcherElement extends FormMultiSwitchElement {
	static get observedAttributes() {
		return [
			...super.observedAttributes,
			...labelAttributes,
			'storage-key',
			'storage',
			'cookie',
			'cookie-max-age',
		];
	}

	constructor() {
		super();
		this._themeSession = null;
		this._themeStarted = false;
		this._themePreparing = false;
		this._themeConfiguring = false;
		this._themeDefaultChoices = false;
		this._themeWritingChoices = false;
		this._themeGeneratedGroup = null;
		this._themeGenerating = false;
		this._themeReloadStorage = false;
		this._themeCookieSnapshot = undefined;
		this._themeMedia = null;
		this._themeDocument = null;
		this._themeSelection = null;
		this._themeResolved = null;
		this._themePendingValue = undefined;
		this._themePersistPendingValue = false;
		this._themeError = null;
		this.addEventListener('form-multi-switch:ready', (event) => {
			if (event.target === this) this._themeInitialize();
		});
		this.addEventListener('form-multi-switch:change', (event) => {
			if (event.target === this && this.state === 'ready') {
				this._themeCommit(event.detail.value, 'user', true);
			}
		});
	}

	connectedCallback() {
		this._themeDocument = this.ownerDocument;
		this._themeSession = new AbortController();
		const { signal } = this._themeSession;
		const start = () => {
			this._themePreparing = true;
			for (const property of [
				'name',
				'label',
				'storageKey',
				'storage',
				'cookie',
				'cookieMaxAge',
				'systemLabel',
				'lightLabel',
				'darkLabel',
			]) {
				if (Object.prototype.hasOwnProperty.call(this, property)) {
					const value = this[property];
					delete this[property];
					this[property] = value;
				}
			}
			if (!this.querySelector('fieldset')) {
				this._themeGenerating = true;
				if (!this.hasAttribute('name'))
					this.name = `theme-switcher-${++sequence}`;
				if (!this.hasAttribute('label')) this.label = 'Theme';
				if (!this.hasAttribute('choices')) {
					this._themeDefaultChoices = true;
					this._themeSetChoices();
				}
				if (!this.hasAttribute('value'))
					this.setAttribute('value', 'system');
			}
			this._themePreparing = false;
			this._themeStarted = true;
			this._themeMedia = this.ownerDocument.defaultView.matchMedia(
				'(prefers-color-scheme: dark)',
			);
			this._themeMedia.addEventListener(
				'change',
				() => {
					if (
						this.state === 'ready' &&
						this._themeSelection === 'system'
					)
						this._themeUpdate('system', 'system');
				},
				{ signal },
			);
			this.ownerDocument.defaultView.addEventListener(
				'storage',
				(event) => {
					if (
						this.state !== 'ready' ||
						this.storage !== 'local' ||
						(event.key !== null && event.key !== this.storageKey)
					)
						return;
					try {
						if (
							event.storageArea &&
							event.storageArea !==
								this.ownerDocument.defaultView.localStorage
						)
							return;
					} catch (error) {
						this._themeReport(error, 'storage');
						return;
					}
					const value = event.newValue ?? 'system';
					if (!this._themeSupports(value)) {
						this._themeReport(
							new RangeError(`Unsupported saved theme: ${value}`),
							'storage',
						);
						return;
					}
					this._themeCommit(value, 'storage', false);
				},
				{ signal },
			);
			const checkCookie = () => this._themeCheckCookie();
			this.ownerDocument.defaultView.addEventListener(
				'focus',
				checkCookie,
				{ signal },
			);
			this.ownerDocument.addEventListener(
				'visibilitychange',
				() => {
					if (this.ownerDocument.visibilityState === 'visible')
						checkCookie();
				},
				{ signal },
			);
			this.ownerDocument.defaultView.cookieStore?.addEventListener(
				'change',
				(event) => {
					if (
						[...event.changed, ...event.deleted].some(
							(cookie) => cookie.name === this.cookie,
						)
					)
						checkCookie();
				},
				{ signal },
			);
			this.getRootNode().addEventListener(
				'reset',
				(event) => {
					if (
						![...this.querySelectorAll('input[type="radio"]')].some(
							(input) => input.form === event.target,
						)
					)
						return;
					queueMicrotask(() => {
						if (
							!signal.aborted &&
							this.state === 'ready' &&
							!event.defaultPrevented
						)
							this._themeCommit(
								super.value ?? 'system',
								'reset',
								true,
							);
					});
				},
				{ signal },
			);
			super.connectedCallback();
		};
		// Wait for authored children before deciding whether to generate choices.
		if (this.ownerDocument.readyState === 'loading') {
			this.ownerDocument.addEventListener('DOMContentLoaded', start, {
				once: true,
				signal,
			});
		} else {
			start();
		}
	}

	disconnectedCallback() {
		this._themeSession?.abort();
		documents.get(this._themeDocument)?.delete(this);
		this._themeStarted = false;
		this._themeSelection = null;
		this._themeResolved = null;
		this._themeReloadStorage = false;
		super.disconnectedCallback();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue || this._themePreparing) return;
		if (name === 'choices' && !this._themeWritingChoices)
			this._themeDefaultChoices = false;
		if (labelAttributes.includes(name)) {
			if (this._themeDefaultChoices && !this._themeAuthored()) {
				if (!this._themePersistPendingValue)
					this._themePendingValue =
						this.value ??
						this._themeSelection ??
						this._themePendingValue;
				this._themeSetChoices();
			}
			return;
		}
		if (
			['storage-key', 'storage', 'cookie', 'cookie-max-age'].includes(
				name,
			)
		) {
			if (name !== 'cookie-max-age')
				this._themeReloadStorage =
					this._themeSelection !== null && this.storage !== 'none';
			if (this._themeStarted && super.state === 'ready')
				this._themeInitialize();
			return;
		}
		if (this.isConnected && !this._themeStarted) return;
		if (
			['name', 'label'].includes(name) &&
			!this._themeConfiguring &&
			this._themeSelection !== null &&
			!this._themeAuthored()
		) {
			if (!this._themePersistPendingValue)
				this._themePendingValue =
					this.value ??
					this._themeSelection ??
					this._themePendingValue;
		}
		if (
			['choices', 'name', 'label'].includes(name) &&
			!this._themeAuthored()
		)
			this._themeGenerating = true;
		super.attributeChangedCallback(name, oldValue, newValue);
		if (
			name === 'value' &&
			this._themeStarted &&
			this.state === 'ready' &&
			!this._themeAuthored()
		) {
			this._themeCommit(super.value ?? 'system', 'attribute', true);
		}
	}

	get value() {
		return super.value;
	}
	set value(value) {
		if (typeof value !== 'string' || !value.trim())
			throw new TypeError('A theme value must be a nonempty string.');
		if (!this._themeStarted || super.state !== 'ready') {
			this._themePendingValue = value;
			this._themePersistPendingValue = true;
			return;
		}
		if (this._themeError) throw this._themeError;
		if (!this._themeSupports(value))
			throw new RangeError(`Unsupported theme: ${value}`);
		this._themeCommit(value, 'api', true);
	}
	get resolvedTheme() {
		return this._themeResolved;
	}
	get storageKey() {
		return this.getAttribute('storage-key') ?? 'theme-switcher';
	}
	set storageKey(value) {
		if (value == null) this.removeAttribute('storage-key');
		else {
			if (typeof value !== 'string' || !value.trim())
				throw new TypeError('storageKey must be a nonempty string.');
			this.setAttribute('storage-key', value);
		}
	}
	get storage() {
		return this.getAttribute('storage') ?? 'local';
	}
	set storage(value) {
		if (value == null) this.removeAttribute('storage');
		else {
			if (!storageModes.includes(value))
				throw new TypeError('storage must be local or none.');
			this.setAttribute('storage', value);
		}
	}
	get cookie() {
		if (!this.hasAttribute('cookie')) return null;
		return this.getAttribute('cookie') || this.storageKey;
	}
	set cookie(value) {
		if (value == null || value === false) this.removeAttribute('cookie');
		else if (value === true) this.setAttribute('cookie', '');
		else if (typeof value === 'string') this.setAttribute('cookie', value);
		else
			throw new TypeError(
				'cookie must be a cookie name, true, false, or null.',
			);
	}
	get cookieMaxAge() {
		return this.hasAttribute('cookie-max-age')
			? Number(this.getAttribute('cookie-max-age'))
			: 31536000;
	}
	set cookieMaxAge(value) {
		if (!Number.isSafeInteger(value) || value <= 0)
			throw new TypeError(
				'cookieMaxAge must be a positive integer in seconds.',
			);
		this.setAttribute('cookie-max-age', String(value));
	}
	get systemLabel() {
		return this.getAttribute('system-label') ?? 'System';
	}
	set systemLabel(value) {
		this._themeLabel('system-label', value);
	}
	get lightLabel() {
		return this.getAttribute('light-label') ?? 'Light';
	}
	set lightLabel(value) {
		this._themeLabel('light-label', value);
	}
	get darkLabel() {
		return this.getAttribute('dark-label') ?? 'Dark';
	}
	set darkLabel(value) {
		this._themeLabel('dark-label', value);
	}
	get state() {
		return this._themeError ? 'error' : super.state;
	}
	get ready() {
		return super.ready.then(() => {
			if (this._themeError) throw this._themeError;
		});
	}

	configure(configuration) {
		this._themeConfiguring = true;
		try {
			super.configure(configuration);
			this._themeGenerating = true;
		} finally {
			this._themeConfiguring = false;
		}
	}

	_themeLabel(attribute, value) {
		if (value == null) this.removeAttribute(attribute);
		else this.setAttribute(attribute, String(value));
	}

	_themeSetChoices() {
		this._themeWritingChoices = true;
		this.setAttribute(
			'choices',
			JSON.stringify(
				themes.map((value, index) => ({
					value,
					label: [this.systemLabel, this.lightLabel, this.darkLabel][
						index
					],
				})),
			),
		);
		this._themeWritingChoices = false;
	}

	_themeAuthored() {
		return [...this.querySelectorAll('fieldset')].some(
			(group) => group !== this._themeGeneratedGroup,
		);
	}

	_themeSupports(value) {
		return [...this.querySelectorAll('input[type="radio"]')].some(
			(input) => input.value === value,
		);
	}

	_themeInitialize() {
		this._themeError = null;
		try {
			if (!storageModes.includes(this.storage))
				throw new TypeError('storage must be local or none.');
			if (this.storage !== 'none' && !this.storageKey.trim())
				throw new TypeError('storage-key must be a nonempty string.');
			if (this.storage !== 'none' && this.cookie !== null) {
				if (!cookieName.test(this.cookie))
					throw new TypeError(
						'cookie must resolve to a valid cookie name.',
					);
				if (
					!Number.isSafeInteger(this.cookieMaxAge) ||
					this.cookieMaxAge <= 0
				)
					throw new TypeError(
						'cookie-max-age must be a positive integer in seconds.',
					);
			}
			if (!themes.every((value) => this._themeSupports(value))) {
				throw new TypeError(
					'Theme choices must include system, light, and dark.',
				);
			}
			if (
				[...this.querySelectorAll('input[type="radio"]')].some(
					(input) => !input.value.trim(),
				)
			) {
				throw new TypeError('Theme values must be nonempty strings.');
			}
			if (this._themeGenerating) {
				this._themeGeneratedGroup = this.querySelector('fieldset');
				this._themeGenerating = false;
			}
			let peers = documents.get(this.ownerDocument);
			if (!peers) {
				peers = new Set();
				documents.set(this.ownerDocument, peers);
			}
			const active = [...peers].find(
				(peer) => peer !== this,
			)?._themeSelection;
			const joiningPage = this._themeSelection === null && active != null;
			const saved =
				!joiningPage &&
				(this._themeSelection === null || this._themeReloadStorage)
					? this._themeRead()
					: undefined;
			if (
				joiningPage &&
				this.storage !== 'none' &&
				this.cookie !== null
			) {
				try {
					this._themeCookieSnapshot = this._themeReadCookie();
				} catch (error) {
					this._themeReport(error, 'storage');
				}
			}
			let value = this._themePendingValue;
			const persistPendingValue = this._themePersistPendingValue;
			let sharedPreference = value !== undefined && !persistPendingValue;
			this._themePendingValue = undefined;
			this._themePersistPendingValue = false;
			if (
				value !== undefined &&
				!sharedPreference &&
				!this._themeSupports(value)
			)
				throw new RangeError(`Unsupported theme: ${value}`);
			if (value === undefined) {
				sharedPreference = joiningPage;
				value = joiningPage
					? active
					: this._themeReloadStorage
						? (saved ?? super.value ?? this._themeSelection)
						: this._themeSelection !== null
							? (super.value ?? this._themeSelection)
							: saved;
				if (
					this._themeSelection !== null &&
					value === this._themeSelection
				)
					sharedPreference = true;
				if (!sharedPreference && !this._themeSupports(value))
					value =
						this.ownerDocument.documentElement.getAttribute(
							'data-theme',
						);
				if (!sharedPreference && !this._themeSupports(value))
					value = super.value ?? 'system';
				if (!sharedPreference && !this._themeSupports(value))
					value = 'system';
			}
			this._themeReloadStorage = false;
			peers.add(this);
			this.setAttribute('data-multi-switch-state', super.state);
			const source =
				this._themeSelection === null ? 'initial' : 'configuration';
			if (sharedPreference && !this._themeSupports(value))
				this._themeUpdate(value, source);
			else
				this._themeCommit(
					value,
					source,
					persistPendingValue ||
						(this.cookie !== null && saved != null),
				);
			this.dispatchEvent(
				new CustomEvent('theme-switcher:ready', {
					bubbles: true,
					detail: {
						value: this.value,
						resolvedTheme: this.resolvedTheme,
					},
				}),
			);
		} catch (error) {
			this._themeError = error;
			this.setAttribute('data-multi-switch-state', 'error');
			documents.get(this.ownerDocument)?.delete(this);
			this._themeReport(error, 'configuration');
		}
	}

	_themeRead() {
		if (this.storage === 'none') return null;
		try {
			const value = this.ownerDocument.defaultView.localStorage.getItem(
				this.storageKey,
			);
			if (value !== null) {
				if (this._themeSupports(value)) return value;
				this._themeReport(
					new RangeError(`Unsupported saved theme: ${value}`),
					'storage',
				);
			}
		} catch (error) {
			this._themeReport(error, 'storage');
		}
		if (this.cookie !== null) {
			try {
				const value = this._themeReadCookie();
				this._themeCookieSnapshot = value;
				if (value === null || this._themeSupports(value)) return value;
				this._themeReport(
					new RangeError(`Unsupported saved theme: ${value}`),
					'storage',
				);
			} catch (error) {
				this._themeReport(error, 'storage');
			}
		}
		return null;
	}

	_themeReadCookie() {
		if (this.ownerDocument.defaultView.navigator.cookieEnabled === false)
			throw new DOMException(
				'Cookie storage is disabled.',
				'SecurityError',
			);
		const prefix = `${this.cookie}=`;
		const cookie = this.ownerDocument.cookie
			.split(';')
			.map((part) => part.trim())
			.find((part) => part.startsWith(prefix));
		return cookie === undefined
			? null
			: decodeURIComponent(cookie.slice(prefix.length));
	}

	_themeCheckCookie() {
		if (
			this.storage === 'none' ||
			this.cookie === null ||
			this.state !== 'ready'
		)
			return;
		try {
			const value = this._themeReadCookie();
			if (value !== null && !this._themeSupports(value))
				throw new RangeError(`Unsupported saved theme: ${value}`);
			if (value === this._themeCookieSnapshot) return;
			this._themeCookieSnapshot = value;
			this._themeCommit(value ?? 'system', 'storage', true);
		} catch (error) {
			this._themeReport(error, 'storage');
		}
	}

	_themeCommit(value, source, persist) {
		if (!this._themeSupports(value)) {
			this._themeReport(
				new RangeError(`Unsupported theme: ${value}`),
				'configuration',
			);
			return;
		}
		if (
			this.ownerDocument.documentElement.getAttribute('data-theme') !==
			value
		)
			this.ownerDocument.documentElement.setAttribute(
				'data-theme',
				value,
			);
		this._themeUpdate(value, source);
		// A listener may have applied a newer preference synchronously.
		if (
			this.ownerDocument.documentElement.getAttribute('data-theme') !==
			value
		)
			return;
		if (persist && this.storage !== 'none') {
			try {
				this.ownerDocument.defaultView.localStorage.setItem(
					this.storageKey,
					value,
				);
			} catch (error) {
				this._themeReport(error, 'storage');
			}
		}
		if (
			this.ownerDocument.documentElement.getAttribute('data-theme') !==
			value
		)
			return;
		if (
			(persist || source === 'storage') &&
			this.storage !== 'none' &&
			this.cookie !== null
		) {
			try {
				const secure =
					this.ownerDocument.location.protocol === 'https:'
						? '; Secure'
						: '';
				this.ownerDocument.cookie = `${this.cookie}=${encodeURIComponent(value)}; Path=/; Max-Age=${this.cookieMaxAge}; SameSite=Lax${secure}`;
				if (this._themeReadCookie() !== value)
					throw new DOMException(
						'The theme cookie could not be saved.',
						'SecurityError',
					);
				this._themeCookieSnapshot = value;
			} catch (error) {
				this._themeReport(error, 'storage');
			}
		}
		for (const peer of documents.get(this.ownerDocument) ?? []) {
			if (
				this.ownerDocument.documentElement.getAttribute(
					'data-theme',
				) !== value
			)
				break;
			if (peer !== this) peer._themeUpdate(value, 'sync');
		}
	}

	_themeUpdate(value, source) {
		if (
			this._themePendingValue !== undefined &&
			!this._themePersistPendingValue
		)
			this._themePendingValue = value;
		const previousValue = this._themeSelection;
		const previousResolvedTheme = this._themeResolved;
		const resolvedTheme =
			value === 'system'
				? this._themeMedia.matches
					? 'dark'
					: 'light'
				: value;
		const supported = this._themeSupports(value);
		super.value = supported ? value : null;
		this._themeSelection = value;
		this._themeResolved = resolvedTheme;
		if (!supported)
			this._themeReport(
				new RangeError(
					`This control does not offer the page theme: ${value}`,
				),
				'synchronization',
			);
		if (
			value !== previousValue ||
			resolvedTheme !== previousResolvedTheme
		) {
			this.dispatchEvent(
				new CustomEvent('theme-switcher:change', {
					bubbles: true,
					detail: {
						value,
						previousValue,
						resolvedTheme,
						previousResolvedTheme,
						source,
					},
				}),
			);
		}
	}

	_themeReport(error, phase) {
		console.error('[theme-switcher]', phase, error);
		this.dispatchEvent(
			new CustomEvent('theme-switcher:error', {
				bubbles: true,
				detail: { error, phase },
			}),
		);
	}
}
