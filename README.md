# ⚡ vite-plugin-bundlesize

Vite plugin for inspecting bundlesizes and enforcing limits on the amount of JS shipped to the client. Works with Vite, Astro, SvelteKit, and any other Vite-based build tool.

Inspired by [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) and [Bundlephobia](https://bundlephobia.com/).

⚠️ Status: **alpha**. Sizes shown may not be accurate!

![screenshot](./docs/images/vite-plugin-bundlesize.png)

## Setup

Install from npm:

```
npm install --dev vite-plugin-bundlesize
```

And add to your [Vite config plugins](https://vitejs.dev/config/shared-options.html#plugins):

```diff
  import { defineConfig } from 'vite';
+ import bundlesize from 'vite-plugin-bundlesize';

  export default defineConfig({
    plugins: [
+     bundlesize(),
    ],
  });
```

### Visualizing your bundle

Make sure you’ve built your project first (`vite build`). Then, inspect your bundle composition by running the following command:

```
npx bundlesize
```

By default, it will only show the composition of entry chunks whose size exceeds your [limits](#enforcing-size-limits) (default: `150 kB`). In order to view the composition of all chunks, set `stats: 'all'`:

```diff
  import { defineConfig } from 'vite';
  import bundlesize from 'vite-plugin-bundlesize';

  export default defineConfig({
    plugins: [
      bundlesize({
+       stats: 'all',
      }),
```

### Enforcing size limits

Add a `limits` option to enforce limits on entry files:

```diff
  import { defineConfig } from 'vite';
  import bundlesize from 'vite-plugin-bundlesize';

  export default defineConfig({
    plugins: [
-     bundlesize(),
+     bundlesize({
+       limits: [
+         {name: 'index.*.js', limit: '100 kB'},
+         {name: '**/*',       limit: '150 kB'},
+       ],
+     }),
    ],
  });
```

- The `name` field is a glob matched by [picomatch](https://github.com/micromatch/picomatch). Note that **only the first match will apply** so order limits from more specific to least specific.
- The `limit` field can be any human-readable size. We recommend `150 kB` which is the default, but you may raise or lower that number as needed.

Note that **only entry files are checked.** vite-plugin-bundlesize won’t measure lazy-loaded code because that is not render blocking. Ideally this helps you focus on only meaningful metrics in regards to bundle sizes.

#### Ignoring chunks

To ignore a chunk, set `limit: Infinity`:

```diff
  import { defineConfig } from 'vite';
  import bundlesize from 'vite-plugin-bundlesize';

  export default defineConfig({
    plugins: [
      bundlesize({
        limits: [
          {name: 'index.*.js',   limit: '100 kB'},
+         {name: 'ignored.*.js', limit: Infinity},
          {name: '**/*',         limit: '150 kB'},
        ],
      }),
```

#### Exiting build

By default, this plugin will **cause `vite build` to error and exit** when a chunk exceeds a certain limit (as opposed to [build.chunkSizeWarningLimit](https://vitejs.dev/config/build-options.html#build-chunksizewarninglimit) which will only warn). In order to allow every build to pass and only show warnings, add `allowFail: true`:

```diff
  import { defineConfig } from 'vite';
  import bundlesize from 'vite-plugin-bundlesize';

  export default defineConfig({
    plugins: [
      bundlesize({
+       allowFail: true,
      }),
    ],
  });
```

This requires you run `npx bundlesize` after every build to throw an error (including in CI).

## All options

| Name         |         Type         | Description                                                                        |
| :----------- | :------------------: | :--------------------------------------------------------------------------------- |
| `outputFile` |       `string`       | Change the location/name of `bundlemeta.json`                                      |
| `limits`     |      `Limit[]`       | See [enforcing size limits](#enforcing-size-limits)                                |
| `allowFail`  |      `boolean`       | Allow `vite build` to succeed even if limits are exceeded ([docs](#exiting-build)) |
| `stats`      | `'summary' \| 'all'` | Show a **summary** of failed chunks (default), or view **all** stats.              |
