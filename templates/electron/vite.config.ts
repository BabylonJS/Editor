import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss()],
	base: "./",
	server: {
		port: 3000,
	},
	optimizeDeps: {
		exclude: ["@babylonjs/havok"],
	},
	build: {
		target: "esnext",
	},
});
