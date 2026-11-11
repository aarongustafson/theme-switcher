#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Read the current version from package.json
const packageJson = JSON.parse(
	readFileSync(join(rootDir, 'package.json'), 'utf-8'),
);
const version = packageJson.version;
const packageName = packageJson.name;

for (const file of ['esm.html', 'unpkg.html']) {
	const path = join(rootDir, 'demo', file);
	const content = readFileSync(path, 'utf-8').replace(
		new RegExp(`${packageName}@[\\d.]+\\/`, 'g'),
		`${packageName}@${version}/`,
	);
	writeFileSync(path, content, 'utf-8');
	console.log(`✓ Updated demo/${file} to version ${version}`);
}
