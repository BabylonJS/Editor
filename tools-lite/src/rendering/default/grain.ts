import { IPostProcessContext } from "../post-process/context";
import { IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "../post-process/pass";

import { grainFragmentWGSL } from "./shaders";

/**
 * Defines the grain post-process of the default rendering pipeline, with the same properties as Babylon.js
 * `GrainPostProcess`.
 */
export class GrainPostProcess {
	/**
	 * The intensity of the grain added (default: 30)
	 */
	public intensity: number = 30;
	/**
	 * If the grain should be randomized on every frame
	 */
	public animated: boolean = false;

	private _pass: PostProcessPass | null = null;

	/**
	 * Returns the class name of the post-process.
	 */
	public getClassName(): string {
		return "GrainPostProcess";
	}

	/**
	 * Renders the post-process.
	 * @param context defines the context of the rendering of the frame.
	 * @param input defines the texture to process.
	 * @param target defines the target to draw into.
	 * @returns the number of draw calls.
	 */
	public render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget): number {
		this._pass ??= new PostProcessPass(context.engine, { name: "grain", fragment: grainFragmentWGSL });

		this._pass.uniforms.set("intensity", this.intensity);
		this._pass.uniforms.set("animatedSeed", this.animated ? Math.random() + 1 : 1);
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
