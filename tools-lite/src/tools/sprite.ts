import {
	addBillboardSprite,
	attachSpriteAnimationsToScene,
	BillboardSpriteHandle,
	BillboardSpriteInit,
	createSpriteAnimationManager,
	FacingBillboardSpriteSystem,
	isBillboardSpriteHandleAlive,
	playBillboardSpriteAnimation,
	removeBillboardSprite,
	removeSpriteAnimation,
	SceneContext,
	setBillboardSpriteFrame,
	SpriteAnimationManager,
	SpriteAtlas,
	SpriteFrameAnimation,
	TransformNode,
	updateBillboardSprite,
} from "@babylonjs/lite";

import { setClassName } from "./guards";
import { getSceneData } from "./scene";

export interface ISpriteAnimation {
	name: string;
	from: number;
	to: number;
	loop: boolean;
	delay: number;
}

export interface ISpriteMapTile {
	id: string;
	name: string;
	layer: number;
	position: { x: number; y: number };
	repeatCount: { x: number; y: number };
	repeatOffset: { x: number; y: number };
	tile: number;
}

/**
 * This interface is used to define extra properties on TransformNode. For example for SpriteMap support.
 * Babylon Lite has no sprite map: the sprite maps created in the editor are not loaded and `spriteMap` is always null.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface SpriteMapNode extends TransformNode {
	isSpriteMap?: boolean;
	spriteMap?: null;
	getClassName(): string;
}

/**
 * This interface is used to define extra properties on TransformNode. For example for SpriteManager support.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface SpriteManagerNode extends TransformNode {
	isSpriteManager?: boolean;
	spriteManager?: SpriteManager | null;
	getClassName(): string;
}

const spriteAnimationManagers = new WeakMap<SceneContext, SpriteAnimationManager>();

/**
 * Returns the sprite animation manager of the given scene, creating and attaching it the first time.
 * @param scene defines the reference to the scene.
 */
export function getSceneSpriteAnimationManager(scene: SceneContext): SpriteAnimationManager {
	let manager = spriteAnimationManagers.get(scene);
	if (!manager) {
		manager = createSpriteAnimationManager();
		attachSpriteAnimationsToScene(scene, manager);
		spriteAnimationManagers.set(scene, manager);
	}

	return manager;
}

/**
 * Defines a sprite manager created from the editor: a camera-facing billboard sprite system of Babylon Lite and its sprites.
 * Babylon Lite has no sprite manager: this class provides the subset of the Babylon.js `SpriteManager` API used by the
 * scenes and the scripts made in the editor.
 */
export class SpriteManager {
	/**
	 * Defines the name of the sprite manager.
	 */
	public name: string;
	/**
	 * Defines the metadata of the sprite manager.
	 */
	public metadata: any = null;
	/**
	 * Defines the list of sprites of the sprite manager.
	 */
	public readonly sprites: Sprite[] = [];

	/**
	 * Defines the reference to the scene the sprite manager belongs to.
	 */
	public readonly scene: SceneContext;
	/**
	 * Defines the reference to the Babylon Lite billboard sprite system.
	 */
	public readonly system: FacingBillboardSpriteSystem;
	/**
	 * Defines the reference to the sprite atlas of the sprite manager.
	 */
	public readonly atlas: SpriteAtlas;

	/**
	 * Defines the names of the frames of the atlas, used to retrieve the frames by name (`cellRef`).
	 */
	public readonly frameNames: string[];

	public constructor(name: string, scene: SceneContext, system: FacingBillboardSpriteSystem, atlas: SpriteAtlas, frameNames?: string[]) {
		this.name = name;
		this.scene = scene;
		this.system = system;
		this.atlas = atlas;
		this.frameNames = frameNames ?? [];

		getSceneData(scene).spriteManagers.push(this);
	}

	/**
	 * Returns the index of the frame that has the given name in the atlas, or -1 if not found.
	 * @param cellRef defines the name of the frame.
	 */
	public getFrameIndex(cellRef: string): number {
		return this.frameNames.indexOf(cellRef);
	}

	/**
	 * Disposes the sprite manager and all its sprites.
	 */
	public dispose(): void {
		this.sprites.slice().forEach((sprite) => sprite.dispose());
		this.system.visible = false;

		const spriteManagers = getSceneData(this.scene).spriteManagers;
		const index = spriteManagers.indexOf(this);
		if (index !== -1) {
			spriteManagers.splice(index, 1);
		}
	}
}

/**
 * Defines a sprite of a sprite manager: a billboard sprite of Babylon Lite. Babylon Lite has no sprite class: this
 * class provides the subset of the Babylon.js `Sprite` API used by the scenes and the scripts made in the editor.
 */
export class Sprite {
	/**
	 * Defines the name of the sprite.
	 */
	public name: string;
	/**
	 * Defines the unique id of the sprite.
	 */
	public uniqueId: number = 0;
	/**
	 * Defines the metadata of the sprite (its animations configured in the editor, scripts, etc.).
	 */
	public metadata: any = null;

	/**
	 * Defines the reference to the sprite manager the sprite belongs to.
	 */
	public readonly manager: SpriteManager;
	/**
	 * Defines the stable handle of the sprite in the billboard sprite system of Babylon Lite.
	 */
	public readonly handle: BillboardSpriteHandle;

	/**
	 * Defines the position of the sprite in world space. Its components can be modified in place.
	 */
	public readonly position: { x: number; y: number; z: number };

	private _width: number;
	private _height: number;
	private _angle: number;
	private _color: [number, number, number, number];
	private _invertU: boolean;
	private _invertV: boolean;
	private _isVisible: boolean;
	private _cellIndex: number;

	private _animation: SpriteFrameAnimation | null = null;

	public constructor(name: string, manager: SpriteManager, init: Partial<BillboardSpriteInit> = {}) {
		this.name = name;
		this.manager = manager;

		const position = init.position ?? [0, 0, 0];
		const size = init.sizeWorld ?? [1, 1];

		this._width = size[0];
		this._height = size[1];
		this._angle = init.rotation ?? 0;
		this._color = init.color ? [init.color[0], init.color[1], init.color[2], init.color[3]] : [1, 1, 1, 1];
		this._invertU = init.flipX ?? false;
		this._invertV = init.flipY ?? false;
		this._isVisible = init.visible ?? true;
		this._cellIndex = init.frame ?? 0;

		this.handle = addBillboardSprite(manager.system, {
			position: [position[0], position[1], position[2]],
			sizeWorld: [this._width, this._height],
			frame: this._cellIndex,
			rotation: this._angle,
			color: this._color,
			flipX: this._invertU,
			flipY: this._invertV,
			visible: this._isVisible,
		});

		let x = position[0];
		let y = position[1];
		let z = position[2];

		const update = () => this._update({ position: [x, y, z] });

		this.position = {
			get x() {
				return x;
			},
			set x(value: number) {
				x = value;
				update();
			},
			get y() {
				return y;
			},
			set y(value: number) {
				y = value;
				update();
			},
			get z() {
				return z;
			},
			set z(value: number) {
				z = value;
				update();
			},
		};

		manager.sprites.push(this);
		setClassName(this, "Sprite");
	}

	private _update(patch: Partial<BillboardSpriteInit>): void {
		if (isBillboardSpriteHandleAlive(this.handle)) {
			updateBillboardSprite(this.handle, patch);
		}
	}

	/**
	 * Gets the width of the sprite in world units.
	 */
	public get width(): number {
		return this._width;
	}

	/**
	 * Sets the width of the sprite in world units.
	 */
	public set width(value: number) {
		this._width = value;
		this._update({ sizeWorld: [this._width, this._height] });
	}

	/**
	 * Gets the height of the sprite in world units.
	 */
	public get height(): number {
		return this._height;
	}

	/**
	 * Sets the height of the sprite in world units.
	 */
	public set height(value: number) {
		this._height = value;
		this._update({ sizeWorld: [this._width, this._height] });
	}

	/**
	 * Gets the size of the sprite (the width) in world units.
	 */
	public get size(): number {
		return this._width;
	}

	/**
	 * Sets the size of the sprite (both width and height) in world units.
	 */
	public set size(value: number) {
		this._width = value;
		this._height = value;
		this._update({ sizeWorld: [value, value] });
	}

	/**
	 * Gets the rotation angle of the sprite in radians.
	 */
	public get angle(): number {
		return this._angle;
	}

	/**
	 * Sets the rotation angle of the sprite in radians.
	 */
	public set angle(value: number) {
		this._angle = value;
		this._update({ rotation: value });
	}

	/**
	 * Gets the color of the sprite (RGBA).
	 */
	public get color(): [number, number, number, number] {
		return this._color;
	}

	/**
	 * Sets the color of the sprite (RGBA).
	 */
	public set color(value: [number, number, number, number]) {
		this._color = [value[0], value[1], value[2], value[3] ?? 1];
		this._update({ color: this._color });
	}

	/**
	 * Gets wether or not the sprite is flipped horizontally.
	 */
	public get invertU(): boolean {
		return this._invertU;
	}

	/**
	 * Sets wether or not the sprite is flipped horizontally.
	 */
	public set invertU(value: boolean) {
		this._invertU = value;
		this._update({ flipX: value });
	}

	/**
	 * Gets wether or not the sprite is flipped vertically.
	 */
	public get invertV(): boolean {
		return this._invertV;
	}

	/**
	 * Sets wether or not the sprite is flipped vertically.
	 */
	public set invertV(value: boolean) {
		this._invertV = value;
		this._update({ flipY: value });
	}

	/**
	 * Gets wether or not the sprite is visible.
	 */
	public get isVisible(): boolean {
		return this._isVisible;
	}

	/**
	 * Sets wether or not the sprite is visible.
	 */
	public set isVisible(value: boolean) {
		this._isVisible = value;
		this._update({ visible: value });
	}

	/**
	 * Gets the index of the frame of the atlas displayed by the sprite.
	 */
	public get cellIndex(): number {
		return this._cellIndex;
	}

	/**
	 * Sets the index of the frame of the atlas displayed by the sprite.
	 */
	public set cellIndex(value: number) {
		this._cellIndex = value;
		if (isBillboardSpriteHandleAlive(this.handle)) {
			setBillboardSpriteFrame(this.handle, value);
		}
	}

	/**
	 * Gets the name of the frame of the atlas displayed by the sprite.
	 */
	public get cellRef(): string {
		return this.manager.frameNames[this._cellIndex] ?? "";
	}

	/**
	 * Sets the frame of the atlas displayed by the sprite by its name.
	 */
	public set cellRef(value: string) {
		const index = this.manager.getFrameIndex(value);
		if (index !== -1) {
			this.cellIndex = index;
		}
	}

	/**
	 * Plays the frames of the atlas from `from` to `to`.
	 * @param from defines the first frame of the animation.
	 * @param to defines the last frame of the animation.
	 * @param loop defines wether or not the animation loops.
	 * @param delay defines the delay between two frames in milliseconds.
	 * @param onAnimationEnd defines an optional callback called when the animation ends.
	 */
	public playAnimation(from: number, to: number, loop: boolean, delay: number, onAnimationEnd?: () => void): void {
		this.stopAnimation();

		this._animation = playBillboardSpriteAnimation(getSceneSpriteAnimationManager(this.manager.scene), this.handle, from, to, loop, delay, {
			onEnd: () => {
				this._animation = null;
				onAnimationEnd?.();
			},
		});
	}

	/**
	 * Stops the animation of the sprite.
	 */
	public stopAnimation(): void {
		if (this._animation) {
			removeSpriteAnimation(getSceneSpriteAnimationManager(this.manager.scene), this._animation);
			this._animation = null;
		}
	}

	/**
	 * Disposes the sprite: it is removed from its sprite manager.
	 */
	public dispose(): void {
		this.stopAnimation();
		removeBillboardSprite(this.handle);

		const index = this.manager.sprites.indexOf(this);
		if (index !== -1) {
			this.manager.sprites.splice(index, 1);
		}
	}

	public getClassName(): string {
		return "Sprite";
	}
}

export function normalizeAtlasJson(data: any) {
	if (!Array.isArray(data.frames)) {
		const frames: any[] = [];

		for (const key of Object.keys(data.frames)) {
			frames.push({
				filename: key,
				...data.frames[key],
			});
		}

		data.frames = frames;
	}
}

/**
 * Plays a sprite animation previously setup in the editor indentified by its name.
 * @param sprite defines the reference to the sprite to animate.
 * @param animationName defines the name of the animation to play previously setup in the editor.
 * @param onAnimationEnd defines an optional callback to be called when the animation ends.
 */
export function playSpriteAnimationFromName(sprite: Sprite, animationName: string, onAnimationEnd?: () => void) {
	const spriteAnimations = (sprite.metadata?.spriteAnimations ?? []) as ISpriteAnimation[];
	const animation = spriteAnimations.find((a) => a.name === animationName);

	if (!animation) {
		return console.error(`Animation with name "${animationName}" not found on sprite.`);
	}

	sprite.playAnimation(animation.from, animation.to, animation.loop, animation.delay, onAnimationEnd);
}
