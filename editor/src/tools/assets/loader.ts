import { join, normalize } from "path/posix";

import * as fflate from "fflate";

import { SPLATLoadingOptions, GLTFLoaderOptions } from "babylonjs-loaders";

export function getLoaderPluginOptions(appPath: string) {
	const nodeModules = process.env.DEBUG ? "../node_modules" : "node_modules";

	return {
		gltf: {
			// Setting this function makes the loader accept parent-relative URIs like "../shared-textures/texture.png".
			preprocessUrlAsync: async (url: string) => normalize(url),
		} satisfies Partial<GLTFLoaderOptions>,
		splat: {
			fflate,
			keepInRam: true,
			spzLibraryUrl: join(appPath ?? "", nodeModules, "@adobe/spz/dist/spz.js"),
		} satisfies Partial<SPLATLoadingOptions>,
	};
}
