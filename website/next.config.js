/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: false,

	env: {
		MANSION_EXPERIMENT_ROOT_URL: process.env.MANSION_EXPERIMENT_ROOT_URL,
	},

	turbopack: {
		rules: {
			"*.{fx}": {
				loaders: ["raw-loader"],
				as: "*.js",
			},
		},
	},
};

module.exports = nextConfig;
