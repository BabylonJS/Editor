import { EngineContext } from "@babylonjs/lite";

import { IPostProcessContext } from "../post-process/context";
import { IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "../post-process/pass";

import { KernelBlurPass } from "./blur";
import { bloomMergeFragmentWGSL, extractHighlightsFragmentWGSL } from "./shaders";

/**
 * Defines the bloom effect of the default rendering pipeline, with the same properties as Babylon.js `BloomEffect`:
 * the highlights of the image are extracted, blurred (at the scale of the bloom) and added to the image.
 */
export class BloomEffect {
	/**
	 * The luminance threshold to find bright areas of the image to bloom.
	 */
	public threshold: number = 0.9;
	/**
	 * The strength of the bloom.
	 */
	public weight: number;
	/**
	 * The ratio of the blur texture to the input texture that should be used to compute the bloom.
	 */
	public readonly bloomScale: number;

	/**
	 * @internal
	 * Exposure of the image processing configuration of the scene, used to extract the highlights.
	 */
	public _exposure: number = 1;

	private _engine: EngineContext;
	private _downscale: PostProcessPass | null = null;
	private _merge: PostProcessPass | null = null;
	private _blurX: KernelBlurPass;
	private _blurY: KernelBlurPass;

	/**
	 * Constructor.
	 * @param engine defines the reference to the engine of Babylon Lite.
	 * @param bloomScale defines the ratio of the blur texture to the input texture.
	 * @param bloomWeight defines the strength of the bloom.
	 * @param bloomKernel defines the size of the kernel of the blur, relative to the final output size.
	 */
	public constructor(engine: EngineContext, bloomScale: number, bloomWeight: number, bloomKernel: number) {
		this._engine = engine;

		this.bloomScale = bloomScale;
		this.weight = bloomWeight;

		this._blurX = new KernelBlurPass(engine, "horizontal blur", { x: 1, y: 0 }, 10);
		this._blurY = new KernelBlurPass(engine, "vertical blur", { x: 0, y: 1 }, 10);

		this.kernel = bloomKernel;
	}

	/**
	 * Specifies the size of the bloom blur kernel, relative to the final output size.
	 */
	public get kernel(): number {
		return this._blurX.kernel / this.bloomScale;
	}

	public set kernel(value: number) {
		this._blurX.kernel = value * this.bloomScale;
		this._blurY.kernel = value * this.bloomScale;
	}

	/**
	 * Renders the bloom, same as Babylon.js: the highlights are extracted from the input into a texture at the scale of
	 * the bloom, blurred horizontally then vertically, then the merge adds them to the input.
	 * @param context defines the context of the rendering of the frame.
	 * @param input defines the texture to process.
	 * @param target defines the target to draw into.
	 * @returns the number of draw calls.
	 */
	public render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget): number {
		const pool = context.pool;
		const format = context.textureFormat;

		// The passes of the bloom are sized by the scale of the bloom, relative to the size of the rendering.
		const width = (context.width * this.bloomScale) | 0;
		const height = (context.height * this.bloomScale) | 0;

		let draws = 0;

		// Highlights
		this._downscale ??= new PostProcessPass(this._engine, { name: "highlights", fragment: extractHighlightsFragmentWGSL });
		this._downscale.uniforms.set("threshold", Math.pow(this.threshold, 1 / 2.2));
		this._downscale.uniforms.set("exposure", this._exposure);
		this._downscale.setTexture("textureSampler", input);

		const highlights = pool.acquire(width, height, format);
		draws += this._downscale.draw(highlights);

		// Blur
		const blurX = pool.acquire(width, height, format);
		draws += this._blurX.draw(highlights, blurX);
		pool.release(highlights);

		const blurY = pool.acquire(width, height, format);
		draws += this._blurY.draw(blurX, blurY);
		pool.release(blurX);

		// Merge
		this._merge ??= new PostProcessPass(this._engine, { name: "bloomMerge", fragment: bloomMergeFragmentWGSL });
		this._merge.uniforms.set("bloomWeight", this.weight);
		this._merge.setTexture("textureSampler", input);
		this._merge.setTexture("bloomBlur", blurY);

		draws += this._merge.draw(target);
		pool.release(blurY);

		return draws;
	}

	/**
	 * Disposes the resources of the effect.
	 */
	public dispose(): void {
		this._downscale?.dispose();
		this._merge?.dispose();
		this._blurX.dispose();
		this._blurY.dispose();

		this._downscale = null;
		this._merge = null;
	}
}
