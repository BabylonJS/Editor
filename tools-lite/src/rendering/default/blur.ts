import { EngineContext } from "@babylonjs/lite";

import { _getDevice, IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "../post-process/pass";

import { kernelBlurFragmentShaderWGSL, kernelBlurVertexShaderWGSL } from "./shaders";

/**
 * Same as Babylon.js `ThinBlurPostProcess._glslFloat`: the offsets and the weights of the kernel are written in the
 * shader with 8 decimals.
 */
function glslFloat(x: number, decimalFigures: number = 8): string {
	return x.toFixed(decimalFigures).replace(/0+$/, "");
}

/**
 * Same as Babylon.js `ThinBlurPostProcess._gaussianWeight`.
 */
function gaussianWeight(x: number): number {
	const sigma = 1 / 3;
	const denominator = Math.sqrt(2.0 * Math.PI) * sigma;
	const exponent = -((x * x) / (2.0 * sigma * sigma));
	return (1.0 / denominator) * Math.exp(exponent);
}

/**
 * Same as Babylon.js `ThinBlurPostProcess._nearestBestKernel`.
 */
export function _nearestBestKernel(idealKernel: number): number {
	const v = Math.round(idealKernel);
	for (const k of [v, v - 1, v + 1, v - 2, v + 2]) {
		if (k % 2 !== 0 && Math.floor(k / 2) % 2 === 0 && k > 0) {
			return Math.max(k, 3);
		}
	}

	return Math.max(v, 3);
}

/**
 * Computes the defines and the index parameters of the kernel blur shader of Babylon.js for the given kernel, same as
 * Babylon.js `ThinBlurPostProcess._updateParameters`.
 * @param kernel defines the size of the kernel (see `_nearestBestKernel`).
 * @param maxVaryingVectors defines the maximum number of varyings of the device (`maxInterStageShaderVariables`).
 * @param dof defines wether or not the blur is a blur of the depth of field.
 * @param packedFloat defines wether or not the blurred texture stores packed floats.
 * @internal
 */
export function _getKernelBlurParameters(
	kernel: number,
	maxVaryingVectors: number,
	dof: boolean,
	packedFloat: boolean = false
): { defines: Record<string, string | number | boolean>; indexParameters: Record<string, number> } {
	const n = kernel;
	const centerIndex = (n - 1) / 2;

	let offsets: number[] = [];
	let weights: number[] = [];
	let totalWeight = 0;

	for (let i = 0; i < n; i++) {
		const u = i / (n - 1);
		const w = gaussianWeight(u * 2.0 - 1);
		offsets[i] = i - centerIndex;
		weights[i] = w;
		totalWeight += w;
	}

	for (let i = 0; i < weights.length; i++) {
		weights[i] /= totalWeight;
	}

	// Combines the samples to take advantage of the linear sampling of the hardware.
	const linearSamplingMap: { o: number; w: number }[] = [];
	for (let i = 0; i <= centerIndex; i += 2) {
		const j = Math.min(i + 1, Math.floor(centerIndex));
		const singleCenterSample = i === j;

		if (singleCenterSample) {
			linearSamplingMap.push({ o: offsets[i], w: weights[i] });
		} else {
			const sharedCell = j === centerIndex;
			const weightLinear = weights[i] + weights[j] * (sharedCell ? 0.5 : 1);
			const offsetLinear = offsets[i] + 1 / (1 + weights[i] / weights[j]);

			if (offsetLinear === 0) {
				linearSamplingMap.push({ o: offsets[i], w: weights[i] });
				linearSamplingMap.push({ o: offsets[i + 1], w: weights[i + 1] });
			} else {
				linearSamplingMap.push({ o: offsetLinear, w: weightLinear });
				linearSamplingMap.push({ o: -offsetLinear, w: weightLinear });
			}
		}
	}

	offsets = linearSamplingMap.map((sample) => sample.o);
	weights = linearSamplingMap.map((sample) => sample.w);

	// WGSL: one varying row is used by the builtins.
	const maxVaryingRows = maxVaryingVectors - 1;
	const freeVaryingVec2 = Math.max(maxVaryingRows, 0) - 1;

	let varyingCount = Math.min(offsets.length, freeVaryingVec2);

	const defines: Record<string, string | number | boolean> = {};
	if (dof) {
		defines.DOF = 1;
		defines.CENTER_WEIGHT = glslFloat(weights[varyingCount - 1]);
		varyingCount--;
	}

	for (let i = 0; i < varyingCount; i++) {
		defines[`KERNEL_OFFSET${i}`] = glslFloat(offsets[i]);
		defines[`KERNEL_WEIGHT${i}`] = glslFloat(weights[i]);
	}

	let depCount = 0;
	for (let i = freeVaryingVec2; i < offsets.length; i++) {
		defines[`KERNEL_DEP_OFFSET${depCount}`] = glslFloat(offsets[i]);
		defines[`KERNEL_DEP_WEIGHT${depCount}`] = glslFloat(weights[i]);
		depCount++;
	}

	if (packedFloat) {
		defines.PACKEDFLOAT = 1;
	}

	return { defines, indexParameters: { varyingCount, depCount } };
}

/**
 * Defines a blur pass of the post-processes, same as Babylon.js `BlurPostProcess` (gaussian kernel combined to use the
 * linear sampling of the hardware).
 */
export class KernelBlurPass {
	/**
	 * Defines the direction of the blur, in texels.
	 */
	public readonly direction: { x: number; y: number };

	private _engine: EngineContext;
	private _name: string;
	private _dof: boolean;

	private _idealKernel: number = 0;
	private _kernel: number = 0;
	private _pass: PostProcessPass | null = null;

	/**
	 * Constructor.
	 * @param engine defines the reference to the engine of Babylon Lite.
	 * @param name defines the name of the pass.
	 * @param direction defines the direction of the blur.
	 * @param kernel defines the ideal size of the kernel.
	 * @param dof defines wether or not the blur is a blur of the depth of field (weighted by the circle of confusion).
	 */
	public constructor(engine: EngineContext, name: string, direction: { x: number; y: number }, kernel: number, dof: boolean = false) {
		this._engine = engine;
		this._name = name;
		this._dof = dof;

		this.direction = direction;
		this.kernel = kernel;
	}

	/**
	 * Gets the ideal size of the kernel.
	 */
	public get kernel(): number {
		return this._idealKernel;
	}

	/**
	 * Sets the ideal size of the kernel: the shader uses the nearest best size (see `_nearestBestKernel`).
	 */
	public set kernel(value: number) {
		if (this._idealKernel === value) {
			return;
		}

		value = Math.max(value, 1);
		this._idealKernel = value;

		const kernel = _nearestBestKernel(value);
		if (kernel !== this._kernel) {
			this._kernel = kernel;

			this._pass?.dispose();
			this._pass = null;
		}
	}

	/**
	 * Draws the blur into the given target.
	 * @param input defines the texture to blur.
	 * @param target defines the target to draw into. Same as Babylon.js, the offsets of the samples are computed from the
	 * size of the target.
	 * @param circleOfConfusion defines the circle of confusion weighting the samples (depth of field only).
	 * @returns the number of draw calls.
	 */
	public draw(input: IPostProcessTexture, target: IPostProcessTarget, circleOfConfusion?: IPostProcessTexture): number {
		if (!this._pass) {
			const maxVaryingVectors = _getDevice(this._engine).limits.maxInterStageShaderVariables;
			const { defines, indexParameters } = _getKernelBlurParameters(this._kernel, maxVaryingVectors, this._dof);

			this._pass = new PostProcessPass(
				this._engine,
				{ name: this._name, vertex: kernelBlurVertexShaderWGSL, fragment: kernelBlurFragmentShaderWGSL },
				{ defines, indexParameters }
			);
		}

		this._pass.uniforms.set("delta", (1 / target.width) * this.direction.x, (1 / target.height) * this.direction.y);
		this._pass.setTexture("textureSampler", input);

		if (this._dof && circleOfConfusion) {
			this._pass.setTexture("circleOfConfusionSampler", circleOfConfusion);
		}

		return this._pass.draw(target);
	}

	/**
	 * Disposes the resources of the pass.
	 */
	public dispose(): void {
		this._pass?.dispose();
		this._pass = null;
	}
}
