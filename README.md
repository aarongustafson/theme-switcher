# `<theme-switcher>`

A three-choice theme picker: System, Light, and Dark. The component generates
native radios in the light DOM, sets `data-theme` on `<html>`, and remembers the
choice in localStorage. You supply the page’s colors.

It extends
[`<form-multi-switch>`](https://github.com/aarongustafson/form-multi-switch),
with the same styling hooks and native keyboard behavior. You can also
[supply your own radios](#authored-radios-and-forms) for a form that works before
JavaScript loads.

[Project site](https://aarongustafson.github.io/theme-switcher/) ·
[Live demos](https://aarongustafson.github.io/theme-switcher/demo/)

## Installation

This is a draft; the npm package hasn’t been published yet. Once it is:

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

## Use the generated control

Set a group label; the component supplies the three choices:

```html
<theme-switcher label="Color theme"></theme-switcher>
```

The component creates a fieldset, legend, and System, Light, and Dark radios,
adds the default segmented-control styles, and gives the group a unique name.
Before the element upgrades—or if JavaScript fails—this version has no controls.
The page can still use your default CSS or a server-rendered `data-theme`.

Selecting Light or Dark sets an explicit preference. Selecting System keeps
`data-theme="system"` while `resolvedTheme` follows the device’s current light
or dark preference. All connected switchers on a page share that page’s theme.

## Give the page its colors

The component writes the selected value literally:

```html
<html data-theme="system"></html>
```

It doesn’t add a class, set inline colors, or choose a palette for you. Here’s
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

For your own palette, use `[data-theme='light']`, `[data-theme='dark']`, and a
`prefers-color-scheme` query for `[data-theme='system']` (and pages without an
explicit preference). Don’t let the media query override an explicit choice.

### Choosing the initial preference

On the first control’s initialization, the component uses:

1. A `.value` assigned before initialization, if you supplied one.
2. A valid localStorage preference, unless `storage="none"` is set.
3. A valid cookie preference, if `cookie` is enabled and localStorage has no valid value.
4. A valid existing `<html data-theme>` value.
5. The checked authored radio or generated `value` attribute.
6. `system`.

A value is valid if the control offers it. Each control must include `system`,
`light`, and `dark`. Additional controls join the page’s current preference
rather than loading an older saved choice over it.

Selecting `system` saves the literal string `system`, not the device’s current
light or dark preference.

## Configuration

| Attribute        | Property       | Default                         | What it does                                                                                                     |
| ---------------- | -------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `label`          | `label`        | `Theme`                         | Names a generated group. Use the legend with authored markup.                                                    |
| `system-label`   | `systemLabel`  | `System`                        | Labels the default System choice.                                                                                |
| `light-label`    | `lightLabel`   | `Light`                         | Labels the default Light choice.                                                                                 |
| `dark-label`     | `darkLabel`    | `Dark`                          | Labels the default Dark choice.                                                                                  |
| `storage-key`    | `storageKey`   | `theme-switcher`                | Names the localStorage entry and, with a bare `cookie` attribute, the cookie too.                                |
| `storage`        | `storage`      | `local`                         | Set `none` to skip both localStorage and cookie reads, writes, and storage events.                               |
| `cookie`         | `cookie`       | None                            | Adds a cookie mirror and fallback. A bare attribute uses `storage-key`; a value supplies a separate cookie name. |
| `cookie-max-age` | `cookieMaxAge` | `31536000`                      | Sets the cookie’s lifetime in seconds (one year by default).                                                     |
| `name`           | `name`         | Unique generated name           | Names generated radios for form submission.                                                                      |
| `value`          | `value`        | `system` for generated controls | Attribute sets the generated initial/reset default; property changes the current preference.                     |
| `choices`        | —              | System, Light, Dark             | JSON choices using the base component’s format.                                                                  |
| `disabled`       | `disabled`     | `false`                         | Disables the control.                                                                                            |
| `required`       | `required`     | `false`                         | Makes the native radio selection required.                                                                       |
| `icon-only`      | `iconOnly`     | `false`                         | Visually hides label text; you supply the icons.                                                                 |
| `script`         | `script`       | None                            | Loads an optional behavior module before enhancement completes.                                                  |

See the
[`<form-multi-switch>` API](https://github.com/aarongustafson/form-multi-switch#attributes-and-properties)
for inherited configuration, choice formats, methods, and behavior modules.

### Translate the labels

The three choice-label attributes apply only to the default generated choices.
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

Language and direction inherit from surrounding markup. With
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

Setting `lang` identifies the language; it doesn’t translate the labels or set
the text direction for you. Supply the translated labels and use `dir` where
needed. The [live demos](https://aarongustafson.github.io/theme-switcher/demo/)
include Arabic labels with decorative CSS icons.

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

You can use authored radios or inherited `configure()` instead. Choice labels
are text, not HTML. Set `color-scheme` and the palette for custom themes in your
CSS; `resolvedTheme` returns the custom value without guessing whether it’s light
or dark.

Give controls on the same page the same available themes. A control that doesn’t
offer the current page theme has no radio selected, keeps that theme in
`resolvedTheme`, and reports a nonfatal `synchronization` error. Connecting or
relabeling that control doesn’t replace the page’s preference.

### Changing the preference from JavaScript

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

Before setup finishes, assignments are queued rather than applied to the old
radios. This lets you call `configure()` and then set `.value` to a newly added
theme. Await `ready` to confirm it was applied: unsupported queued values reject
that promise. Once ready, an unsupported value throws from the setter.

`ready` resolves after enhancement and theme setup. Read it again after
reconfiguration. Ordinary markup changes are observed automatically; inherited
`refresh()` is available when you need to force reinitialization. Directly
setting a radio’s `.checked` property doesn’t fire a browser event; use
`switcher.value` to change the page preference from code.

An optional `script` uses the
[base component’s module contract](https://github.com/aarongustafson/form-multi-switch#behavior-modules):
`initialize(element, { signal })`, optionally returning a synchronous cleanup
function. That initializer runs before theme setup; await `ready` outside the
initializer if you need the applied preference. Don’t await `ready` inside it.

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

In JavaScript, set `.cookie = true` to use `storageKey`, a string to choose a
cookie name, or `false`/`null` to turn cookie backing off. Reading `.cookie`
returns the effective name, or `null` when it isn’t configured.

On startup, a valid localStorage value wins over the cookie. A valid cookie is
the fallback when localStorage is missing, contains an unsupported theme, or
isn’t available. When a saved preference is restored with cookie backing
enabled, both stores are brought into agreement. Subsequent selections update
both independently: if either fails, the other can still save the preference.
Failures emit a storage diagnostic.

Cookies use `Path=/`, `SameSite=Lax`, and `Secure` on HTTPS, with no `Domain`.
Cookie names must be valid cookie-name tokens, and `cookie-max-age` must be a
positive integer. The cookie is readable by JavaScript, so it can’t be
`HttpOnly`. Don’t store anything sensitive in it. Your server can validate its
value against your themes and render the initial `<html data-theme>` before any
JavaScript runs. The early script above can still apply a newer local preference.

Controls on the same document synchronize without writing each other’s storage.
Use consistent storage keys, cookie settings, and available themes across them.
`storage="none"` doesn’t isolate a control from the page’s theme or erase an
existing saved preference.

Other tabs update through the browser’s `storage` event. Removing the saved
preference, or clearing storage, selects System. Unrelated keys and sessionStorage
events are ignored. Cookie changes are checked through Cookie Store events
where supported, and when the page regains focus or becomes visible. External
cookie changes also update localStorage; deleting the cookie selects and saves
System. Unsupported saved values and blocked storage produce
diagnostics; blocked storage doesn’t prevent theme changes.

Changing `storage-key` or `cookie` on an initialized control, or turning
persistence back on, reads the saved preference for that key. Without a saved
value, the current selection is retained. Newly connected controls join the
current page preference instead of restoring an older saved value over it.

Disconnecting a control removes its media-query, storage, reset, and synchronization
listeners. It doesn’t revert the page or delete the saved preference. Reconnecting
sets the control up again.

## Restore a saved choice before first paint

The component can’t apply a saved preference before its module loads. If that
would cause a flash on your site, put a small script before your stylesheets:

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

If you’ve enabled cookie backing, read that cookie when localStorage doesn’t
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

Use your cookie’s name for `prefix` if it differs from the localStorage key.
Both snippets leave any server-rendered `data-theme` alone when no valid saved
value is available. For `storage="none"`, omit the restoration script too.

Keep the storage key and allowed themes aligned with your control. With a
Content Security Policy, authorize this script with your usual nonce or hash.

## Authored radios and forms

Supply a fieldset when you need controls that work before JavaScript loads.
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

Without JavaScript, these radios don’t change the page’s theme. Put them in a
form with server-side handling if you need to apply a submitted choice without
the component. Use a different radio `name` for each group in the same form.

An authored fieldset takes precedence over `choices`, `name`, `label`, and
`value` attributes on the component. Those attributes are ignored, even if
they’re invalid. Authored labels also take precedence over `system-label`,
`light-label`, and `dark-label`. Include `system`, `light`, and `dark` values.

Both authored and generated radios participate in native forms. Submission
includes the selected radio’s name/value; set `name` on a generated control
when you need a predictable field name. Reset restores the authored checked
default (or generated `value` default), then applies and saves that preference.
If no radio is checked after reset, the component selects System. A canceled
reset leaves the theme alone.

Reset also works when the form and controls share a shadow tree, including radios
associated with a form through their `form` attribute.

The [form demo](https://aarongustafson.github.io/theme-switcher/demo/) shows
submission and reset alongside a no-module fallback.

## Events

All component events bubble. Listen for `theme-switcher:change` when you need
theme behavior rather than just a radio interaction:

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

Change sources are `initial`, `user`, `api`, `attribute`, `configuration`, `reset`,
`storage`, `sync`, and `system`. Initialization emits a change. Repeatedly applying
the same preference and resolved theme doesn’t. Each synchronized control emits
its own event, so use a listener on one control if you only need one notification.

Error phases are `configuration`, `storage`, and `synchronization`. Diagnostics
also go to `console.error`. Theme configuration failures reject `ready` and set
`state` to `error`; storage and synchronization errors are nonfatal. Inherited
enhancement/module failures use `form-multi-switch:error`.

While configuration is invalid, the native radios remain usable for forms, but
they don’t change the page theme or storage. API value assignments throw the
configuration error until you correct it.

The inherited `form-multi-switch:activate`, `:change`, `:ready`, and `:error`
events retain their
[base meanings](https://github.com/aarongustafson/form-multi-switch#events).
In particular, the base change event reports
user interaction, not API, storage, or system updates.

## Make it look like your site

Default control styles load automatically in the `form-multi-switch` cascade
layer. Your unlayered CSS can override them:

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

Use `[data-multi-switch-choice]` for segments, `[data-value='dark']` for a
particular theme, and `[data-selected]`, `[data-disabled]`, `[data-first]`, and
`[data-last]` for state and endpoints. The [demos](demo/index.html) show text,
CSS icons, icon-only controls, and a pill treatment. See the
[base component’s styling reference](https://github.com/aarongustafson/form-multi-switch#styling)
for shared defaults and hooks.

### Load styles under a Content Security Policy

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

Keep text labels even when you hide them visually with `icon-only`. Decorative
SVGs should have `aria-hidden="true"`; CSS masks don’t need extra markup. Supply
icons that remain distinguishable in forced-colors mode. Don’t hide the entire
label or remove its accessible text.

Native radios provide Tab, arrow-key, and Space interaction, checked state, and
form behavior. The default focus outline uses `:focus-visible`. Preserve clear
visual context, sufficient contrast, and a clear selected state when you restyle it.

### Hide the legend visually

If the surrounding content already makes the control’s purpose clear, you can
hide the legend visually while keeping its text as the radio group’s accessible
name. `hide-legend` is an author-defined class, not a built-in component option.
It only has an effect when you supply the CSS below:

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
meaningful `label` for generated markup, or text in your authored legend. Don’t
remove the legend or use `hidden`, `aria-hidden="true"`, `display: none`, or
`visibility: hidden` to hide it from assistive technology.

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

## License

MIT. See [LICENSE](LICENSE).
