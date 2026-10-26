# theme-switcher Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/theme-switcher.svg)](https://www.npmjs.com/package/@aarongustafson/theme-switcher) [![Build Status](https://img.shields.io/github/actions/workflow/status/aarongustafson/theme-switcher/ci.yml?branch=main)](https://github.com/aarongustafson/theme-switcher/actions)

A light-DOM tri-state theme picker built on form-multi-switch.

## Demo

[Live Demo](https://aarongustafson.github.io/theme-switcher/demo/) ([Source](./demo/index.html))

Additional demos:
- [ESM CDN Demo](https://aarongustafson.github.io/theme-switcher/demo/esm.html) ([Source](./demo/esm.html))
- [Unpkg CDN Demo](https://aarongustafson.github.io/theme-switcher/demo/unpkg.html) ([Source](./demo/unpkg.html))

## Installation

```bash
npm install @aarongustafson/theme-switcher
```

## Usage

### Option 1: Auto-define the custom element (easiest)

Import the package to automatically define the `<theme-switcher>` custom element:

```javascript
import '@aarongustafson/theme-switcher';
```

Or use the define-only script in HTML:

```html
<script src="./node_modules/@aarongustafson/theme-switcher/define.js" type="module"></script>
```

### Option 2: Import the class and define manually

Import the class and define the custom element with your preferred tag name:

```javascript
import { ThemeSwitcherElement } from '@aarongustafson/theme-switcher/theme-switcher.js';

customElements.define('my-custom-name', ThemeSwitcherElement);
```

### Basic Example

```html
<theme-switcher>
  <!-- Your content here -->
</theme-switcher>
```

## Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `example-attribute` | `string` | `""` | Description of the attribute |

## Events

The component fires custom events that you can listen to:

| Event | Description | Detail |
|-------|-------------|--------|
| `theme-switcher:event` | Fired when something happens | `{ data }` |

### Example Event Handling

```javascript
const element = document.querySelector('theme-switcher');

element.addEventListener('theme-switcher:event', (event) => {
  console.log('Event fired:', event.detail);
});
```

## CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--example-color` | `#000` | Example color property |

### Example Styling

```css
theme-switcher {
  --example-color: #ff0000;
}
```

## Browser Support

This component uses modern web standards:
- Custom Elements v1
- Shadow DOM v1
- ES Modules

For older browsers, you may need polyfills.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# View demo
open demo/index.html
```

## License

MIT © [Aaron Gustafson](https://www.aaron-gustafson.com/)
