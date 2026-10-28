import '../define.js';

const first = document.querySelector('#default');
const cookieFrame = document.querySelector('#cookie-demo');
const refreshCookie = document.querySelector('#refresh-cookie-demo');

first.addEventListener('theme-switcher:change', ({ detail }) => {
	document.querySelector('#theme-status').textContent =
		`Preference: ${detail.value}. Resolved theme: ${detail.resolvedTheme}. Source: ${detail.source}.`;
});
document.addEventListener('theme-switcher:error', ({ detail }) => {
	document.querySelector('#demo-errors').textContent =
		`Theme diagnostic (${detail.phase}): ${detail.error.message}`;
});
document.addEventListener('form-multi-switch:error', ({ detail }) => {
	document.querySelector('#demo-errors').textContent =
		`Enhancement failed (${detail.phase}): ${detail.error.message}`;
});
refreshCookie.addEventListener('click', () => {
	cookieFrame.src = cookieFrame.src;
});
refreshCookie.disabled = false;
