import react from "@vitejs/plugin-react";
import { parse } from "yaml";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const yamlConfig = parse(fs.readFileSync(path.join(__dirname, 'config.test.yml')).toString()).wallet

const walletConfig = {}

Object.keys(yamlConfig).forEach((key: string) => {
	// FIXME vitest does not manage objects as definitions
	walletConfig[`import.meta.env.VITE_${key.toUpperCase()}`] = JSON.stringify(JSON.stringify(yamlConfig[key]))
})

export default defineConfig({
	define: {
		...walletConfig,
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
		},
	},
	test: {
		globals: true,
		setupFiles: ['./setup-vitest.ts'],
		exclude: ['lib/**', 'node_modules/**'],
		environmentMatchGlobs: [
			['**/services/*.test.ts', 'node'],
			['**', 'jsdom']
		],
		typecheck: {
			enabled: true,
		},
	},
});
