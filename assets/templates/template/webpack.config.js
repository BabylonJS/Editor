const path = require("path");

// using node_modules from builded module directory
const webpack = require.main.require("webpack");

module.exports = (_, argv) => {
	const entryPath = path.join(__dirname, "src/game.ts");
	const package = require("./package.json");

	return {
		// we output both a minified version & a non minified version on production build
		entry: { "bundle": entryPath },
		output: {
			filename: `bundle.js`,
			path: path.join(__dirname, "dist"),
			library: package.name,
			libraryTarget: "commonjs2",
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					// we use babel-loader for polyfill only on production build
					loader: ["ts-loader"],
					exclude: /node_modules/,
				},
			],
		},
		resolve: {
			extensions: [".ts", ".js"],
		},
		plugins: [
            new webpack.BannerPlugin({
				banner: `${package.name} ${package.version} ${new Date().toString()}`,
			}),
		],
		optimization: {
			minimize: false,
		},
		devtool: "cheap-source-map",
	};
};
