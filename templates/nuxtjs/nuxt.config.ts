// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	ssr: false,
	srcDir: "src/",
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
	},
});
