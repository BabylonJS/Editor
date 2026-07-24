import { dirname, join } from "path/posix";

import {
	Scene,
	TransformNode,
	Tools,
	SerializationHelper,
	GetClass,
	Matrix,
	Node,
	CreateSoundAsync,
	StaticSound,
	serialize,
	IStaticSoundStopOptions,
	IStaticSoundPlayOptions,
} from "babylonjs";

import { projectConfiguration } from "../../project/configuration";

import { UniqueNumber } from "../../tools/tools";

export class SoundNode extends TransformNode {
	/**
	 * Defines the reference to the sound associated with this node.
	 */
	public sound: StaticSound | null = null;

	@serialize()
	public soundRelativePath: string | null = null;

	@serialize()
	public autoUpdateSpatial: boolean = true;

	private _volume: number = 1;
	private _spatial: boolean = true;
	private _maxDistance: number = 1000;
	private _distanceModel: DistanceModelType = "linear";
	private _panningModel: PanningModelType = "equalpower";

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

	public async setSoundAbsolutePath(absolutePath: string): Promise<void> {
		if (!projectConfiguration.path) {
			return;
		}

		this.disposeSound();

		this.soundRelativePath = absolutePath.replace(join(dirname(projectConfiguration.path), "/"), "");

		this.sound = await CreateSoundAsync(this.soundRelativePath, absolutePath, {
			spatialAutoUpdate: true,
		});

		this.sound.volume = this._volume;
		this.sound._isSpatial = this._spatial;

		if (this.sound.spatial) {
			this.sound.spatial.attach(this);
			this.sound.spatial.maxDistance = this._maxDistance;
			this.sound.spatial.panningModel = this._panningModel;
			this.sound.spatial.distanceModel = this._distanceModel;
		}
	}

	@serialize()
	public get volume(): number {
		return this._volume;
	}

	public set volume(value: number) {
		if (value === this._volume) {
			return;
		}

		this._volume = value;

		if (this.sound) {
			this.sound.volume = value;
		}
	}

	@serialize()
	public get isSpatial(): boolean {
		return this._spatial;
	}

	public set isSpatial(value: boolean) {
		if (value === this._spatial) {
			return;
		}

		this._spatial = value;

		if (this.sound) {
			this.sound._isSpatial = value;

			if (value && this.sound.spatial) {
				this.sound.spatial.attach(this);
				this.sound.spatial.maxDistance = this._maxDistance;
				this.sound.spatial.distanceModel = this._distanceModel;
			}
		}
	}

	@serialize()
	public get maxDistance(): number {
		return this._maxDistance;
	}

	public set maxDistance(value: number) {
		if (value === this._maxDistance) {
			return;
		}

		this._maxDistance = value;

		if (this.sound && this.sound.spatial) {
			this.sound.spatial.maxDistance = value;
		}
	}

	@serialize()
	public get panningModel(): PanningModelType {
		return this._panningModel;
	}

	public set panningModel(value: PanningModelType) {
		if (value === this._panningModel) {
			return;
		}

		this._panningModel = value;

		if (this.sound && this.sound.spatial) {
			this.sound.spatial.panningModel = value;
		}
	}

	@serialize()
	public get distanceModel(): DistanceModelType {
		return this._distanceModel;
	}

	public set distanceModel(value: DistanceModelType) {
		if (value === this._distanceModel) {
			return;
		}

		this._distanceModel = value;

		if (this.sound && this.sound.spatial) {
			this.sound.spatial.distanceModel = value;
		}
	}

	public play(options?: Partial<IStaticSoundPlayOptions>): void {
		this.sound?.play(options);
	}

	public stop(options?: Partial<IStaticSoundStopOptions>): void {
		this.sound?.stop(options);
	}

	public disposeSound(): void {
		this.sound?.dispose();
		this.sound = null;

		this.soundRelativePath = null;
	}

	/**
	 * Releases resources associated with this scene link.
	 */
	public dispose(): void {
		this.disposeSound();
		super.dispose(false, true);
	}

	public clone(name: string): SoundNode {
		return SerializationHelper.Clone(() => new SoundNode(name, this.getScene()), this);
	}

	/**
	 * Gets the current object class name.
	 * @return the class name
	 */
	public getClassName(): string {
		return "SoundNode";
	}

	public serialize(): any {
		return super.serialize({
			isSoundNode: true,
		});
	}

	public static Parse(parsedData: any, scene: Scene, rootUrl: string): SoundNode {
		const node = SerializationHelper.Parse(() => new SoundNode(parsedData.name, scene), parsedData, scene, rootUrl);

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

		if (node.soundRelativePath) {
			node.setSoundAbsolutePath(join(rootUrl, node.soundRelativePath));
		}

		return node;
	}
}

Node.AddNodeConstructor("SoundNode", (name, scene) => {
	return () => new SoundNode(name, scene);
});
