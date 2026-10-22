import { IPostProcessContext } from "../post-process/context";
import { IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "../post-process/pass";

import { sharpenFragmentWGSL } from "./shaders";

/**
 * Defines the sharpen post-process of the default rendering pipeline, with the same properties as Babylon.js
 * `SharpenPostProcess`.
 */
export class SharpenPostProcess {
	/**
	 * How much of the original color should be applied. Setting this to 0 will display edge detection. (default: 1)
	 */
	public colorAmount: number = 1.0;
	/**
	 * How much sharpness should be applied (default: 0.3)
	 */
	public edgeAmount: number = 0.3;

	private _pass: PostProcessPass | null = null;

	/**
	 * Returns the class name of the post-process.
	 */
	public getClassName(): string {
		return "SharpenPostProcess";
	}

	/**
	 * Renders the post-process.
	 * @param context defines the context of the rendering of the frame.
	 * @param input defines the texture to process.
	 * @param target defines the target to draw into.
	 * @returns the number of draw calls.
	 */
	public render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget): number {
		this._pass ??= new PostProcessPass(context.engine, { name: "sharpen", fragment: sharpenFragmentWGSL });

		// Same as Babylon.js: the size of the post-process is the size of its input.
		this._pass.uniforms.set("screenSize", input.width, input.height);
		this._pass.uniforms.set("sharpnessAmounts", this.edgeAmount, this.colorAmount);
		this._pass.setTexture("textureSampler", input);

		return this._pass.draw(target);
	}

	/**
	 * Disposes the resources of the post-process.
	 */
	public dispose(): void {
		this._pass?.dispose();
		this._pass = null;
	}
}
