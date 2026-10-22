import { IPostProcessContext } from "../post-process/context";
import { IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "../post-process/pass";

import { chromaticAberrationFragmentWGSL } from "./shaders";

/**
 * Defines the chromatic aberration post-process of the default rendering pipeline, with the same properties as
 * Babylon.js `ChromaticAberrationPostProcess`.
 */
export class ChromaticAberrationPostProcess {
	/**
	 * The amount of separation of rgb channels (default: 30)
	 */
	public aberrationAmount: number = 30;
	/**
	 * The amount the effect will increase for pixels closer to the edge of the screen. (default: 0)
	 */
	public radialIntensity: number = 0;
	/**
	 * The normalized direction in which the rgb channels should be separated. If set to 0,0 radial direction will be used. (default: Vector2(0.707,0.707))
	 */
	public direction: { x: number; y: number } = { x: 0.707, y: 0.707 };
	/**
	 * The center position where the radialIntensity should be around. [0.5,0.5 is center of screen, 1,1 is top right corner] (default: Vector2(0.5 ,0.5))
	 */
	public centerPosition: { x: number; y: number } = { x: 0.5, y: 0.5 };
	/**
	 * The width of the screen to apply the effect on.
	 */
	public screenWidth: number;
	/**
	 * The height of the screen to apply the effect on.
	 */
	public screenHeight: number;

	private _pass: PostProcessPass | null = null;

	/**
	 * Constructor.
	 * @param screenWidth defines the width of the screen to apply the effect on.
	 * @param screenHeight defines the height of the screen to apply the effect on.
	 */
	public constructor(screenWidth: number, screenHeight: number) {
		this.screenWidth = screenWidth;
		this.screenHeight = screenHeight;
	}

	/**
	 * Returns the class name of the post-process.
	 */
	public getClassName(): string {
		return "ChromaticAberrationPostProcess";
	}

	/**
	 * Renders the post-process.
	 * @param context defines the context of the rendering of the frame.
	 * @param input defines the texture to process.
	 * @param target defines the target to draw into.
	 * @returns the number of draw calls.
	 */
	public render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget): number {
		this._pass ??= new PostProcessPass(context.engine, { name: "chromaticAberration", fragment: chromaticAberrationFragmentWGSL });

		const uniforms = this._pass.uniforms;
		uniforms.set("chromatic_aberration", this.aberrationAmount);
		uniforms.set("screen_width", this.screenWidth);
		uniforms.set("screen_height", this.screenHeight);
		uniforms.set("radialIntensity", this.radialIntensity);
		uniforms.set("direction", this.direction.x, this.direction.y);
		uniforms.set("centerPosition", this.centerPosition.x, this.centerPosition.y);

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
