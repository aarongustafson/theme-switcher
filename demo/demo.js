import '../define.js';

const first = document.querySelector('#default');
const temporary = document.querySelector('#temporary');
const button = document.querySelector('#use-system');
const form = document.querySelector('#appearance-form');

first.addEventListener('theme-switcher:change', ({ detail }) => {
	document.querySelector('#theme-status').textContent =
		`Preference: ${detail.value}. Resolved theme: ${detail.resolvedTheme}. Source: ${detail.source}.`;
});
temporary.addEventListener('theme-switcher:change', ({ detail }) => {
	document.querySelector('#api-status').textContent =
		`${detail.value} → ${detail.resolvedTheme} (${detail.source})`;
});
document.addEventListener('theme-switcher:error', ({ detail }) => {
	document.querySelector('#demo-errors').textContent =
		`Theme diagnostic (${detail.phase}): ${detail.error.message}`;
});
document.addEventListener('form-multi-switch:error', ({ detail }) => {
	document.querySelector('#demo-errors').textContent =
		`Enhancement failed (${detail.phase}): ${detail.error.message}`;
});
button.addEventListener('click', () => {
	temporary.value = 'system';
});
form.addEventListener('submit', (event) => {
	event.preventDefault();
	form.querySelector('output').textContent = JSON.stringify(
		Object.fromEntries(new FormData(form)),
	);
});
try {
	await temporary.ready;
	button.disabled = false;
} catch (error) {
	document.querySelector('#api-status').textContent =
		`Could not initialize: ${error.message}`;
	console.error(error);
}
