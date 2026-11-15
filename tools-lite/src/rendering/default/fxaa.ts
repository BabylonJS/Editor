import { IPostProcessContext } from "../post-process/context";
import { IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "../post-process/pass";

import { fxaaFragmentWGSL, fxaaVertexWGSL } from "./shaders";

/**
 * Defines the FXAA post-process of the default rendering pipeline, same as Babylon.js `FxaaPostProcess`.
 */
export class FxaaPostProcess {
	private _pass: PostProcessPass | null = null;

	/**
	 * Returns the class name of the post-process.
	 */
	public getClassName(): string {
		return "FxaaPostProcess";
	}

	/**
	 * Renders the post-process.
	 * @param context defines the context of the rendering of the frame.
	 * @param input defines the texture to process.
	 * @param target defines the target to draw into.
	 * @returns the number of draw calls.
	 */
	public render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget): number {
		this._pass ??= new PostProcessPass(context.engine, { name: "fxaa", vertex: fxaaVertexWGSL, fragment: fxaaFragmentWGSL });

		// Same as Babylon.js: the texel size of the post-process is the one of its input.
		this._pass.uniforms.set("texelSize", 1 / input.width, 1 / input.height);
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
