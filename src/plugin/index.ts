import {Buffer} from 'node:buffer';
import * as fs from 'node:fs';
import path from 'node:path';
import {URL} from 'node:url';
import * as vlq from 'vlq';
import type {Plugin, UserConfig} from 'vite';
import analyze, {DEFAULT_LIMIT} from '../core/index.js';
import {FG_BLUE_33, FG_RED_197, RESET} from '../core/lib.js';
import type {BundleContent, BundleMetadata} from '../core/types.js';

export interface Limit {
	/** glob match filename (ex: `'*.js'`) */
	name: string;
	/** size limit (ex `'150 kB'`) */
	limit: string | number;
}

export interface Config {
	/** Name output file (default: 'bundlemeta.json') */
	outputFile?: string;
	/** Throw error if any entries exceed this size (default: `[{ name: '**\/*', limit: '150 kB' }]`) */
	limits?: Limit[];
	/** Allow `vite build` to succeed even if bundlesize check fails (default: `false`) */
	allowFail?: boolean;
	/** Show a `summary` of failed chunks, or `all` stats */
	stats?: 'summary' | 'all';
}

export interface ResolvedConfig {
	outputFile: URL;
	limits: Limit[];
	allowFail: boolean;
	stats: 'summary' | 'all';
}

export default function vitePluginBundlesize(options?: Config): Plugin {
	let config: UserConfig;

	const resolvedOptions: ResolvedConfig = {
		outputFile: new URL(options?.outputFile || './bundlemeta.json', `file://${process.cwd()}/`),
		limits: options?.limits || [{name: '*.js', limit: DEFAULT_LIMIT}],
		allowFail: options?.allowFail || false,
		stats: options?.stats === 'all' ? 'all' : 'summary',
	};

	const {version} = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));

	let bundlemeta: BundleMetadata = {chunks: {}};
	return {
		// expose resolved config for `npx bundlesize`
		...({_internalConfig: resolvedOptions} as any),
		name: 'vite-plugin-bundlesize',
		config(cfg) {
			config = cfg;
			if (!config.build?.sourcemap) {
				console.error(`
${FG_RED_197}✘ vite-plugin-bundlesize: needs "build.sourcemap" enabled.${RESET}
  See ${FG_BLUE_33}https://vitejs.dev/config/build-options.html#build-sourcemap${RESET}`);
				process.exit(1);
			}
		},
		generateBundle(options, bundle) {
			for (const [chunkID, chunk] of Object.entries(bundle)) {
				if (chunk.type !== 'chunk' || !chunk.isEntry) continue;
				if (!chunk.map) {
					console.error(`
${FG_RED_197}✘ vite-plugin-bundlesize: needs "build.sourcemap" enabled.${RESET}
  See ${FG_BLUE_33}https://vitejs.dev/config/build-options.html#build-sourcemap${RESET}`);
					process.exit(1);
				}
				const codeLines = chunk.code.split('\n');
				const contents: Record<string, BundleContent> = {};
				const mapLines = chunk.map.mappings.split(';');
				const fields: number[] = [0, 0, 0, 0, 0];
				const chunkSize = Buffer.byteLength(chunk.code, 'utf8');
				for (let l = 0; l < mapLines.length; l++) {
					if (!mapLines[l]) continue;
					fields[0] = 0; // reset column every line
					const cols = mapLines[l].split(',');
					for (let c = 0; c < cols.length; c++) {
						if (!cols[c]) continue;
						let lastCol = fields[0];
						let lastFilePathI = fields[1];
						// get current values from modifying previous values, per the spec
						const nextFields = vlq.decode(cols[c]);
						for (let i = 0; i < nextFields.length; i++) {
							if (typeof nextFields[i] === 'number') {
								fields[i] += nextFields[i];
							}
						}
						const [col, filePathI, srcLn, srcCol, nameI] = fields;
						const filePath: string = chunk.map.sources[filePathI];
						if (!(filePath in contents)) contents[filePath] = {filePath, size: 0};
						// size
						const [nextCol] = cols[c + 1] ? vlq.decode(cols[c + 1]) : [undefined];
						const fieldSize = Buffer.from(codeLines[l].substring(col, nextCol ? col + nextCol : undefined)).byteLength;
						contents[filePath].size += fieldSize;
						// mark packageName
						const parts = filePath.split(path.sep);
						if (parts.indexOf('node_modules') !== -1) {
							let packageName = parts[parts.indexOf('node_modules') + 1];
							if (packageName[0] === '@') packageName = `${packageName}/${parts[parts.indexOf('node_modules') + 2]}`;
							if (packageName == '--') console.log({filePath});
							contents[filePath].packageName = packageName;
						}
					}
				}
				bundlemeta.chunks[chunkID] = {
					id: chunkID,
					isEntry: true,
					size: chunkSize,
					contents,
				};
			}
			fs.writeFileSync(resolvedOptions.outputFile, JSON.stringify(bundlemeta));
		},
		closeBundle() {
			analyze({bundlemeta, config: resolvedOptions, version});
		},
	};
}
