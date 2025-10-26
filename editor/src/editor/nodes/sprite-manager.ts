import { dirname, isAbsolute, join } from "path/posix";
import { pathExistsSync, readJSONSync } from "fs-extra";

import { Node, TransformNode, Scene, Tools, serialize, SerializationHelper, Matrix, GetClass, SpriteManager, Texture, Sprite, Observer } from "babylonjs";

import { showAlert } from "../../ui/dialog";

import { UniqueNumber } from "../../tools/tools";

import { configureImportedTexture } from "../layout/preview/import/import";

import { getProjectAssetsRootUrl } from "../../project/configuration";

export class SpriteManagerNode extends TransformNode {
	@serialize()
	public atlasJsonRelativePath: string | null = null;

	public atlasJson: any = null;
	public spriteManager: SpriteManager | null = null;

	private _renderObserver: Observer<Scene> | null = null;

	/**
	 * @internal
	 */
	public _previews: string[] = [];

	/**
	 * Constructor.
	 * @param name defines the name of the scene component.
	 * @param scene defines the reference to the scene where to add the scene component.
	 */
	public constructor(name: string, scene: Scene) {
		super(name, scene);

		this.id = Tools.RandomId();
		this.uniqueId = UniqueNumber.Get();

		this._renderObserver = scene.onBeforeRenderObservable.add(() => this._onBeforeRenderScene());
	}

	public get spritesheet(): Texture | null {
		return this.spriteManager?.texture ?? null;
	}

	public set spritesheet(texture: Texture | null) {
		if (texture) {
			if (this.spriteManager) {
				this.spriteManager.texture = texture;
			} else {
				let textureName = texture.name;
				if (!isAbsolute(textureName)) {
					textureName = join(getProjectAssetsRootUrl()!, textureName);
				}

				this.spriteManager = new SpriteManager(this.name, textureName, 1000, 64, this._scene);
			}
		} else {
			this.spriteManager?.dispose();
			this.spriteManager = null;
		}
	}

	public buildFromImageAbsolutePath(imagePath: string, serializeSpriteManager?: any): void {
		this.spriteManager?.dispose();

		this.atlasJson = null;
		this.atlasJsonRelativePath = null;

		this.spriteManager = new SpriteManager(
			this.name,
			imagePath,
			serializeSpriteManager?.capacity ?? 1000,
			{
				width: serializeSpriteManager?.cellWidth ?? 64,
				height: serializeSpriteManager?.cellHeight ?? 64,
			},
			this._scene,
			undefined,
			undefined,
			false
		);
		this.spriteManager.isPickable = true;

		configureImportedTexture(this.spriteManager.texture);

		if (serializeSpriteManager) {
			this._parseSpriteManager(serializeSpriteManager);
		}

		this._overrideSpriteRenderer();
	}

	public buildFromAtlasJsonAbsolutePath(absolutePath: string, serializeSpriteManager?: any): void {
		const atlasJson = readJSONSync(absolutePath);
		const imagePath = join(dirname(absolutePath), atlasJson.meta["image"]);

		if (!pathExistsSync(imagePath)) {
			showAlert("Error", `Cannot find the associated image for the atlas JSON file: ${imagePath}`);
			return;
		}

		this.spriteManager?.dispose();

		this.atlasJson = atlasJson;
		this.atlasJsonRelativePath = absolutePath.replace(getProjectAssetsRootUrl()!, "");

		this.spriteManager = new SpriteManager(
			this.name,
			imagePath,
			serializeSpriteManager?.capacity ?? 1000,
			serializeSpriteManager?.cellHeight ?? 64,
			this._scene,
			undefined,
			undefined,
			true,
			this.atlasJson
		);
		this.spriteManager.isPickable = true;

		configureImportedTexture(this.spriteManager.texture);

		if (serializeSpriteManager) {
			this._parseSpriteManager(serializeSpriteManager);
		}

		this._overrideSpriteRenderer();
	}

	public disposeSpriteManager(): void {
		this.spriteManager?.dispose();
		this.spriteManager = null;
		this.atlasJson = null;
		this.atlasJsonRelativePath = null;
	}

	private _parseSpriteManager(serializeSpriteManager: any): void {
		if (!this.spriteManager) {
			return;
		}

		if (serializeSpriteManager.fogEnabled !== undefined) {
			this.spriteManager.fogEnabled = serializeSpriteManager.fogEnabled;
		}
		if (serializeSpriteManager.blendMode !== undefined) {
			this.spriteManager.blendMode = serializeSpriteManager.blendMode;
		}
		if (serializeSpriteManager.disableDepthWrite !== undefined) {
			this.spriteManager.disableDepthWrite = serializeSpriteManager.disableDepthWrite;
		}
		if (serializeSpriteManager.pixelPerfect !== undefined) {
			this.spriteManager.pixelPerfect = serializeSpriteManager.pixelPerfect;
		}
		if (serializeSpriteManager.useLogarithmicDepth !== undefined) {
			this.spriteManager.useLogarithmicDepth = serializeSpriteManager.useLogarithmicDepth;
		}

		if (serializeSpriteManager.metadata !== undefined) {
			this.spriteManager.metadata = serializeSpriteManager.metadata;
		}

		for (const parsedSprite of serializeSpriteManager.sprites) {
			const sprite = Sprite.Parse(parsedSprite, this.spriteManager);
			sprite.uniqueId = parsedSprite.uniqueId;
			sprite.metadata = parsedSprite.metadata;
		}
	}

	private _overrideSpriteRenderer(): void {
		if (!this.spriteManager) {
			return;
		}

		const spriteRenderer = this.spriteManager.spriteRenderer;

		const _appendSpriteVertex = spriteRenderer["_appendSpriteVertex"];
		spriteRenderer["_appendSpriteVertex"] = function (index, sprite, ...args: any[]) {
			_appendSpriteVertex.call(this, index, sprite, ...args);

			let arrayOffset = index * this._vertexBufferSize;
			if (this._useInstancing) {
				arrayOffset -= 2;
			}

			if (sprite.overrideColor) {
				this._vertexData[arrayOffset + 14] *= sprite.overrideColor.r;
				this._vertexData[arrayOffset + 15] *= sprite.overrideColor.g;
				this._vertexData[arrayOffset + 16] *= sprite.overrideColor.b;
				this._vertexData[arrayOffset + 17] *= sprite.overrideColor.a;
			}
		};
	}

	private _onBeforeRenderScene(): void {
		const isEnabled = this.isEnabled(true) && this._scene.transformNodes.indexOf(this) !== -1;
		const spriteManagerIndex = this._scene.spriteManagers?.indexOf(this.spriteManager!) ?? -1;

		if (!isEnabled && spriteManagerIndex !== -1) {
			this._scene.spriteManagers?.splice(spriteManagerIndex, 1);
		} else if (isEnabled && spriteManagerIndex === -1 && this.spriteManager) {
			this._scene.spriteManagers?.push(this.spriteManager);
		}
	}

	/**
	 * Releases resources associated with this scene link.
	 */
	public dispose(): void {
		this.spriteManager?.dispose();
		this._scene.onBeforeRenderObservable.remove(this._renderObserver);

		super.dispose(false, true);
	}

	/**
	 * Gets the current object class name.
	 * @return the class name
	 */
	public getClassName(): string {
		return "SpriteManagerNode";
	}

	public serialize(): any {
		const spriteManager = this.spriteManager?.serialize() ?? null;
		if (spriteManager) {
			spriteManager.sprites.forEach((sprite, index) => {
				sprite.uniqueId = this.spriteManager!.sprites[index].uniqueId;
				sprite.metadata = this.spriteManager!.sprites[index].metadata;
			});
		}

		return super.serialize({
			spriteManager,
			isSpriteManager: true,
		});
	}

	public static Parse(parsedData: any, scene: Scene, rootUrl: string): SpriteManagerNode {
		const node = SerializationHelper.Parse(() => new SpriteManagerNode(parsedData.name, scene), parsedData, scene, rootUrl);

		if (parsedData.localMatrix) {
			node.setPreTransformMatrix(Matrix.FromArray(parsedData.localMatrix));
		} else if (parsedData.pivotMatrix) {
			node.setPivotMatrix(Matrix.FromArray(parsedData.pivotMatrix));
		}

		node.setEnabled(parsedData.isEnabled);

		node._waitingParsedUniqueId = parsedData.uniqueId;

		// Parent
		if (parsedData.parentId !== undefined) {
			node._waitingParentId = parsedData.parentId;
		}

		if (parsedData.parentInstanceIndex !== undefined) {
			node._waitingParentInstanceIndex = parsedData.parentInstanceIndex;
		}

		// Animations
		if (parsedData.animations) {
			for (let animationIndex = 0; animationIndex < parsedData.animations.length; animationIndex++) {
				const parsedAnimation = parsedData.animations[animationIndex];
				const internalClass = GetClass("BABYLON.Animation");
				if (internalClass) {
					node.animations.push(internalClass.Parse(parsedAnimation));
				}
			}
			Node.ParseAnimationRanges(node, parsedData, scene);
		}

		if (parsedData.autoAnimate) {
			scene.beginAnimation(node, parsedData.autoAnimateFrom, parsedData.autoAnimateTo, parsedData.autoAnimateLoop, parsedData.autoAnimateSpeed || 1.0);
		}

		if (node.atlasJsonRelativePath) {
			node.buildFromAtlasJsonAbsolutePath(join(rootUrl, node.atlasJsonRelativePath), parsedData.spriteManager);
		} else if (parsedData.spriteManager) {
			node.buildFromImageAbsolutePath(join(rootUrl, parsedData.spriteManager.textureUrl), parsedData.spriteManager);
		}

		return node;
	}
}

Node.AddNodeConstructor("SpriteMapNode", (name, scene) => {
	return () => new SpriteManagerNode(name, scene);
});
