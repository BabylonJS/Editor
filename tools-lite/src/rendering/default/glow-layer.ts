import { Camera, Material, Mesh, SceneContext, Texture2D } from "@babylonjs/lite";

import { warnOnce } from "../../tools/warn";
import { loadSerializedTexture } from "../../loading/texture";
import { _getSerializedMaterialRootUrl } from "../../loading/material";

import { _registerSceneLayer, _unregisterSceneLayer } from "../pipeline";
import { IPostProcessContext, IPostProcessSceneLayer } from "../post-process/context";
import { _getDevice, IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "../post-process/pass";
import { _getBabylonProjectionMatrix, _getBabylonViewMatrix, _getCameraAspectRatio, _multiplyMatrices } from "../post-process/matrix";
import { IMeshPassDraw, MeshPassRenderer, _sortMeshPassDraws } from "../post-process/mesh-pass";
import { _getMeshPassMaterial, _getSerializedTextureMatrix, _isSerializedPbrMaterial, _isSerializedStandardMaterial } from "../post-process/mesh-materials";

import { KernelBlurPass } from "./blur";
import { glowMapMergeFragmentWGSL } from "./shaders";

/**
 * Defines a color with an alpha channel, same as Babylon.js `Color4`.
 */
export interface IGlowLayerColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

/**
 * Glow layer options. This helps customizing the behaviour of the glow layer, same as Babylon.js `IGlowLayerOptions`.
 */
export interface IGlowLayerOptions {
	/**
	 * Multiplication factor apply to the canvas size to compute the render target size used to generated the glowing
	 * objects (the smaller the faster). Default: 0.5
	 */
	mainTextureRatio: number;
	/**
	 * Enforces a fixed size texture to ensure resize independent blur. Default: undefined
	 */
	mainTextureFixedSize?: number;
	/**
	 * How big is the kernel of the blur texture. Default: 32
	 */
	blurKernelSize: number;
	/**
	 * The camera attached to the layer. Default: null
	 */
	camera: Camera | null;
	/**
	 * Enable MSAA by choosing the number of samples. Default: 1 (only 1 sample is supported)
	 */
	mainTextureSamples?: number;
	/**
	 * The rendering group to draw the layer in. Default: -1 (all the meshes)
	 */
	renderingGroupId: number;
	/**
	 * Forces the merge step to be done in ldr (clamp values > 1). Default: false
	 */
	ldrMerge?: boolean;
	/**
	 * Defines the blend mode used by the merge. Default: ALPHA_ADD (1). ALPHA_COMBINE (2) is supported too.
	 */
	alphaBlendingMode?: number;
	/**
	 * The type of the main texture. Default: TEXTURETYPE_UNSIGNED_BYTE (0)
	 */
	mainTextureType: number;
	/**
	 * Whether or not to generate a stencil buffer. Default: false
	 */
	generateStencilBuffer?: boolean;
	/**
	 * Specifies whether or not to exclude the meshes by default (only the meshes included using `addIncludedOnlyMesh` glow).
	 * Default: false
	 */
	excludeByDefault?: boolean;
}

/**
 * The glow layer helps adding a glowing effect around the emissive parts of a mesh, same as Babylon.js `GlowLayer`
 * (enabled by the default rendering pipeline using `glowLayerEnabled`). It is rendered by the frame graph tasks of the
 * tools for the scenes created using `createEditorSceneContext`, the same way Babylon.js renders it:
 * - the meshes are drawn into the main texture with the color of their glow (emissive color and texture),
 * - the main texture is blurred twice (at its size, then at half its size),
 * - both blurred textures are added to the color of the scene, before the rendering pipelines process it.
 */
export class GlowLayer implements IPostProcessSceneLayer {
	/**
	 * Effect Name of the glow layer.
	 */
	public static readonly EffectName: string = "GlowLayer";
	/**
	 * The default blur kernel size used for the glow.
	 */
	public static DefaultBlurKernelSize: number = 32;
	/**
	 * The default texture size ratio used for the glow.
	 */
	public static DefaultTextureRatio: number = 0.5;

	/**
	 * The name of the layer.
	 */
	public name: string;
	/**
	 * Specifies whether the effect layer is enabled or not.
	 */
	public isEnabled: boolean = true;
	/**
	 * Specifies the color the glow map is cleared with (and the glow color of the materials without emissive color).
	 */
	public neutralColor: IGlowLayerColor = { r: 0, g: 0, b: 0, a: 1 };
	/**
	 * Callback used to let the user override the color selection on a per mesh basis.
	 */
	public customEmissiveColorSelector: ((mesh: Mesh, subMesh: null, material: Material, result: IGlowLayerColor) => void) | null = null;
	/**
	 * Callback used to let the user override the texture selection on a per mesh basis.
	 */
	public customEmissiveTextureSelector: ((mesh: Mesh, subMesh: null, material: Material) => Texture2D | null) | null = null;

	private _scene: SceneContext;
	private _options: IGlowLayerOptions;
	private _intensity: number = 1.0;
	private _isDisposed: boolean = false;

	private _rawEmissiveTextures: Map<string, { texture: Texture2D | null }> = new Map();
	private _rawEmissiveTexturesByData: WeakMap<object, { texture: Texture2D | null }> = new WeakMap();
	private _textureMatrices: WeakMap<object, number[]> = new WeakMap();

	private _includedOnlyMeshes: number[] = [];
	private _excludedMeshes: number[] = [];
	private _effectIntensity: Record<number, number> = {};

	private _mainTexture: GPUTexture | null = null;
	private _mainView: IPostProcessTexture | null = null;
	private _mainDepthTexture: GPUTexture | null = null;
	private _mainDepthView: GPUTextureView | null = null;

	private _glowMapRenderer: MeshPassRenderer;
	private _horizontalBlurPostprocess1: KernelBlurPass;
	private _verticalBlurPostprocess1: KernelBlurPass;
	private _horizontalBlurPostprocess2: KernelBlurPass;
	private _verticalBlurPostprocess2: KernelBlurPass;
	private _mergePasses: Map<string, PostProcessPass> = new Map();

	/**
	 * Instantiates a new glow Layer and references it to the scene.
	 * @param name The name of the layer
	 * @param scene The scene to use the layer in
	 * @param options Sets of none mandatory options to use with the layer (see IGlowLayerOptions for more information)
	 */
	public constructor(name: string, scene: SceneContext, options?: Partial<IGlowLayerOptions>) {
		this.name = name;
		this._scene = scene;

		this._options = {
			mainTextureRatio: GlowLayer.DefaultTextureRatio,
			blurKernelSize: GlowLayer.DefaultBlurKernelSize,
			mainTextureFixedSize: undefined,
			camera: null,
			mainTextureSamples: 1,
			renderingGroupId: -1,
			ldrMerge: false,
			alphaBlendingMode: 1,
			mainTextureType: 0,
			generateStencilBuffer: false,
			excludeByDefault: false,
			...options,
		};

		if ((this._options.mainTextureSamples ?? 1) > 1) {
			warnOnce("glow-layer-samples", "the MSAA of the main texture of the glow layer (mainTextureSamples) is not supported.");
		}

		const engine = scene.surface.engine;
		const kernel = this._getEffectiveBlurKernelSize();

		this._glowMapRenderer = new MeshPassRenderer(engine, "editor-glow-map");
		this._horizontalBlurPostprocess1 = new KernelBlurPass(engine, "GlowLayerHBP1", { x: 1, y: 0 }, kernel);
		this._verticalBlurPostprocess1 = new KernelBlurPass(engine, "GlowLayerVBP1", { x: 0, y: 1 }, kernel);
		this._horizontalBlurPostprocess2 = new KernelBlurPass(engine, "GlowLayerHBP2", { x: 1, y: 0 }, kernel);
		this._verticalBlurPostprocess2 = new KernelBlurPass(engine, "GlowLayerVBP2", { x: 0, y: 1 }, kernel);

		_registerSceneLayer(scene, this);
	}

	/**
	 * Gets the scene the layer belongs to.
	 */
	public get scene(): SceneContext {
		return this._scene;
	}

	/**
	 * Returns wether or not the layer has been disposed.
	 */
	public get isDisposed(): boolean {
		return this._isDisposed;
	}

	/**
	 * Gets the camera attached to the layer.
	 */
	public get camera(): Camera | null {
		return this._options.camera;
	}

	/**
	 * Sets the camera attached to the layer.
	 */
	public set camera(camera: Camera | null) {
		this._options.camera = camera;
	}

	/**
	 * Gets the rendering group id the layer should render in.
	 */
	public get renderingGroupId(): number {
		return this._options.renderingGroupId;
	}

	/**
	 * Sets the rendering group id the layer should render in.
	 */
	public set renderingGroupId(renderingGroupId: number) {
		this._options.renderingGroupId = renderingGroupId;
	}

	/**
	 * Gets the ldrMerge option.
	 */
	public get ldrMerge(): boolean {
		return !!this._options.ldrMerge;
	}

	/**
	 * Gets the kernel size of the blur.
	 */
	public get blurKernelSize(): number {
		return this._options.blurKernelSize;
	}

	/**
	 * Sets the kernel size of the blur.
	 */
	public set blurKernelSize(value: number) {
		if (value === this._options.blurKernelSize) {
			return;
		}

		this._options.blurKernelSize = value;

		const kernel = this._getEffectiveBlurKernelSize();
		this._horizontalBlurPostprocess1.kernel = kernel;
		this._verticalBlurPostprocess1.kernel = kernel;
		this._horizontalBlurPostprocess2.kernel = kernel;
		this._verticalBlurPostprocess2.kernel = kernel;
	}

	/**
	 * Gets the glow intensity.
	 */
	public get intensity(): number {
		return this._intensity;
	}

	/**
	 * Sets the glow intensity.
	 */
	public set intensity(value: number) {
		this._intensity = value;
	}

	/**
	 * Get the effect name of the layer.
	 * @returns The effect name
	 */
	public getEffectName(): string {
		return GlowLayer.EffectName;
	}

	/**
	 * Gets the class name of the effect layer
	 * @returns the string with the class name of the effect layer
	 */
	public getClassName(): string {
		return "GlowLayer";
	}

	/**
	 * Returns true if the layer contains information to display, otherwise false.
	 * @returns true if the glow layer should be rendered
	 */
	public shouldRender(): boolean {
		if (this._options.excludeByDefault && !this._includedOnlyMeshes.length) {
			return false;
		}

		return this.isEnabled;
	}

	/**
	 * Add a mesh in the exclusion list to prevent it to impact or being impacted by the glow layer.
	 * @param mesh The mesh to exclude from the glow layer
	 */
	public addExcludedMesh(mesh: Mesh): void {
		const id = this._getMeshId(mesh);
		if (this._excludedMeshes.indexOf(id) === -1) {
			this._excludedMeshes.push(id);
		}
	}

	/**
	 * Remove a mesh from the exclusion list to let it impact or being impacted by the glow layer.
	 * @param mesh The mesh to remove
	 */
	public removeExcludedMesh(mesh: Mesh): void {
		const index = this._excludedMeshes.indexOf(this._getMeshId(mesh));
		if (index !== -1) {
			this._excludedMeshes.splice(index, 1);
		}
	}

	/**
	 * Add a mesh in the inclusion list to impact or being impacted by the glow layer.
	 * @param mesh The mesh to include in the glow layer
	 */
	public addIncludedOnlyMesh(mesh: Mesh): void {
		const id = this._getMeshId(mesh);
		if (this._includedOnlyMeshes.indexOf(id) === -1) {
			this._includedOnlyMeshes.push(id);
		}
	}

	/**
	 * Remove a mesh from the Inclusion list to prevent it to impact or being impacted by the glow layer.
	 * @param mesh The mesh to remove
	 */
	public removeIncludedOnlyMesh(mesh: Mesh): void {
		const index = this._includedOnlyMeshes.indexOf(this._getMeshId(mesh));
		if (index !== -1) {
			this._includedOnlyMeshes.splice(index, 1);
		}
	}

	/**
	 * Set the excluded by default option.
	 * If true, all meshes will be excluded by default unless they are added to the inclusion list.
	 * @param value The boolean value to set the excluded by default option to
	 */
	public setExcludedByDefault(value: boolean): void {
		this._options.excludeByDefault = value;
	}

	/**
	 * Determine if a given mesh will be used in the glow layer
	 * @param mesh The mesh to test
	 * @returns true if the mesh will be highlighted by the current glow layer
	 */
	public hasMesh(mesh: Mesh): boolean {
		// The meshes of Babylon Lite have no rendering group: they all belong to the default one (0).
		if (this._options.renderingGroupId !== -1 && this._options.renderingGroupId !== 0) {
			return false;
		}

		const id = this._getMeshId(mesh);
		if (this._includedOnlyMeshes.length) {
			return this._includedOnlyMeshes.indexOf(id) !== -1;
		}

		if (this._excludedMeshes.length) {
			return this._excludedMeshes.indexOf(id) === -1;
		}

		return true;
	}

	/**
	 * Gets the intensity of the effect for a specific mesh.
	 * @param mesh The mesh to get the effect intensity for
	 * @returns The intensity of the effect for the mesh
	 */
	public getEffectIntensity(mesh: Mesh): number {
		return this._effectIntensity[this._getMeshId(mesh)] ?? 1;
	}

	/**
	 * Sets the intensity of the effect for a specific mesh.
	 * @param mesh The mesh to set the effect intensity for
	 * @param intensity The intensity of the effect for the mesh
	 */
	public setEffectIntensity(mesh: Mesh, intensity: number): void {
		this._effectIntensity[this._getMeshId(mesh)] = intensity;
	}

	/**
	 * Not supported: the materials of Babylon Lite can't render the glow map. The glow color of the mesh is computed from
	 * its material as for the other meshes.
	 * @param mesh defines the mesh.
	 */
	public referenceMeshToUseItsOwnMaterial(mesh: Mesh): void {
		void mesh;
		warnOnce("glow-layer-own-material", "the meshes rendering the glow layer using their own material (referenceMeshToUseItsOwnMaterial) are not supported.");
	}

	/**
	 * Not supported (see `referenceMeshToUseItsOwnMaterial`).
	 * @param mesh defines the mesh.
	 */
	public unReferenceMeshFromUsingItsOwnMaterial(mesh: Mesh): void {
		void mesh;
	}

	/**
	 * Checks if the layer is ready to be used.
	 * @returns always true: the resources of the layer are created when it is rendered.
	 */
	public isLayerReady(): boolean {
		return true;
	}

	/**
	 * Dispose the highlight layer and free resources.
	 */
	public dispose(): void {
		this._isDisposed = true;

		this._mainTexture?.destroy();
		this._mainDepthTexture?.destroy();
		this._mainTexture = null;
		this._mainDepthTexture = null;

		this._glowMapRenderer.dispose();
		this._horizontalBlurPostprocess1.dispose();
		this._verticalBlurPostprocess1.dispose();
		this._horizontalBlurPostprocess2.dispose();
		this._verticalBlurPostprocess2.dispose();

		this._mergePasses.forEach((pass) => pass.dispose());
		this._mergePasses.clear();

		_unregisterSceneLayer(this._scene, this);
	}

	/**
	 * @internal
	 */
	public isActiveForCamera(camera: Camera): boolean {
		return !this._isDisposed && this.shouldRender() && (!this._options.camera || this._options.camera === camera);
	}

	/**
	 * @internal
	 * Renders the glow the same way Babylon.js does (see the effect layer scene component): main texture, blurs, then
	 * merge into the color of the scene.
	 */
	public render(context: IPostProcessContext, sceneColor: IPostProcessTarget): number {
		const width = Math.floor(this._options.mainTextureFixedSize ?? context.width * this._options.mainTextureRatio);
		const height = Math.floor(this._options.mainTextureFixedSize ?? context.height * this._options.mainTextureRatio);
		if (width <= 0 || height <= 0) {
			return 0;
		}

		const main = this._getMainTexture(width, height);

		// Same as the effect layers of Babylon.js: the meshes are rendered with the projection of the camera computed again
		// (unjittered by the temporal anti-aliasing).
		const camera = context.camera;
		const projection = _getBabylonProjectionMatrix(camera, _getCameraAspectRatio(camera, context.width, context.height));
		const viewProjection = _multiplyMatrices(_getBabylonViewMatrix(camera), projection);

		let draws = this._glowMapRenderer.render(
			_sortMeshPassDraws(this._getGlowMeshes(), camera.worldMatrix),
			{ viewProjection },
			{ glow: true },
			{ colors: [{ view: main.view, format: main.format, clearValue: this.neutralColor }], depth: { view: this._mainDepthView!, format: "depth24plus" } }
		);

		// Blurs: at the size of the main texture, then at half its size.
		const pool = context.pool;
		const format = "rgba16float";

		const halfWidth = Math.max(1, Math.floor(width / 2));
		const halfHeight = Math.max(1, Math.floor(height / 2));

		const horizontal1 = pool.acquire(width, height, format);
		draws += this._horizontalBlurPostprocess1.draw(main, horizontal1);

		const blur1 = pool.acquire(width, height, format);
		draws += this._verticalBlurPostprocess1.draw(horizontal1, blur1);
		pool.release(horizontal1);

		const horizontal2 = pool.acquire(halfWidth, halfHeight, format);
		draws += this._horizontalBlurPostprocess2.draw(blur1, horizontal2);

		const blur2 = pool.acquire(halfWidth, halfHeight, format);
		draws += this._verticalBlurPostprocess2.draw(horizontal2, blur2);
		pool.release(horizontal2);

		// Merge
		const merge = this._getMergePass(context);
		merge.uniforms.set("offset", this._intensity);
		merge.setTexture("textureSampler", blur1);
		merge.setTexture("textureSampler2", blur2);

		draws += merge.draw(sceneColor, { blend: this._getMergeBlendState() });

		pool.release(blur1);
		pool.release(blur2);

		return draws;
	}

	/**
	 * Returns the texture of the given serialized texture loaded as Babylon.js loads it (colors decoded by the shaders),
	 * null until loaded.
	 */
	private _getRawTexture(material: Material, textureData: any): Texture2D | null {
		const cached = this._rawEmissiveTexturesByData.get(textureData);
		if (cached) {
			return cached.texture;
		}

		const rootUrl = _getSerializedMaterialRootUrl(material);
		if (rootUrl === null) {
			return null;
		}

		const key = JSON.stringify([
			rootUrl,
			textureData.name,
			textureData.url,
			textureData.invertY,
			textureData.samplingMode,
			textureData.wrapU,
			textureData.wrapV,
			textureData.noMipmap,
		]);

		let entry = this._rawEmissiveTextures.get(key);
		if (!entry) {
			const newEntry: { texture: Texture2D | null } = { texture: null };
			this._rawEmissiveTextures.set(key, newEntry);

			loadSerializedTexture(this._scene, rootUrl, textureData, { srgb: false }, (texture) => (newEntry.texture = texture)).catch((e) => console.error(e));

			entry = newEntry;
		}

		this._rawEmissiveTexturesByData.set(textureData, entry);

		return entry.texture;
	}

	private _getEffectiveBlurKernelSize(): number {
		return this._options.blurKernelSize / 2;
	}

	private _getMeshId(mesh: Mesh): number {
		return (mesh as unknown as { uniqueId?: number }).uniqueId ?? -1;
	}

	private _getMainTexture(width: number, height: number): IPostProcessTexture {
		// Same as the main texture of the effect layers of Babylon.js: 8 bits by default.
		const format: GPUTextureFormat = this._options.mainTextureType === 2 ? "rgba16float" : this._options.mainTextureType === 1 ? "rgba32float" : "rgba8unorm";

		if (!this._mainTexture || this._mainTexture.width !== width || this._mainTexture.height !== height || this._mainTexture.format !== format) {
			this._mainTexture?.destroy();
			this._mainDepthTexture?.destroy();

			const device = _getDevice(this._scene.surface.engine);
			this._mainTexture = device.createTexture({
				label: "EffectLayerMainRTT",
				size: { width, height },
				format,
				usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
			});

			this._mainDepthTexture = device.createTexture({
				label: "EffectLayerMainRTTDepth",
				size: { width, height },
				format: "depth24plus",
				usage: GPUTextureUsage.RENDER_ATTACHMENT,
			});

			this._mainView = { view: this._mainTexture.createView(), width, height, format };
			this._mainDepthView = this._mainDepthTexture.createView();
		}

		return this._mainView!;
	}

	private _getMergePass(context: IPostProcessContext): PostProcessPass {
		const defines = { EMISSIVE: true, LDR: this.ldrMerge };
		const key = JSON.stringify(defines);

		let pass = this._mergePasses.get(key);
		if (!pass) {
			pass = new PostProcessPass(context.engine, { name: "glowMapMerge", fragment: glowMapMergeFragmentWGSL }, { defines });
			this._mergePasses.set(key, pass);
		}

		return pass;
	}

	private _getMergeBlendState(): GPUBlendState {
		// Same as Babylon.js "ALPHA_COMBINE" (2), "ALPHA_ADD" (1) otherwise.
		if (this._options.alphaBlendingMode === 2) {
			return {
				color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
				alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
			};
		}

		return {
			color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
			alpha: { srcFactor: "zero", dstFactor: "one", operation: "add" },
		};
	}

	/**
	 * Returns the meshes to draw into the glow map, same as Babylon.js "_setEmissiveTextureAndColor" and the defines of the
	 * "glowMapGeneration" effect.
	 */
	private _getGlowMeshes(): IMeshPassDraw[] {
		const draws: IMeshPassDraw[] = [];

		this._scene.meshes.forEach((mesh) => {
			if (mesh.visible !== false && this.hasMesh(mesh)) {
				draws.push(this._getGlowMesh(mesh));
			}
		});

		return draws;
	}

	private _getGlowMesh(mesh: Mesh): IMeshPassDraw {
		const material = mesh.material;
		const passMaterial = _getMeshPassMaterial(mesh);
		const data = passMaterial.data;

		const isPbr = _isSerializedPbrMaterial(data);
		const isStandard = !isPbr && _isSerializedStandardMaterial(data);

		const liteMaterial = material as unknown as { emissiveTexture?: Texture2D | null; _emissiveTexture?: Texture2D | null };
		const hasUv2 = !!(mesh as unknown as { _gpu?: { uv2Buffer: GPUBuffer | null } })._gpu?.uv2Buffer;

		// Emissive texture and color.
		let textureLevel = 1;
		let emissive: IMeshPassDraw["emissive"] = null;

		if (this.customEmissiveTextureSelector) {
			const customTexture = this.customEmissiveTextureSelector(mesh, null, material);
			emissive = customTexture ? { texture: customTexture, matrix: _getSerializedTextureMatrix(null), uv2: false, decode: false } : null;
		} else if (data?.emissiveTexture && !data.emissiveTexture.isCube) {
			textureLevel = data.emissiveTexture.level ?? 1;

			// Same as Babylon.js, the glow reads the colors of the emissive textures in gamma space ("toGammaSpace" when
			// "gammaSpace" is false). The standard materials of Babylon Lite read the emissive textures as they are. The PBR
			// materials decode them (sRGB textures, mipmaps computed in linear space): the glow uses its own copy of the
			// texture, the texture of the material converted to gamma space until it is loaded.
			const rawTexture = isPbr ? this._getRawTexture(material, data.emissiveTexture) : null;
			const liteTexture = rawTexture ?? (isPbr ? liteMaterial.emissiveTexture : isStandard ? liteMaterial._emissiveTexture : null);
			if (liteTexture) {
				emissive = {
					texture: liteTexture,
					matrix: this._getTextureMatrix(data.emissiveTexture),
					uv2: hasUv2 && data.emissiveTexture.coordinatesIndex === 1,
					decode: (isPbr && !rawTexture) || data.emissiveTexture.gammaSpace === false,
				};
			}
		}

		const color: IGlowLayerColor = { r: 0, g: 0, b: 0, a: 0 };
		if (this.customEmissiveColorSelector) {
			this.customEmissiveColorSelector(mesh, null, material, color);
		} else {
			const emissiveColor: number[] | undefined = isPbr || isStandard ? (data.emissive ?? data.emissiveColor ?? [0, 0, 0]) : undefined;
			if (emissiveColor) {
				textureLevel *= data.emissiveIntensity ?? 1;
				color.r = emissiveColor[0] * textureLevel;
				color.g = emissiveColor[1] * textureLevel;
				color.b = emissiveColor[2] * textureLevel;
				color.a = data.alpha ?? 1;
			} else {
				Object.assign(color, this.neutralColor);
			}
		}

		return {
			mesh,
			material: passMaterial,
			alpha: color.a,
			// Same as the "ALPHATESTVALUE" of the glow layer of Babylon.js.
			alphaCutOff: 0.4,
			writeColor: true,
			emissive,
			glowColor: [color.r, color.g, color.b],
			glowIntensity: this.getEffectIntensity(mesh),
		};
	}

	/**
	 * Returns the texture matrix of the given serialized texture, computed once.
	 */
	private _getTextureMatrix(textureData: any): number[] {
		let matrix = this._textureMatrices.get(textureData);
		if (!matrix) {
			matrix = _getSerializedTextureMatrix(textureData);
			this._textureMatrices.set(textureData, matrix);
		}

		return matrix;
	}
}
