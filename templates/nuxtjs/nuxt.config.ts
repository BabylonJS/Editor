// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	ssr: false,
	srcDir: "src/",
	dir: {
		public: "../public",
	},
	compatibilityDate: "2025-01-01",
	devtools: { enabled: false },
	typescript: {
		strict: true,
		tsConfig: {
			compilerOptions: {
				experimentalDecorators: true,
			},
		},
	},
	vite: {
		assetsInclude: ["**/*.fx"],
		optimizeDeps: {
			exclude: ["@babylonjs/havok"],
		},
		esbuild: {
			tsconfigRaw: {
				compilerOptions: {
					experimentalDecorators: true,
					useDefineForClassFields: false,
					verbatimModuleSyntax: false,
				},
			},
		},
	},
	telemetry: { enabled: false },
});
