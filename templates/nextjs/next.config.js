/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: false,

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
