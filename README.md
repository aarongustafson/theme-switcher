# `<theme-switcher>`

A three-choice (or more) theme picker. The component sets `data-theme` on
`<html>` and remembers the choice in `localStorage`. You supply the
themes’ colors in your CSS.

This component extends
[`<form-multi-switch>`](https://github.com/aarongustafson/form-multi-switch),
with the same styling hooks and native keyboard behavior. You can also
[supply your own radios](#progressive-enhancement) for a form that works
without JavaScript.

[Project site](https://aarongustafson.github.io/theme-switcher/) ·
[Live demos](https://aarongustafson.github.io/theme-switcher/demo/)

## Installation

Start by installing `<theme-switcher>` via npm:

```sh
npm install @aarongustafson/theme-switcher
```

Register the element:

```js
import '@aarongustafson/theme-switcher/define.js';
```

The package root exports the class without registering it. To register it yourself:

```js
import { ThemeSwitcherElement } from '@aarongustafson/theme-switcher';

customElements.define('theme-switcher', ThemeSwitcherElement);
```

Use a bundler or an import map to resolve the `@aarongustafson/form-multi-switch`
dependency in a browser. The [local demo](demo/index.html) includes an import map;
run `npm install` before serving the repository.

## Basic usage

The most basic setup is to just use the component as-is:

```html
<theme-switcher></theme-switcher>
```

The component creates a `<fieldset>`, `<legend>`, and System, Light, and Dark
radios, then enhances them using `<form-multi-switch>`.

Note: Before booting—or if JavaScript fails—this version has no usable controls.
You can [provide a markup-driven fallback](#progressive-enhancement) and
enhance it with this component.

## Give the page its colors

The component writes the selected value to the `<html>` element as `data-theme`:

```html
<html data-theme="system"></html>
```

It doesn’t add a `class`, set inline colors, or choose a palette for you. Here’s
a small starting point using the browser’s system colors:

```css
:root {
  color-scheme: light dark;
}

:root[data-theme='light'] {
  color-scheme: light;
}

:root[data-theme='dark'] {
  color-scheme: dark;
}

body {
  background: Canvas;
  color: CanvasText;
}
```

When authoring your themes, use `[data-theme='light']` and `[data-theme='dark']`
as your signals, then use a `prefers-color-scheme` query for
`[data-theme='system']` for the "no explicit preference" behavior. But don’t let
the media query override an explicit user choice.

### How preferences are loaded

When booted, the first instance of this component restores the user’s saved theme
preference. If there isn’t one, it uses the authored default before falling back
to their system preference. The order is:

1. A valid localStorage preference, unless `storage="none"` is set.
2. A valid cookie preference, if `cookie` is enabled and localStorage is missing,
   unreadable, or invalid.
3. The component’s `value` attribute, including one set through
   `configure({ value })` for generated controls.
4. The checked authored radio, if the component wraps a radio group.
5. `system`.

With `storage="none"`, the first control skips both stores, not the author
defaults.
A value is valid if the control offers it. Each control must include `system`,
`light`, and `dark`.

Selecting `system` saves the literal string `system`, not the device’s current
light or dark preference. A saved System choice overrides every author default.

The component doesn’t read `<html data-theme>` as a preference; it writes the
result there. Additional controls join the page’s current preference rather than
loading their own saved choice.

## Configuration

| Attribute        | Property       | Default                         | What it does                                                                                                                              |
| ---------------- | -------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `label`          | `label`        | `Theme`                         | Names a generated group. Use the legend with authored markup.                                                                             |
| `system-label`   | `systemLabel`  | `System`                        | Labels the default System choice.                                                                                                         |
| `light-label`    | `lightLabel`   | `Light`                         | Labels the default Light choice.                                                                                                          |
| `dark-label`     | `darkLabel`    | `Dark`                          | Labels the default Dark choice.                                                                                                           |
| `storage-key`    | `storageKey`   | `theme-switcher`                | Names the localStorage entry and, with a bare `cookie` attribute, the cookie too.                                                         |
| `storage`        | `storage`      | `local`                         | Persistence is enabled by default. Set to `none` to disable all storage operations.                                                       |
| `cookie`         | `cookie`       | None                            | Adds a cookie mirror and fallback. A bare attribute uses `storage-key`; a value supplies a separate cookie name.                          |
| `cookie-max-age` | `cookieMaxAge` | `31536000`                      | Sets the cookie’s lifetime in seconds (one year by default).                                                                              |
| `name`           | `name`         | Unique generated name           | Names generated radios for form submission.                                                                                               |
| `value`          | `value`        | `system` for generated controls | Attribute supplies an initial choice and, for generated radios, the reset default; property changes the current preference after `ready`. |
| `choices`        | —              | System, Light, Dark             | JSON choices using the base component’s format.                                                                                           |
| `disabled`       | `disabled`     | `false`                         | Disables the control.                                                                                                                     |
| `required`       | `required`     | `false`                         | Makes the native radio selection required.                                                                                                |
| `icon-only`      | `iconOnly`     | `false`                         | Visually hides label text; you supply the icons.                                                                                          |
| `script`         | `script`       | None                            | Loads an optional behavior module before enhancement completes.                                                                           |

See the
[`<form-multi-switch>` API](https://github.com/aarongustafson/form-multi-switch#attributes-and-properties)
for inherited configuration, choice formats, methods, and behavior modules.

### Translate the labels

The three choice `*-label` attributes apply only to the default generated choices.
Translate `label` too, or supply all your own labels:

```html
<theme-switcher
  lang="fr"
  label="Thème"
  system-label="Appareil"
  light-label="Clair"
  dark-label="Sombre"
></theme-switcher>
```

Language and direction are inherited from the surrounding markup. With
`<html lang="ar" dir="rtl">`, the component and its native controls use RTL
without their own `dir` attribute. You can also scope language and direction to
a wrapper, or set them directly on the component to override its context:

```html
<div lang="ar" dir="rtl">
  <theme-switcher
    label="مظهر الموقع"
    system-label="النظام"
    light-label="فاتح"
    dark-label="داكن"
  ></theme-switcher>
</div>
```

The [live demo](https://aarongustafson.github.io/theme-switcher/demo/)
includes an Arabic instance with decorative CSS icons.

### Extra themes

Include the three standard values and add your own:

```html
<theme-switcher
  label="Color theme"
  choices='[
		{"label":"System","value":"system"},
		{"label":"Light","value":"light"},
		{"label":"Dark","value":"dark"},
		{"label":"Sepia","value":"sepia"}
	]'
></theme-switcher>
```

You can use authored radios or manually `configure()` instead. Choice labels
are text, not HTML.

### Advanced usage

```js
const switcher = document.querySelector('theme-switcher');
await switcher.ready;

switcher.value = 'dark';
console.log(switcher.resolvedTheme); // "dark"
```

The setter accepts a nonempty offered value; `null` and empty values throw.
It applies the theme, saves it when persistence is enabled, and synchronizes
other connected controls. It doesn’t change the radio’s form-reset default or
emit the base component’s user-interaction events.

Assignments to `.value` before initial theme setup are ignored. During later
reconfiguration or behavior loading, assignments are queued until the control
is ready.

---

An optional `script` attribute piggybacks on the [base component’s module
contract](https://github.com/aarongustafson/form-multi-switch#behavior-modules):
`initialize(element, { signal })`, optionally returning a synchronous cleanup
function. That initializer runs before theme setup. Await
`ready` outside the initializer if you need the applied preference. Don’t await
`ready` inside it.

## Save and synchronize preferences

The component uses localStorage by default. Add `cookie` if your server also
needs the preference:

```html
<!-- Both stores use "theme-switcher". -->
<theme-switcher cookie></theme-switcher>

<!-- Rename both. -->
<theme-switcher storage-key="site-theme" cookie></theme-switcher>

<!-- Give the cookie its own name. -->
<theme-switcher storage-key="site-theme" cookie="server-theme"></theme-switcher>

<!-- Neither store is read or written, even with cookie present. -->
<theme-switcher storage="none" cookie></theme-switcher>
```

Cookie settings are also accessible imperatively via the element’s `cookie`
and `storageKey` properties.

On startup, a valid `localStorage` value wins over the cookie. A valid cookie is
the fallback when `localStorage` is missing, contains an unsupported theme, or
isn’t available. When a saved preference is restored with cookie backing
enabled, the component tries to align both stores. User changes update both
independently: if either fails, the other can still save the preference.
Failures emit diagnostic errors.

Cookies use `Path=/`, `SameSite=Lax`, and `Secure` on HTTPS, with no `Domain`.
Cookie names must be valid cookie-name tokens, and `cookie-max-age` must be a
positive integer. The cookie is readable by JavaScript, so it can’t be
`HttpOnly`. Your server can validate its value against your themes and render
the initial `<html data-theme>` before any JavaScript runs.

With localStorage enabled, other tabs using the same key update through the
browser’s `storage` event. Storage events received while a control is
regenerating or booting are applied when the component is ready.

## Restore a saved choice before first paint

The component can’t apply a saved preference before its module loads. That could
cause a disruptive flash when loading. To avoid that, place a small inline
`<script>` before you load stylesheets in the `<head>`:

```html
<script>
  try {
    const theme = localStorage.getItem('theme-switcher');
    if (['system', 'light', 'dark'].includes(theme)) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (error) {
    console.warn('Could not restore the saved theme.', error);
  }
</script>
```

If you’ve enabled cookie backing, read that cookie when `localStorage` doesn’t
provide a valid choice:

```html
<script>
  const key = 'theme-switcher';
  const allowed = ['system', 'light', 'dark'];
  let theme;
  try {
    theme = localStorage.getItem(key);
  } catch (error) {
    console.warn('Could not read the saved theme.', error);
  }
  if (!allowed.includes(theme)) {
    try {
      const prefix = `${key}=`;
      const cookie = document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix));
      theme =
        cookie === undefined
          ? null
          : decodeURIComponent(cookie.slice(prefix.length));
    } catch (error) {
      console.warn('Could not read the theme cookie.', error);
    }
  }
  if (allowed.includes(theme)) {
    document.documentElement.setAttribute('data-theme', theme);
  }
</script>
```

Use your cookie’s name for `prefix` if it differs from the `localStorage` key.
Both snippets leave any server-rendered `data-theme` alone when no valid saved
value is available.

Keep the storage key and allowed themes aligned with your configuration. With a
Content Security Policy, authorize this script with a nonce or hash.

## Progressive enhancement

Supply a `<fieldset>` when you need controls that work with or without JavaScript.
The browser provides radio selection and form submission; the component adds
theme changes, persistence, synchronization, and segmented-control styles.

```html
<theme-switcher>
  <fieldset>
    <legend>Color theme</legend>
    <label
      ><input type="radio" name="theme" value="system" checked />System</label
    >
    <label><input type="radio" name="theme" value="light" />Light</label>
    <label><input type="radio" name="theme" value="dark" />Dark</label>
  </fieldset>
</theme-switcher>
```

Without JavaScript, these radios still support selection and form submission,
but they don’t change the page’s theme. A server can apply the submitted
preference on the next page load.

Your radios define the choices, group name, and legend. The component’s initial
`value` attribute can select an existing radio without changing its reset default.
Unsupported values report a configuration error. Later `value` attribute changes
are ignored; use `.value` after `ready` to change the selection.

Other behavior and persistence attributes still apply. `configure()` is only
for generated groups.

The [fallback demo](demo/fallback.html) shows native form submission without
loading the component module.

## Events

All component events bubble. Listen for `theme-switcher:change` when you need
access to theme switching behavior rather than radio control interaction:

```js
document.addEventListener('theme-switcher:change', ({ detail }) => {
  console.log(detail.value, detail.resolvedTheme, detail.source);
});
```

| Event                   | `detail`                                                                     |
| ----------------------- | ---------------------------------------------------------------------------- |
| `theme-switcher:change` | `value`, `previousValue`, `resolvedTheme`, `previousResolvedTheme`, `source` |
| `theme-switcher:ready`  | `value`, `resolvedTheme`                                                     |
| `theme-switcher:error`  | `error`, `phase`                                                             |

Change sources include `initial`, `user`, `api`, `attribute`, `configuration`,
`reset`, `storage`, `sync`, and `system`. Initialization emits a change.
Repeatedly applying the same preference and resolved theme doesn’t. Each
synchronized control emits its own event, so use a listener on one control if you
only need one notification.

Error phases include `configuration`, `storage`, and `synchronization`.
Diagnostics also go to `console.error`. Theme configuration failures reject
`ready` and set `state` to `error`; storage and synchronization errors are
nonfatal. Inherited enhancement/module failures use `form-multi-switch:error`.

## Style it to match your site

The default component styles load automatically in the `<form-multi-switch>`
cascade layer. Your unlayered CSS can override them:

```css
theme-switcher {
  --multi-switch-radius: 999px;
  --multi-switch-border: #173f63;
  --multi-switch-selected-background: #173f63;
  --multi-switch-selected-color: white;
}
```

The inherited CSS custom properties are `--multi-switch-border`, `--multi-switch-background`,
`--multi-switch-color`, `--multi-switch-selected-background`,
`--multi-switch-selected-color`, `--multi-switch-focus-color`,
`--multi-switch-radius`, and `--multi-switch-padding`.

Use

- `[data-multi-switch-choice]` to address all segments;
- `[data-value='{theme}']` for a particular theme’s segment; and
- `[data-selected]`, `[data-disabled]`, `[data-first]`, and
  `[data-last]` for state and endpoints.

The [demos](demo/index.html) show text, CSS icons, icon-only controls, and a
pill treatment. See the
[base component’s styling reference](https://github.com/aarongustafson/form-multi-switch#styling)
for shared defaults and hooks.

### Loading styles under a Content Security Policy

The base component injects a stylesheet. A strict `style-src` policy must allow
it, or you can load the base package’s external stylesheet instead. Give the
link `id="form-multi-switch-styles"` to prevent injection:

```html
<link
  id="form-multi-switch-styles"
  rel="stylesheet"
  href="/assets/form-multi-switch.css"
/>
```

Copy the base package’s `form-multi-switch.css` export to your chosen URL.

## Accessibility

Maintain text labels even when you hide them visually with `icon-only`. Decorative
SVGs should have `aria-hidden="true"`. Supply icons that remain distinguishable in
forced-colors mode. Don’t hide the entire `<label>` or remove its accessible text.

Native radios provide <kbd>Tab</kbd>, arrow-key, and <kbd>Space</kbd> interaction,
checked state, and form behavior. The default focus outline uses `:focus-visible`.
Preserve clear visual context, sufficient contrast, and a clear selected state when
you restyle it.

### Hiding the legend visually

If the surrounding content already makes the control’s purpose clear, you can
use your own CSS to hide the legend visually while keeping its text as the radio
group’s accessible name. For example:

```html
<theme-switcher class="hide-legend" label="Color theme"></theme-switcher>
```

```css
theme-switcher.hide-legend legend {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

This works with a generated legend or your own authored `<legend>`. Keep a
meaningful `label` for generated markup, or text in your authored `<legend>`.
Don’t remove the `<legend>` or use `hidden`, `aria-hidden="true"`,
`display: none`, or `visibility: hidden` to hide it from assistive technology.

## Browser support

Use a current browser with custom elements, ES modules, `:has()`, container
queries, cascade layers, and media-query change events. Review the component in
your supported browsers and assistive technologies before shipping.

## Development

```sh
npm install
npm run test:run
npm run test:types
npm run lint
npm run test:coverage
python3 -m http.server 8765
```

Open `/demo/` for examples and `/test/browser.html` for browser-only checks.
Add `?native-reset` to the browser-check URL and activate **Reset appearance**
when it appears to test a real reset-button activation.

## License

MIT. See [LICENSE](LICENSE).
