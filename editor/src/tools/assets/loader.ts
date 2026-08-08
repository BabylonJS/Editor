import { join } from "path/posix";

import * as fflate from "fflate";

import { SPLATLoadingOptions } from "babylonjs-loaders";

export function getLoaderPluginOptions(appPath: string) {
	const nodeModules = process.env.DEBUG ? "../node_modules" : "node_modules";

	return {
		splat: {
			fflate,
			keepInRam: true,
			spzLibraryUrl: join(appPath ?? "", nodeModules, "@adobe/spz/dist/spz.js"),
		} satisfies Partial<SPLATLoadingOptions>,
	};
}
