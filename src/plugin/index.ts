import * as fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import type { Plugin, UserConfig } from "vite";
import * as vlq from "vlq";
import analyze, { DEFAULT_LIMIT } from "../core/index.js";
import { FG_BLUE_33, FG_RED_197, RESET, measure } from "../core/lib.js";
import type { BundleContent, BundleMetadata } from "../core/types.js";

export interface Limit {
  /**
   * Filename or picomatch glob
   * @example "**\/*.js"
   */
  name: string;
  /**
   * Size limit
   * @example "150 kB"
   */
  limit: string | number;
  /**
   * Report sizes in "uncompressed", "gzip", or "brotli"
   * @default "uncompressed"
   */
  mode?: "uncompressed" | "gzip" | "brotli";
}

export interface Options {
  /**
   * Array of limit matches. Accepts globs via picomatch.
   * The first match will apply, so the order of the array matters.
   * @default [{ name: '**\/*', limit: '150 kB' }]
   */
  limits?: Limit[];
  /**
   * Allow `vite build` to succeed even if bundlesize check fails
   * @default false
   */
  allowFail?: boolean;
  /**
   * Stat report verbosity. "summary" shows only failed stats; "all" shows everything.
   * @default "summary"
   */
  stats?: "summary" | "all";
  /**
   * Name of size report
   * @default "bundlemeta.json"
   */
  outputFile?: string;
}

export interface ResolvedConfig {
  outputFile: URL;
  limits: Limit[];
  allowFail: NonNullable<Options["allowFail"]>;
  stats: NonNullable<Options["stats"]>;
}

export default function vitePluginBundlesize(options?: Options): Plugin {
  let config: UserConfig;

  // validate
  if (Array.isArray(options?.limits)) {
    for (let i = 0; i < options.limits.length; i++) {
      if (
        !options.limits[i].name ||
        typeof options.limits[i].name !== "string"
      ) {
        console.error(
          `${FG_RED_197}✘ vite-plugin-bundlesize: limit ${i} missing required "name" property. ${RESET}`,
        );
        process.exit(1);
      }
      if (
        typeof options.limits[i].limit !== "number" &&
        typeof options.limits[i].limit !== "string"
      ) {
        console.error(
          `${FG_RED_197}✘ vite-plugin-bundlesize: limit ${i} missing required "limit" property. ${RESET}`,
        );
        process.exit(1);
      }
    }
  }

  const resolvedOptions: ResolvedConfig = {
    outputFile: new URL(
      options?.outputFile || "./bundlemeta.json",
      `file://${process.cwd()}/`,
    ),
    limits: options?.limits || [{ name: "*.js", limit: DEFAULT_LIMIT }],
    allowFail: options?.allowFail ?? false,
    stats: options?.stats ?? "summary",
  };

  const { version } = JSON.parse(
    fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  );

  const bundlemeta: BundleMetadata = { chunks: {} };
  return {
    // expose resolved config for `npx bundlesize`
    // biome-ignore lint/suspicious/noExplicitAny: this is just for setup
    ...({ _internalConfig: resolvedOptions } as any),
    name: "vite-plugin-bundlesize",
    apply: "build", // only run on build
    config(cfg) {
      config = cfg;
      if (!config.build?.sourcemap) {
        console.error(`
${FG_RED_197}✘ vite-plugin-bundlesize: needs "build.sourcemap" enabled.${RESET}
  See ${FG_BLUE_33}https://vitejs.dev/config/build-options.html#build-sourcemap${RESET}`);
        process.exit(1);
      }
    },
    generateBundle(_, bundle) {
      for (const [chunkID, chunk] of Object.entries(bundle)) {
        if (chunk.type !== "chunk" || !chunk.isEntry) {
          continue;
        }
        if (!chunk.map) {
          console.error(`
${FG_RED_197}✘ vite-plugin-bundlesize: needs "build.sourcemap" enabled.${RESET}
  See ${FG_BLUE_33}https://vitejs.dev/config/build-options.html#build-sourcemap${RESET}`);
          process.exit(1);
        }
        const codeLines = chunk.code.split("\n");
        const contents: Record<string, BundleContent> = {};
        const mapLines = chunk.map.mappings.split(";");
        const fields: number[] = [0, 0, 0, 0, 0];
        for (let l = 0; l < mapLines.length; l++) {
          if (!mapLines[l]) {
            continue;
          }
          fields[0] = 0; // reset column every line
          const cols = mapLines[l].split(",");
          for (let c = 0; c < cols.length; c++) {
            if (!cols[c]) {
              continue;
            }
            // get current values from modifying previous values, per the spec
            const nextFields = vlq.decode(cols[c]);
            for (let i = 0; i < nextFields.length; i++) {
              if (typeof nextFields[i] === "number") {
                fields[i] += nextFields[i];
              }
            }
            const [col, filePathI] = fields;
            const filePath: string = chunk.map.sources[filePathI];
            if (!(filePath in contents)) {
              contents[filePath] = { filePath, size: 0 };
            }
            // size
            const [nextCol] = cols[c + 1]
              ? vlq.decode(cols[c + 1])
              : [undefined];
            const fieldCode = codeLines[l].substring(
              col,
              nextCol ? col + nextCol : undefined,
            );
            const fieldSize = measure(fieldCode);
            contents[filePath].size += fieldSize;
            // mark packageName
            const parts = filePath.split(path.sep);
            if (parts.indexOf("node_modules") !== -1) {
              let packageNameI = parts.indexOf("node_modules") + 1;
              if (parts[packageNameI] === ".pnpm") {
                packageNameI++;
              }
              let packageName = parts[packageNameI];
              if (packageName[0] === "@") {
                packageName = `${packageName}/${parts[packageNameI + 2]}`;
              }
              contents[filePath].packageName = packageName;
            }
          }
        }
        bundlemeta.chunks[chunkID] = {
          id: chunkID,
          isEntry: true,
          size: measure(chunk.code),
          sizeGzip: measure(chunk.code, "gzip"),
          sizeBrotli: measure(chunk.code, "brotli"),
          contents,
        };
      }
      fs.writeFileSync(resolvedOptions.outputFile, JSON.stringify(bundlemeta));
    },
    closeBundle() {
      analyze({ bundlemeta, config: resolvedOptions, version });
    },
  } as Plugin;
}
