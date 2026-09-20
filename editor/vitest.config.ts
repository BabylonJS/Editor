import { transform } from "esbuild";
import { defineConfig, Plugin } from "vitest/config";

/**
 * Babylon.js exposes its serialization decorators (`@serialize`, `@serializeAsTexture`, ...) as
 * TC39 standard decorators, so the editor is compiled with `experimentalDecorators: false`.
 *
 * Neither Vite's transformer (oxc) nor `tsc` lower standard decorators when the target is `esnext`:
 * they emit the native syntax, which no V8 version understands yet. `tsconfig.json` handles this by
 * targeting `ES2022`, but Vite always transforms on-the-fly at `esnext`, so decorated files are
 * re-transformed here with esbuild, which does lower them.
 */
function lowerStandardDecorators(): Plugin {
	return {
		name: "lower-standard-decorators",
		enforce: "pre",
		async transform(code, id) {
			if (id.includes("node_modules") || !/\.[cm]?tsx?$/.test(id) || !/^\s*@\w/m.test(code)) {
				return null;
			}

			const result = await transform(code, {
				loader: id.endsWith("x") ? "tsx" : "ts",
				target: "es2022",
				sourcefile: id,
				sourcemap: true,
				tsconfigRaw: {
					compilerOptions: {
						experimentalDecorators: false,
						useDefineForClassFields: true,
					},
				},
			});

			return {
				code: result.code,
				map: result.map,
			};
		},
	};
}

export default defineConfig({
	plugins: [lowerStandardDecorators()],
	test: {
		environment: "node",
		include: ["./test/**/*.test.mts"],
	},
});
