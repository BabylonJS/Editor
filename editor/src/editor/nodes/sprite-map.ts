import { readJSON } from "fs-extra";
import { dirname, join } from "path/posix";

import {
	Node,
	TransformNode,
	Scene,
	SpriteMap,
	Tools,
	Texture,
	ISpriteJSONAtlas,
	Vector2,
	Mesh,
	Engine,
	serialize,
	ShaderMaterial,
	RawTexture,
	ISpriteMapOptions,
	SerializationHelper,
	Matrix,
	Vector3,
	GetClass,
} from "babylonjs";
import { ISpriteMapTile, normalizeAtlasJson } from "babylonjs-editor-tools";

import { UniqueNumber } from "../../tools/tools";
import { setNodeSerializable, setNodeVisibleInGraph } from "../../tools/node/metadata";

import { getProjectAssetsRootUrl } from "../../project/configuration";

import { configureImportedTexture } from "../layout/preview/import/import";

export class SpriteMapNode extends TransformNode {
	private _spriteMap: SpriteMap | null = null;

	@serialize()
	public atlasJsonRelativePath: string | null = null;

	@serialize()
	public tiles: ISpriteMapTile[] = [];

	/**
	 * Constructor.
	 * @param name defines the name of the scene component.
	 * @param scene defines the reference to the scene where to add the scene component.
	 */
	public constructor(name: string, scene: Scene) {
		super(name, scene);

		this.id = Tools.RandomId();
		this.uniqueId = UniqueNumber.Get();
	}

	public get spritesheet(): Texture | null {
		return this._spriteMap?.spriteSheet ?? null;
	}

	public get atlasJson(): ISpriteJSONAtlas | null {
		return this._spriteMap?.atlasJSON ?? null;
	}

	public get outputPlane(): Mesh | null {
		return this._spriteMap?.["_output"] ?? null;
	}

	public get material(): ShaderMaterial | null {
		return this._spriteMap?.["_material"] ?? null;
	}

	public get tileMaps(): RawTexture[] | null {
		return this._spriteMap?.["_tileMaps"] ?? null;
	}

	public async buildFromAbsolutePath(
		absolutePath: string,
		atlasJson?: ISpriteJSONAtlas,
		spritesheet?: Texture,
		options?: Pick<ISpriteMapOptions, "stageSize" | "outputSize" | "colorMultiply" | "layerCount">
	): Promise<void> {
		if (!atlasJson) {
			atlasJson = await readJSON(absolutePath);
		}

		normalizeAtlasJson(atlasJson);

		if (!spritesheet) {
			const imagePath = join(dirname(absolutePath), atlasJson!.meta!["image"]);
			spritesheet = new Texture(imagePath, this._scene, false, false, Texture.NEAREST_NEAREST, null, null, null, false, Engine.TEXTUREFORMAT_RGBA);
			configureImportedTexture(spritesheet);
		}

		const spriteMap = new SpriteMap(
			this.name,
			atlasJson!,
			spritesheet,
			{
				layerCount: options?.layerCount ?? 1,
				stageSize: options?.stageSize ?? new Vector2(10, 1),
				outputSize: options?.outputSize ?? new Vector2(100, 10),
				colorMultiply: options?.colorMultiply ?? new Vector3(1, 1),
				flipU: true,
			},
			this._scene
		);

		this.spriteMap = spriteMap;
		this.atlasJsonRelativePath = absolutePath.replace(getProjectAssetsRootUrl()!, "");

		this.outputPlane!.parent = this;

		this.buildTiles();
	}

	public createTileBuffer(buffer: any, _layer: number = 0): RawTexture | null {
		return this._spriteMap?.["_createTileBuffer"](buffer, _layer) ?? null;
	}

	public get spriteMap(): SpriteMap | null {
		return this._spriteMap;
	}

	public set spriteMap(value: SpriteMap | null) {
		this._spriteMap?.dispose();
		this._spriteMap = value;

		if (value) {
			this._configureSpriteMap(value);
		}
	}

	private _configureSpriteMap(spriteMap: SpriteMap): void {
		const output = spriteMap["_output"] as Mesh;

		setNodeSerializable(output, false);
		setNodeVisibleInGraph(output, false);
	}

	public updateFromOptions(options: Pick<ISpriteMapOptions, "stageSize" | "outputSize" | "colorMultiply" | "layerCount">): void {
		const plane = this.outputPlane;
		const material = this.material;
		const tileMaps = this.tileMaps;

		if (!plane || !material || !tileMaps) {
			return;
		}

		tileMaps.forEach((tileMap) => {
			tileMap.dispose();
		});
		tileMaps.splice(0, tileMaps.length);

		for (let i = 0; i < options.layerCount!; i++) {
			tileMaps.push(this.createTileBuffer(null, i)!);
		}

		this.buildTiles();

		material.setVector2("stageSize", options.stageSize!);
		material.setVector2("outputSize", options.outputSize!);
		material.setVector3("colorMul", options.colorMultiply!);
		material.setTextureArray("tileMaps", tileMaps);

		plane.scaling.x = options.outputSize!.x;
		plane.scaling.y = options.outputSize!.y;
	}

	public updateTile(tile: ISpriteMapTile): void {
		const index = this.tiles.indexOf(tile);
		if (index !== -1) {
			this.updateTileByIndex(index);
		}
	}

	public updateTileByIndex(index: number): void {
		const tile = this.tiles[index];
		const tileMaps = this.tileMaps;

		if (!tile || !tileMaps) {
			return;
		}

		const tileMap = this.tileMaps?.[tile.layer];
		tileMap?.dispose();
		tileMaps[tile.layer] = this.createTileBuffer(null, tile.layer)!;

		this.buildTiles(tile.layer);
	}

	public buildTiles(layer?: number): void {
		if (!this._spriteMap) {
			return;
		}

		this.tiles.forEach((tileConfiguration) => {
			const frame = this._spriteMap!.atlasJSON.frames[tileConfiguration.tile];
			if (!frame) {
				return;
			}

			if (layer !== undefined && tileConfiguration.layer !== layer) {
				return;
			}

			for (let x = 0, lenX = tileConfiguration.repeatCount.x + 1; x < lenX; ++x) {
				for (let y = 0, lenY = tileConfiguration.repeatCount.y + 1; y < lenY; ++y) {
					const offsetX = x * (tileConfiguration.repeatOffset.x + 1);
					const offsetY = y * (tileConfiguration.repeatOffset.y + 1);

					this._spriteMap!.changeTiles(
						tileConfiguration.layer,
						new Vector2(tileConfiguration.position.x + offsetX, (this._spriteMap!.options.stageSize?.y ?? 0) - 1 - tileConfiguration.position.y - offsetY),
						tileConfiguration.tile
					);
				}
			}
		});
	}

	/**
	 * Releases resources associated with this scene link.
	 */
	public dispose(): void {
		this._spriteMap?.dispose();
		super.dispose(false, true);
	}

	/**
	 * Gets the current object class name.
	 * @return the class name
	 */
	public getClassName(): string {
		return "SpriteMapNode";
	}

	public serialize(): any {
		return super.serialize({
			isSpriteMap: true,
			options: {
				layerCount: this._spriteMap?.options.layerCount,
				stageSize: this._spriteMap?.options.stageSize?.asArray(),
				outputSize: this._spriteMap?.options.outputSize?.asArray(),
				colorMultiply: this._spriteMap?.options.colorMultiply?.asArray(),
			},
		});
	}

	public static Parse(parsedTransformNode: any, scene: Scene, rootUrl: string): SpriteMapNode {
		const spriteMap = SerializationHelper.Parse(() => new SpriteMapNode(parsedTransformNode.name, scene), parsedTransformNode, scene, rootUrl);

		if (parsedTransformNode.localMatrix) {
			spriteMap.setPreTransformMatrix(Matrix.FromArray(parsedTransformNode.localMatrix));
		} else if (parsedTransformNode.pivotMatrix) {
			spriteMap.setPivotMatrix(Matrix.FromArray(parsedTransformNode.pivotMatrix));
		}

		spriteMap.setEnabled(parsedTransformNode.isEnabled);

		spriteMap._waitingParsedUniqueId = parsedTransformNode.uniqueId;

		// Parent
		if (parsedTransformNode.parentId !== undefined) {
			spriteMap._waitingParentId = parsedTransformNode.parentId;
		}

		if (parsedTransformNode.parentInstanceIndex !== undefined) {
			spriteMap._waitingParentInstanceIndex = parsedTransformNode.parentInstanceIndex;
		}

		// Animations
		if (parsedTransformNode.animations) {
			for (let animationIndex = 0; animationIndex < parsedTransformNode.animations.length; animationIndex++) {
				const parsedAnimation = parsedTransformNode.animations[animationIndex];
				const internalClass = GetClass("BABYLON.Animation");
				if (internalClass) {
					spriteMap.animations.push(internalClass.Parse(parsedAnimation));
				}
			}
			Node.ParseAnimationRanges(spriteMap, parsedTransformNode, scene);
		}

		if (parsedTransformNode.autoAnimate) {
			scene.beginAnimation(
				spriteMap,
				parsedTransformNode.autoAnimateFrom,
				parsedTransformNode.autoAnimateTo,
				parsedTransformNode.autoAnimateLoop,
				parsedTransformNode.autoAnimateSpeed || 1.0
			);
		}

		if (spriteMap.atlasJsonRelativePath) {
			spriteMap.buildFromAbsolutePath(join(rootUrl, spriteMap.atlasJsonRelativePath), undefined, undefined, {
				layerCount: parsedTransformNode.options.layerCount,
				stageSize: Vector2.FromArray(parsedTransformNode.options.stageSize ?? [10, 1]),
				outputSize: Vector2.FromArray(parsedTransformNode.options.outputSize ?? [100, 100]),
				colorMultiply: Vector3.FromArray(parsedTransformNode.options.colorMultiply ?? [1, 1, 1]),
			});
		}

		return spriteMap;
	}
}

Node.AddNodeConstructor("SpriteMapNode", (name, scene) => {
	return () => new SpriteMapNode(name, scene);
});
