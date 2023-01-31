import type {BundleChunk, BundleMetadata} from './types.js';
import picomatch from 'picomatch';
import {DIM, FG_GREEN_79, FG_MAGENTA_200, FG_RED_197, padLeft, padRight, parseSize, RESET} from './lib.js';
import {type ResolvedConfig} from '../plugin/index.js';

export const DEFAULT_LIMIT = 150000; // 150 kB

const COLS = Math.min(process.stdout.columns || 80, 120);
const nf = new Intl.NumberFormat('en-us', {maximumFractionDigits: 1});

export default function analyze({bundlemeta, config, version}: {bundlemeta: BundleMetadata; config: ResolvedConfig; version: string}) {
	// 1. print header
	console.log(`${FG_MAGENTA_200}⚡ vite-plugin-bundlesize${RESET}
   ${DIM}v${version}${RESET}`);
	console.log(''); // newline
	const passed: boolean[] = [];
	const chunks: BundleChunk[] = [];
	const sizes: string[] = [];
	const limits: string[] = [];
	for (const entry of Object.values(bundlemeta.chunks)) {
		if (!entry.isEntry) continue;
		const limit = config.limits.find((l) => picomatch(l.name)(entry.id)) || {name: '**/*', limit: DEFAULT_LIMIT};
		const maxSize = typeof limit.limit === 'string' ? parseSize(limit.limit) : limit.limit;
		passed.push(maxSize === Infinity || limit.limit <= 0 || entry.size <= maxSize);
		chunks.push(entry);
		sizes.push(nf.format(entry.size / 1000));
		limits.push(`${nf.format((typeof limit.limit === 'string' ? parseSize(limit.limit) : limit.limit) / 1000)} kB`);
	}
	if (passed.every((status) => status === true)) {
		console.log(`${FG_GREEN_79}All chunks within size limit!${RESET}`);
	} else {
		console.log(`${FG_RED_197}The following chunks exceeded the size limit:${RESET}`);
	}
	for (let i = 0; i < chunks.length; i++) {
		console.log(
			`${passed[i] ? `${FG_GREEN_79}✔${RESET}` : `${FG_RED_197}✘${RESET}`}  ${padRight(chunks[i].id, Math.max(...chunks.map((c) => c.id.length)))}  ${passed[i] ? FG_GREEN_79 : FG_RED_197}${padLeft(
				sizes[i],
				Math.max(...sizes.map((s) => s.length))
			)} / ${padLeft(limits[i], Math.max(...limits.map((l) => l.length)))}${RESET}`
		);
	}

	// 2. print details
	console.log(''); // newline
	for (let i = 0; i < chunks.length; i++) {
		const nodeModulesTotal = Object.values(chunks[i].contents).reduce((size, c) => size + (c.packageName ? c.size : 0), 0);

		let ls = passed[i] ? `${FG_GREEN_79}│  ${RESET}` : `${FG_RED_197}│  ${RESET}`;
		console.log(`${passed[i] ? `${FG_GREEN_79}✔${RESET}` : `${FG_RED_197}✘${RESET}`}  ${chunks[i].id}`);
		console.log(`${ls}${passed[i] ? FG_GREEN_79 : FG_RED_197}${sizes[i]} / ${limits[i]}${RESET}`);
		const a = nf.format(nodeModulesTotal / 1000);
		const b = nf.format((chunks[i].size - nodeModulesTotal) / 1000);
		console.log(`${ls}${DIM}- node_modules  ${padLeft(a, Math.max(a.length, b.length))}${RESET}`);
		console.log(`${ls}${DIM}- local         ${padLeft(b, Math.max(a.length, b.length))}${RESET}`);
		console.log(ls); // newline

		// biggest modules (show only if check failed)
		if (!passed[i] || config.stats === 'all') {
			const nodeModulesSizes: Record<string, number> = {};
			for (const c of Object.values(chunks[i].contents)) {
				if (c.packageName) {
					if (!(c.packageName in nodeModulesSizes)) nodeModulesSizes[c.packageName] = 0;
					nodeModulesSizes[c.packageName] += c.size;
				}
			}
			const sortedNodeModules = Object.entries(nodeModulesSizes);
			sortedNodeModules.sort((a, b) => b[1] - a[1]);

			console.log(`${passed[i] ? FG_GREEN_79 : FG_RED_197}├─${RESET} Biggest modules`);
			console.log(ls); // newline
			let remainingModuleSize = nodeModulesTotal;
			for (const [packageName, size] of config.stats === 'all' ? sortedNodeModules : sortedNodeModules.slice(0, 25)) {
				const maxLength = COLS - 3; // 3 characters = prefix
				const displaySize = `${nf.format(size / 1000)} kB`;
				const perc = size / chunks[i].size;
				const displayPerc = `(${nf.format(100 * perc)}%)`;
				console.log(`${ls}${packageName}${padLeft(`${displaySize} ${DIM}${displayPerc}${RESET}`, maxLength - packageName.length)}${RESET}`);
				const bar = Math.round(maxLength * perc);
				console.log(`${ls}${FG_RED_197}${'='.repeat(bar)}${RESET}${'-'.repeat(maxLength - bar)}${RESET}`);
				remainingModuleSize -= size;
			}
			if (config.stats === 'summary' && sortedNodeModules.length > 25) {
				const remaining = sortedNodeModules.length - 25;
				console.log(`${ls}${DIM}… and ${remaining} other${remaining !== 1 ? 's' : ''} (${nf.format(remainingModuleSize / 1000)} kB)${RESET}`);
			}
		}

		// connecting line to next chunk
		if (i < chunks.length - 1) {
			console.log(ls); // newline
			console.log(ls); // newline
		}
	}

	// 3. exit process with error code if some failed (if enabled)
	if (!config.allowFail && passed.some((status) => status === false)) {
		process.exit(1);
	}
}
