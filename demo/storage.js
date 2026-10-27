Object.defineProperty(window, 'localStorage', {
	configurable: true,
	get() {
		throw new DOMException(
			'Storage intentionally blocked for this demo.',
			'SecurityError',
		);
	},
});
document.addEventListener('theme-switcher:error', ({ detail }) => {
	document.querySelector('output').textContent =
		`${detail.phase}: ${detail.error.message}`;
});
await import('../define.js');
