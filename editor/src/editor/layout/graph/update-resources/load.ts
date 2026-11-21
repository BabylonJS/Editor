import { basename, dirname, extname, join } from "path/posix";

import { AssetContainer, LoadAssetContainerAsync, Scene } from "babylonjs";

import { getLoaderPluginOptions } from "../../../../tools/assets/loader";
import { cleanAnimationDuplicates, convertGltfToLeftHanded } from "../../../../tools/scene/gltf";

/**
 * Loads the given asset file (glTF, glb, babylon...) in a container, prepared the same way as when the asset is imported in
 * the scene so its data can be compared and copied to the scene: glTF files are converted to the left handed system and the
 * duplicated animations are removed. The materials are loaded so they can be updated too (optional), and the animations
 * are not started so the nodes of the asset stay in their rest pose.
 * @param scene defines the reference to the scene where to load the asset.
 * @param filename defines the absolute path of the asset file.
 * @param appPath defines the path of the editor application, used to configure the loaders.
 */
export async function loadUpdateResourcesAsset(scene: Scene, filename: string, appPath: string): Promise<AssetContainer> {
	const pluginOptions = getLoaderPluginOptions(appPath);

	const container = await LoadAssetContainerAsync(basename(filename), scene, {
		rootUrl: join(dirname(filename), "/"),
		pluginOptions: {
			...pluginOptions,
			gltf: {
				...pluginOptions.gltf,
				animationStartMode: 0, // GLTFLoaderAnimationStartMode.NONE
			},
		},
	});

	switch (extname(filename).toLowerCase()) {
		case ".glb":
		case ".gltf":
			convertGltfToLeftHanded(container);
			cleanAnimationDuplicates(container);
			break;
	}

	return container;
}
