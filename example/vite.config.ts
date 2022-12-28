import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import bundlesize from 'vite-plugin-bundlesize';

export default defineConfig({
	plugins: [
		react(),
		bundlesize({
			entrypoints: [{ src: 'src/index.tsx', limit: '120 kB' }],
		}),
	],
});
