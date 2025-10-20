import { Scene } from "@babylonjs/core/scene";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Sprite } from "@babylonjs/core/Sprites/sprite";
import { WebRequest } from "@babylonjs/core/Misc/webRequest";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { SpriteManager } from "@babylonjs/core/Sprites/spriteManager";
import { AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";

import { SpriteManagerNode } from "../tools/sprite";

function parseSerializedSpriteManager(spriteManager: SpriteManager, parsedSpriteManager: any) {
	if (parsedSpriteManager?.fogEnabled !== undefined) {
		spriteManager.fogEnabled = parsedSpriteManager?.fogEnabled;
	}
	if (parsedSpriteManager?.blendMode !== undefined) {
		spriteManager.blendMode = parsedSpriteManager?.blendMode;
	}
	if (parsedSpriteManager?.disableDepthWrite !== undefined) {
		spriteManager.disableDepthWrite = parsedSpriteManager?.disableDepthWrite;
	}
	if (parsedSpriteManager?.pixelPerfect !== undefined) {
		spriteManager.pixelPerfect = parsedSpriteManager?.pixelPerfect;
	}
	if (parsedSpriteManager?.useLogarithmicDepth !== undefined) {
		spriteManager.useLogarithmicDepth = parsedSpriteManager?.useLogarithmicDepth;
	}

	if (parsedSpriteManager?.metadata !== undefined) {
		spriteManager.metadata = parsedSpriteManager?.metadata;
	}

	for (const parsedSprite of parsedSpriteManager?.sprites ?? []) {
		const sprite = Sprite.Parse(parsedSprite, spriteManager);
		sprite.uniqueId = parsedSprite.uniqueId;
		sprite.metadata = parsedSprite.metadata;
	}
}

AddParser("SpriteManagerNode", (parsedData: any, scene: Scene, container: AssetContainer, rootUrl: string) => {
	parsedData.transformNodes?.forEach((transformNode: any) => {
		if (!transformNode.isSpriteManager) {
			return;
		}

		const instance = container.transformNodes?.find((t) => t.id === transformNode.id) as SpriteManagerNode;
		if (!instance) {
			return;
		}

		instance.isSpriteManager = transformNode.isSpriteManager;

		if (transformNode.atlasJsonRelativePath) {
			const atlasJsonAbsolutePath = `${rootUrl}${transformNode.atlasJsonRelativePath}`;

			scene.addPendingData(atlasJsonAbsolutePath);

			const atlasRequest = new WebRequest();
			atlasRequest.open("GET", atlasJsonAbsolutePath);
			atlasRequest.send();

			atlasRequest.addEventListener("load", () => {
				scene.removePendingData(atlasJsonAbsolutePath);

				const atlasJson = JSON.parse(atlasRequest.responseText);
				const imagePath = `${Tools.GetFolderPath(atlasJsonAbsolutePath)}${atlasJson.meta.image}`;

				const spriteManager = new SpriteManager(instance.name, imagePath, 1000, 64, scene, undefined, undefined, true, atlasJson);
				instance.spriteManager = spriteManager;

				if (transformNode.spriteManager) {
					parseSerializedSpriteManager(spriteManager, transformNode.spriteManager);
				}
			});
		} else if (transformNode.spriteManager?.textureUrl) {
			const imagePath = `${rootUrl}${transformNode.spriteManager.textureUrl}`;
			const spriteManager = new SpriteManager(
				instance.name,
				imagePath,
				1000,
				{
					width: transformNode.spriteManager.cellWidth,
					height: transformNode.spriteManager.cellHeight,
				},
				scene,
				undefined,
				undefined,
				false
			);

			instance.spriteManager = spriteManager;

			if (transformNode.spriteManager) {
				parseSerializedSpriteManager(spriteManager, transformNode.spriteManager);
			}
		}
	});
});
