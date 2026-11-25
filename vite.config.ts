import { coralFmt } from "@get-coral/oxfmt-config";
import { coralLint } from "@get-coral/oxlint-config";
import { defineConfig } from "vite-plus";

export default defineConfig({
	pack: {
		entry: {
			index: "src/index.ts",
			"types/index": "src/types/index.ts",
		},
		format: ["esm", "cjs"],
		// Keep tsup's file names (index.js + index.cjs) so the published exports do not move.
		fixedExtension: false,
		dts: true,
		sourcemap: true,
		publint: true,
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
	lint: {
		extends: [coralLint],
		jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
		rules: { "vite-plus/prefer-vite-plus-imports": "error" },
		options: { typeAware: true, typeCheck: true },
	},
	fmt: {
		...coralFmt,
		ignorePatterns: ["CHANGELOG.md", ".release-please-manifest.json", "release-please-config.json"],
	},
});
