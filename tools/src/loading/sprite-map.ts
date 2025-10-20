import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Engine } from "@babylonjs/core/Engines/engine";
import { WebRequest } from "@babylonjs/core/Misc/webRequest";
import { SpriteMap } from "@babylonjs/core/Sprites/spriteMap";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";

import { normalizeAtlasJson, SpriteMapNode } from "../tools/sprite";

AddParser("SpriteMapNode", (parsedData: any, scene: Scene, container: AssetContainer, rootUrl: string) => {
	parsedData.transformNodes?.forEach((transformNode: any) => {
		if (!transformNode.isSpriteMap) {
			return;
		}

		const instance = container.transformNodes?.find((t) => t.id === transformNode.id) as SpriteMapNode;
		if (!instance) {
			return;
		}

		instance.isSpriteMap = transformNode.isSpriteMap;

		const atlasJsonAbsolutePath = `${rootUrl}${transformNode.atlasJsonRelativePath}`;

		scene.addPendingData(atlasJsonAbsolutePath);

		const atlasRequest = new WebRequest();
		atlasRequest.open("GET", atlasJsonAbsolutePath);
		atlasRequest.send();

		atlasRequest.addEventListener("load", () => {
			scene.removePendingData(atlasJsonAbsolutePath);

			const atlasJson = JSON.parse(atlasRequest.responseText);
			normalizeAtlasJson(atlasJson);

			const imagePath = `${Tools.GetFolderPath(atlasJsonAbsolutePath)}${atlasJson.meta.image}`;

			const spritesheet = new Texture(imagePath, scene, false, false, Texture.NEAREST_NEAREST, null, null, null, false, Engine.TEXTUREFORMAT_RGBA);

			const spriteMap = new SpriteMap(
				instance.name,
				atlasJson,
				spritesheet,
				{
					layerCount: transformNode.options.layerCount,
					stageSize: Vector2.FromArray(transformNode.options.stageSize ?? [10, 1]),
					outputSize: Vector2.FromArray(transformNode.options.outputSize ?? [100, 100]),
					colorMultiply: Vector3.FromArray(transformNode.options.colorMultiply ?? [1, 1, 1]),
					flipU: true,
				},
				scene
			);

			transformNode.tiles.forEach((tile: any) => {
				for (let x = 0, lenX = tile.repeatCount.x + 1; x < lenX; ++x) {
					for (let y = 0, lenY = tile.repeatCount.y + 1; y < lenY; ++y) {
						const offsetX = x * (tile.repeatOffset.x + 1);
						const offsetY = y * (tile.repeatOffset.y + 1);

						spriteMap.changeTiles(tile.layer, new Vector2(tile.position.x + offsetX, (spriteMap.options.stageSize?.y ?? 0) - 1 - tile.position.y - offsetY), tile.tile);
					}
				}
			});

			const outputPlane = spriteMap["_output"] as Mesh;
			outputPlane.parent = instance;

			instance.spriteMap = spriteMap;
		});
	});
});
