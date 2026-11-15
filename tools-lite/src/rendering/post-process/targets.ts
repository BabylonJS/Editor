import { EngineContext } from "@babylonjs/lite";

import { _getDevice, IPostProcessTarget } from "./pass";

/**
 * Defines a texture of the pool of the post-processes, used as target by a pass and read by the next ones.
 */
export interface IPostProcessPooledTarget extends IPostProcessTarget {
	readonly texture: GPUTexture;
}

interface IPoolEntry {
	target: IPostProcessPooledTarget;
	inUse: boolean;
	lastUsedFrame: number;
}

/**
 * Defines the pool of the textures the passes of the post-processes draw into. The textures are acquired by the passes
 * drawing into them and released once read by the passes using them, so they are shared by the passes of a frame the
 * same way Babylon.js shares the textures of the post-processes of a camera.
 */
export class PostProcessTargetPool {
	private _engine: EngineContext;
	private _entries: IPoolEntry[] = [];
	private _frame: number = 0;

	/**
	 * Constructor.
	 * @param engine defines the reference to the engine of Babylon Lite.
	 */
	public constructor(engine: EngineContext) {
		this._engine = engine;
	}

	/**
	 * Returns a texture of the given size and format, not used by another pass until released.
	 * @param width defines the width of the texture in pixels.
	 * @param height defines the height of the texture in pixels.
	 * @param format defines the format of the texture.
	 */
	public acquire(width: number, height: number, format: GPUTextureFormat): IPostProcessPooledTarget {
		width = Math.max(1, width);
		height = Math.max(1, height);

		let entry = this._entries.find((e) => !e.inUse && e.target.width === width && e.target.height === height && e.target.format === format);
		if (!entry) {
			const device = _getDevice(this._engine);
			const texture = device.createTexture({
				label: `editor-post-process-${width}x${height}-${format}`,
				size: { width, height },
				format,
				usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
			});

			entry = {
				target: { texture, view: texture.createView(), width, height, format },
				inUse: false,
				lastUsedFrame: 0,
			};

			this._entries.push(entry);
		}

		entry.inUse = true;
		entry.lastUsedFrame = this._frame;

		return entry.target;
	}

	/**
	 * Releases the given texture: the next passes can draw into it.
	 * @param target defines the texture to release.
	 */
	public release(target: IPostProcessTarget | null | undefined): void {
		const entry = target ? this._entries.find((e) => e.target === target) : null;
		if (entry) {
			entry.inUse = false;
		}
	}

	/**
	 * Ends the frame: every texture is released and the textures unused for a while are destroyed.
	 */
	public endFrame(): void {
		++this._frame;

		this._entries = this._entries.filter((entry) => {
			entry.inUse = false;

			if (this._frame - entry.lastUsedFrame > 120) {
				entry.target.texture.destroy();
				return false;
			}

			return true;
		});
	}

	/**
	 * Destroys all the textures of the pool.
	 */
	public dispose(): void {
		this._entries.forEach((entry) => entry.target.texture.destroy());
		this._entries = [];
	}
}
