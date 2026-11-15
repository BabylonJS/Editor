import {
	addFacingBillboardSystem,
	billboardBlendAlpha,
	createFacingBillboardSystem,
	createGridSpriteAtlas,
	loadTexture2D,
	SceneContext,
	SpriteAtlas,
	SpriteFrame,
} from "@babylonjs/lite";

import { setClassName } from "../tools/guards";
import { getLoadableUrl, loadJsonFile } from "../tools/request";
import { normalizeAtlasJson, Sprite, SpriteManager, SpriteManagerNode } from "../tools/sprite";

function getFolderPath(url: string): string {
	return url.substring(0, url.lastIndexOf("/") + 1);
}

/**
 * Creates the sprite atlas of Babylon Lite from the given packed atlas (TexturePacker JSON format, the one used by
 * the editor). Babylon Lite only loads grid atlases: the frames of the packed atlas are computed by the tools.
 */
async function createPackedSpriteAtlas(scene: SceneContext, imageUrl: string, atlasJson: any): Promise<{ atlas: SpriteAtlas; frameNames: string[] }> {
	const texture = await loadTexture2D(scene.surface.engine, await getLoadableUrl(imageUrl), {
		invertY: false,
	});

	const width = atlasJson.meta?.size?.w ?? texture.width;
	const height = atlasJson.meta?.size?.h ?? texture.height;

	const frameNames: string[] = [];
	const frames: SpriteFrame[] = (atlasJson.frames as any[]).map((frameData) => {
		const frame = frameData.frame;
		const rotated = !!frameData.rotated;

		const frameWidth = rotated ? frame.h : frame.w;
		const frameHeight = rotated ? frame.w : frame.h;

		frameNames.push(frameData.filename);

		return {
			name: frameData.filename,
			uvMin: [frame.x / width, frame.y / height],
			uvMax: [(frame.x + frameWidth) / width, (frame.y + frameHeight) / height],
			sourceSizePx: [frame.w, frame.h],
			pivot: [frameData.pivot?.x ?? 0.5, frameData.pivot?.y ?? 0.5],
		} as SpriteFrame;
	});

	return {
		frameNames,
		atlas: {
			texture,
			textureSizePx: [width, height],
			frames,
			premultipliedAlpha: false,
		},
	};
}

function parseSerializedSprites(spriteManager: SpriteManager, parsedSpriteManager: any) {
	if (parsedSpriteManager?.metadata !== undefined) {
		spriteManager.metadata = parsedSpriteManager?.metadata;
	}

	for (const parsedSprite of parsedSpriteManager?.sprites ?? []) {
		let frame = parsedSprite.cellIndex ?? 0;
		if (parsedSprite.cellRef) {
			const index = spriteManager.getFrameIndex(parsedSprite.cellRef);
			if (index !== -1) {
				frame = index;
			}
		}

		const width = parsedSprite.width ?? parsedSprite.size ?? 1;
		const height = parsedSprite.height ?? parsedSprite.size ?? 1;
		const color = parsedSprite.color ?? [1, 1, 1, 1];

		const sprite = new Sprite(parsedSprite.name, spriteManager, {
			position: parsedSprite.position ?? [0, 0, 0],
			sizeWorld: [width, height],
			rotation: parsedSprite.angle ?? 0,
			color: [color[0], color[1], color[2], color[3] ?? 1],
			flipX: parsedSprite.invertU ?? false,
			flipY: parsedSprite.invertV ?? false,
			visible: parsedSprite.isVisible ?? true,
			frame,
		});

		sprite.uniqueId = parsedSprite.uniqueId;
		sprite.metadata = parsedSprite.metadata;

		if (parsedSprite.animationStarted) {
			sprite.playAnimation(parsedSprite.fromIndex ?? 0, parsedSprite.toIndex ?? 0, parsedSprite.loopAnimation ?? false, parsedSprite.delay ?? 0);
		}
	}
}

/**
 * Parses the sprite manager of the given serialized sprite manager node (a transform node with `isSpriteManager`
 * saved by the editor) and configures the given node as a sprite manager node. The sprite manager is created as a
 * camera-facing billboard sprite system of Babylon Lite.
 * @param scene defines the reference to the scene the sprite manager node belongs to.
 * @param rootUrl defines the root url of the scene.
 * @param instance defines the reference to the node created for the serialized sprite manager node.
 * @param data defines the serialized sprite manager node.
 */
export async function parseSpriteManagerNode(scene: SceneContext, rootUrl: string, instance: SpriteManagerNode, data: any): Promise<void> {
	instance.isSpriteManager = data.isSpriteManager;
	instance.spriteManager = null;
	instance.getClassName = () => "SpriteManagerNode";

	setClassName(instance, "SpriteManagerNode");

	let atlas: SpriteAtlas | null = null;
	let frameNames: string[] = [];

	try {
		if (data.atlasJsonRelativePath) {
			const atlasJsonAbsolutePath = `${rootUrl}${data.atlasJsonRelativePath}`;
			const atlasJson = await loadJsonFile<any>(atlasJsonAbsolutePath);
			normalizeAtlasJson(atlasJson);

			const result = await createPackedSpriteAtlas(scene, `${getFolderPath(atlasJsonAbsolutePath)}${atlasJson.meta.image}`, atlasJson);
			atlas = result.atlas;
			frameNames = result.frameNames;
		} else if (data.spriteManager?.textureUrl) {
			const texture = await loadTexture2D(scene.surface.engine, await getLoadableUrl(`${rootUrl}${data.spriteManager.textureUrl}`), {
				invertY: false,
			});

			atlas = createGridSpriteAtlas(texture, {
				cellWidthPx: data.spriteManager.cellWidth,
				cellHeightPx: data.spriteManager.cellHeight,
			});
		}
	} catch (e) {
		console.error(`Failed to load the sprite manager "${data.name}".`, e);
	}

	if (!atlas) {
		return;
	}

	const system = createFacingBillboardSystem(atlas, {
		capacity: Math.max(1000, data.spriteManager?.sprites?.length ?? 0),
		blendMode: billboardBlendAlpha,
	});

	addFacingBillboardSystem(scene, system);

	const spriteManager = new SpriteManager(instance.name, scene, system, atlas, frameNames);
	instance.spriteManager = spriteManager;

	if (data.spriteManager) {
		parseSerializedSprites(spriteManager, data.spriteManager);
	}
}
