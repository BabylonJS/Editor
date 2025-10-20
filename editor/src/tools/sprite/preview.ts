import { join } from "path/posix";

import { SpriteMapNode } from "../../editor/nodes/sprite-map";
import { SpriteManagerNode } from "../../editor/nodes/sprite-manager";

import { getProjectAssetsRootUrl } from "../../project/configuration";

export async function computeSpriteManagerPreviews(spriteNode: SpriteManagerNode) {
	if (spriteNode.spritesheet) {
		const imagePath = join(getProjectAssetsRootUrl()!, spriteNode.spritesheet!.name);

		if (spriteNode.atlasJson) {
			await computeSpritePreviewImagesFromAtlasJson(spriteNode.atlasJson, imagePath);
		} else if (!spriteNode._previews.length) {
			spriteNode._previews = await computeSpritePreviewImagesFromDimensions(imagePath, spriteNode.spriteManager!.cellWidth, spriteNode.spriteManager!.cellHeight);
		}
	}
}

export async function computeSpriteMapPreviews(spriteNode: SpriteMapNode) {
	if (spriteNode.atlasJson && spriteNode.spritesheet) {
		const imagePath = join(getProjectAssetsRootUrl()!, spriteNode.spritesheet!.name);
		await computeSpritePreviewImagesFromAtlasJson(spriteNode.atlasJson, imagePath);
	}
}

export async function computeSpritePreviewImagesFromDimensions(imagePath: string, cellWidth: number, cellHeight: number) {
	const image = new Image();
	await new Promise<void>((resolve, reject) => {
		image.addEventListener("load", () => resolve());
		image.addEventListener("error", (err) => reject(err));
		image.src = imagePath;
	});

	const canvas = document.createElement("canvas");

	const cols = Math.floor(image.width / cellWidth);
	const rows = Math.floor(image.height / cellHeight);

	const previews: string[] = [];

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const context = canvas.getContext("2d");
			if (!context) {
				continue;
			}

			canvas.width = cellWidth;
			canvas.height = cellHeight;

			context.fillStyle = "rgba(0,0,0,0)";
			context?.clearRect(0, 0, cellWidth, cellHeight);
			context.drawImage(image, col * cellWidth, row * cellHeight, cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);

			const data = context.getImageData(0, 0, cellWidth, cellHeight).data;
			let isEmpty = true;
			for (let i = 3; i < data.length; i += 4) {
				if (data[i] !== 0) {
					isEmpty = false;
					break;
				}
			}

			if (!isEmpty) {
				previews.push(canvas.toDataURL("image/png"));
			}
		}
	}

	return previews;
}

export async function computeSpritePreviewImagesFromAtlasJson(atlasJson: any, imagePath: string) {
	const image = new Image();
	await new Promise<void>((resolve, reject) => {
		image.addEventListener("load", () => resolve());
		image.addEventListener("error", (err) => reject(err));
		image.src = imagePath;
	});

	const canvas = document.createElement("canvas");
	const frameKeys = Object.keys(atlasJson.frames);

	for (const key of frameKeys) {
		const f = atlasJson.frames[key];

		if (f._preview) {
			continue;
		}

		canvas.width = f.frame.w;
		canvas.height = f.frame.h;

		const context = canvas.getContext("2d");
		if (!context) {
			return;
		}

		context.fillStyle = "rgba(0,0,0,0)";
		context?.clearRect(0, 0, f.frame.w, f.frame.h);
		context.drawImage(image, f.frame.x, f.frame.y, f.frame.w, f.frame.h, 0, 0, f.frame.w, f.frame.h);

		f._preview = canvas.toDataURL("image/png");
	}
}
