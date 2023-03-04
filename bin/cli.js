#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {URL} from 'node:url';
import {resolveConfig} from 'vite';
import analyze from '../dist/core/index.js';
import {DIM, FG_GREEN_79, FG_RED_197, RESET} from '../dist/core/lib.js';

const [, , ...args] = process.argv;

const {version} = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

if (args.includes('--help')) {
	printHelp();
	process.exit(0);
}

if (args.includes('--version')) {
	console.log(`v${version}`);
	process.exit(0);
}

function printHelp() {
	console.log(`bundlesize [options]
    --help       Display this message
    --version    Display the version
    --stats      Specify --stats=all to show all sizes
`);
}

async function main() {
	// 1. load config & verify
	const viteConfig = await resolveConfig({}, 'build');
	const plugin = viteConfig.plugins.find(({name}) => name === 'vite-plugin-bundlesize');
	if (!plugin) {
		const configFile = viteConfig.configFile ? path.relative(process.cwd(), viteConfig.configFile) : 'vite.config.ts';
		console.error(`${FG_RED_197}✘ vite-plugin-bundlesize not found in ${configFile}${RESET}

Add the following to ${configFile}:

${DIM}  import { defineConfig } from 'vite';${RESET}
${FG_GREEN_79}+ import bundlesize from 'vite-plugin-bundlesize';${RESET}

${DIM}  export default defineConfig({\n    plugins: [${RESET}
${FG_GREEN_79}+     bundlesize()${RESET}`);
		process.exit(1);
	}
	const config = plugin._internalConfig;

	// flag overrides
	config.allowFail = false; // since this is run manually, override config

	// --stats
	if (args.includes('--stats=all')) config.stats = 'all';
	else if (args.includes('--stats=summary')) config.stats = 'summary';

	if (!fs.existsSync(config.outputFile)) {
		const outputFile = config.outputFile.href.replace(new URL(`file://${process.cwd()}/`).href, '');
		console.error(`${FG_RED_197}✘ vite-plugin-bundlesize: ${outputFile} not found. Run \`vite build\` to create it.${RESET}`);
		process.exit(1);
	}

	// 2. check bundlesize & print stats
	analyze({
		bundlemeta: JSON.parse(fs.readFileSync(config.outputFile, 'utf8')),
		config,
		version,
	});
}
main();
