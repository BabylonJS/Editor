import { EngineContext } from "@babylonjs/lite";

import { IPostProcessContext } from "../post-process/context";
import { IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "../post-process/pass";

import { KernelBlurPass } from "./blur";
import { circleOfConfusionFragmentWGSL, depthOfFieldMergeFragmentWGSL } from "./shaders";

/**
 * Specifies the level of max blur that should be applied when using the depth of field effect, same as Babylon.js
 * `DepthOfFieldEffectBlurLevel`.
 */
export enum DepthOfFieldEffectBlurLevel {
	/**
	 * Subtle blur
	 */
	Low = 0,
	/**
	 * Medium blur
	 */
	Medium = 1,
	/**
	 * Large blur
	 */
	High = 2,
}

interface IDepthOfFieldBlurStep {
	blurY: KernelBlurPass;
	ratioY: number;
	blurX: KernelBlurPass;
	ratioX: number;
}

/**
 * Defines the depth of field effect of the default rendering pipeline, with the same properties as Babylon.js
 * `DepthOfFieldEffect`: the circle of confusion is computed from the depth of the scene (depth renderer), the image is
 * blurred in a pyramid of textures weighted by the circle of confusion, then merged with the original image.
 */
export class DepthOfFieldEffect {
	/**
	 * Max lens size in scene units/1000 (eg. millimeter). Standard cameras are 50mm. (default: 50) The diameter of the resulting aperture can be computed by lensSize/fStop.
	 */
	public lensSize: number = 50;
	/**
	 * F-Stop of the effect's camera. The diameter of the resulting aperture can be computed by lensSize/fStop. (default: 1.4)
	 */
	public fStop: number = 1.4;
	/**
	 * Distance away from the camera to focus on in scene units/1000 (eg. millimeter). (default: 2000)
	 */
	public focusDistance: number = 2000;
	/**
	 * Focal length of the effect's camera in scene units/1000 (eg. millimeter). (default: 50)
	 */
	public focalLength: number = 50;

	/**
	 * Defines the blur level of the effect.
	 */
	public readonly blurLevel: DepthOfFieldEffectBlurLevel;

	private _engine: EngineContext;
	private _circleOfConfusion: PostProcessPass | null = null;
	private _merge: PostProcessPass | null = null;
	private _steps: IDepthOfFieldBlurStep[] = [];

	/**
	 * Constructor.
	 * @param engine defines the reference to the engine of Babylon Lite.
	 * @param blurLevel defines the blur level of the effect.
	 */
	public constructor(engine: EngineContext, blurLevel: DepthOfFieldEffectBlurLevel = DepthOfFieldEffectBlurLevel.Low) {
		this._engine = engine;
		this.blurLevel = blurLevel;

		// Same as Babylon.js "ThinDepthOfFieldEffect".
		let blurCount: number;
		let kernelSize: number;
		switch (blurLevel) {
			case DepthOfFieldEffectBlurLevel.High:
				blurCount = 3;
				kernelSize = 51;
				break;
			case DepthOfFieldEffectBlurLevel.Medium:
				blurCount = 2;
				kernelSize = 31;
				break;
			default:
				kernelSize = 15;
				blurCount = 1;
				break;
		}

		const adjustedKernelSize = kernelSize / Math.pow(2, blurCount - 1);

		let ratio = 1.0;
		for (let i = 0; i < blurCount; i++) {
			const ratioY = ratio;
			const blurY = new KernelBlurPass(engine, "vertical blur", { x: 0, y: 1 }, adjustedKernelSize, true);

			ratio = 0.75 / Math.pow(2, i);
			const blurX = new KernelBlurPass(engine, "horizontal blur", { x: 1, y: 0 }, adjustedKernelSize, true);

			this._steps.push({ blurY, ratioY, blurX, ratioX: ratio });
		}
	}

	/**
	 * Returns the class name of the effect.
	 */
	public getClassName(): string {
		return "DepthOfFieldEffect";
	}

	/**
	 * Renders the depth of field.
	 * @param context defines the context of the rendering of the frame.
	 * @param input defines the texture to process.
	 * @param target defines the target to draw into.
	 * @returns the number of draw calls.
	 */
	public render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget): number {
		const depth = context.geometry.depthRenderer;
		if (!depth) {
			return 0;
		}

		const pool = context.pool;
		const format = context.textureFormat;
		const camera = context.camera;

		const size = (ratio: number) => ({ width: (context.width * ratio) | 0, height: (context.height * ratio) | 0 });

		let draws = 0;

		// Circle of confusion (same as Babylon.js "ThinCircleOfConfusionPostProcess.bind"), rendered into the input of the
		// first blur: a texture with a red channel only.
		this._circleOfConfusion ??= new PostProcessPass(this._engine, { name: "circleOfConfusion", fragment: circleOfConfusionFragmentWGSL });

		const aperture = this.lensSize / this.fStop;
		const cocPrecalculation = (aperture * this.focalLength) / (this.focusDistance - this.focalLength);

		const uniforms = this._circleOfConfusion.uniforms;
		uniforms.set("cameraMinMaxZ", camera.nearPlane, camera.farPlane - camera.nearPlane);
		uniforms.set("focusDistance", this.focusDistance);
		uniforms.set("cocPrecalculation", cocPrecalculation);

		this._circleOfConfusion.setTexture("depthSampler", depth);

		const cocSize = size(this._steps[0].ratioY);
		const circleOfConfusion = pool.acquire(cocSize.width, cocSize.height, format === "rgba16float" ? "r16float" : "r32float");
		draws += this._circleOfConfusion.draw(circleOfConfusion);

		// Pyramid of blurred images. The first vertical blur blurs the input, weighted by the circle of confusion.
		const outputs: IPostProcessTarget[] = [];

		let current: IPostProcessTexture = input;
		this._steps.forEach((step, index) => {
			const ySize = size(step.ratioX);
			const blurredY = pool.acquire(ySize.width, ySize.height, format);
			// The outputs of the horizontal blurs are released after the merge, which reads them all.
			draws += step.blurY.draw(current, blurredY, circleOfConfusion);

			// The horizontal blur renders into the input of the next pass: the vertical blur of the next step, or the merge.
			const next = this._steps[index + 1];
			const xSize = size(next ? next.ratioY : step.ratioX);
			const blurredX = pool.acquire(xSize.width, xSize.height, format);
			draws += step.blurX.draw(blurredY, blurredX, circleOfConfusion);
			pool.release(blurredY);

			outputs.push(blurredX);
			current = blurredX;
		});

		// Merge
		const blurLevel = this._steps.length - 1;
		if (!this._merge) {
			this._merge = new PostProcessPass(this._engine, { name: "dofMerge", fragment: depthOfFieldMergeFragmentWGSL }, { defines: { BLUR_LEVEL: blurLevel } });
		}

		this._merge.setTexture("textureSampler", input);
		this._merge.setTexture("circleOfConfusionSampler", circleOfConfusion);
		outputs.forEach((output, index) => {
			this._merge!.setTexture(`blurStep${outputs.length - index - 1}`, output);
		});

		draws += this._merge.draw(target);

		pool.release(circleOfConfusion);
		outputs.forEach((output) => pool.release(output));

		return draws;
	}

	/**
	 * Disposes the resources of the effect.
	 */
	public dispose(): void {
		this._circleOfConfusion?.dispose();
		this._merge?.dispose();
		this._steps.forEach((step) => {
			step.blurX.dispose();
			step.blurY.dispose();
		});

		this._circleOfConfusion = null;
		this._merge = null;
	}
}
