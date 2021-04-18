const path = require("path");
const webpack = require("webpack");

module.exports = (_, argv) => {
	const entryPath = path.join(__dirname, "src/index.tsx");
	const package = require("../package.json");

	return {
		// we output both a minified version & a non minified version on production build
		entry: { "bundle": entryPath },
		output: {
			filename: `bundle.js`,
			path: path.join(__dirname, "dist"),
			library: "editorWebsite",
			libraryTarget: "umd",
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					// we use babel-loader for polyfill only on production build
					loader: ["ts-loader"],
					exclude: [
						path.join(__dirname, "node_modules"),
						path.join(__dirname, "dist"),
						path.join(__dirname, "projects"),
						path.join(__dirname, "scenes"),
					],
				},
				{
					test: /\.css$/i,
					use: ["style-loader", "css-loader"],
					include: /node_modules/,
				},
			],
		},
		resolve: {
			extensions: [".tsx", ".ts", ".js"],
		},
		plugins: [
			new webpack.BannerPlugin({
				banner: `${package.name} ${package.version} ${new Date().toString()}`,
			}),
			new webpack.WatchIgnorePlugin([
				/\.js$/,
				/\.d\.ts$/
			]),
		],
		optimization: {
			minimize: argv.mode === "production",
			usedExports: argv.mode === "production",
			sideEffects: argv.mode === "production",
		},
		devServer: {
			contentBase: path.join(__dirname, "dist"),
			compress: false,
			port: 1337
		},
		devtool: "source-map",
	};
};