export function initialize(control, { signal }) {
	const output = control.parentElement.querySelector('output');
	control.addEventListener(
		'theme-switcher:change',
		({ detail }) => {
			output.textContent = `${detail.value} → ${detail.resolvedTheme}`;
		},
		{ signal },
	);
	return () => {
		output.textContent = 'Listener disconnected.';
	};
}
