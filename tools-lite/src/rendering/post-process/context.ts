import { Camera, EngineContext, SceneContext } from "@babylonjs/lite";

import { IPostProcessTarget, IPostProcessTexture } from "./pass";
import { IPostProcessPooledTarget, PostProcessTargetPool } from "./targets";

/**
 * Defines the geometry textures a pipeline needs to render a frame, rendered from the camera before the post-processes
 * (same values as the textures of the pre-pass renderer and of the depth renderer of Babylon.js).
 */
export interface IPostProcessGeometryRequest {
	/**
	 * Linear depth of the view (z in camera space), cleared to 0 (`PREPASS_DEPTH_TEXTURE_TYPE`). Same as the pre-pass
	 * renderer of Babylon.js with WebGPU, the depth is stored in half floats.
	 */
	viewDepth?: boolean;
	/**
	 * Normals in camera space (`PREPASS_NORMAL_TEXTURE_TYPE`).
	 */
	viewNormal?: boolean;
	/**
	 * Normals in world space (`PREPASS_WORLD_NORMAL_TEXTURE_TYPE`).
	 */
	worldNormal?: boolean;
	/**
	 * Reflectivity (rgb) and roughness (a) of the materials (`PREPASS_REFLECTIVITY_TEXTURE_TYPE`).
	 */
	reflectivity?: boolean;
	/**
	 * Velocity of the surfaces encoded as the pre-pass renderer of Babylon.js encodes it, in 8 bits
	 * (`PREPASS_VELOCITY_TEXTURE_TYPE`).
	 */
	velocity?: boolean;
	/**
	 * Linear velocity of the surfaces (`PREPASS_VELOCITY_LINEAR_TEXTURE_TYPE`).
	 */
	linearVelocity?: boolean;
	/**
	 * Depth of the depth renderer of Babylon.js, used by the depth of field: "z / far" with "z" the depth of the clip space
	 * (from 0 at the near plane to "far" at the far plane, before the division by w), in half floats, of the opaque and
	 * alpha tested surfaces, cleared to 1.
	 */
	depthRenderer?: boolean;
	/**
	 * Depth of the depth buffer of the camera (0 at the near plane, 1 at the far plane), in half floats, cleared to 0
	 * (`PREPASS_SCREENSPACE_DEPTH_TEXTURE_TYPE`).
	 */
	screenDepth?: boolean;
	/**
	 * Depth of the back faces, in 32 bits floats (same as the depth renderer the screen space reflections of Babylon.js use
	 * to compute the thickness of the surfaces): depth of the view cleared to 0, or depth of the depth buffer cleared to 1
	 * (see `backDepthNonLinear`), of the opaque and alpha tested surfaces.
	 */
	backDepth?: boolean;
	/**
	 * Downsample factor of the depth of the back faces: its size is the size of the rendering divided by "downsample + 1".
	 */
	backDepthDownsample?: number;
	/**
	 * Defines wether or not the depth of the back faces stores the depth of the depth buffer instead of the depth of the
	 * view (screen space depth of the screen space reflections).
	 */
	backDepthNonLinear?: boolean;
	/**
	 * Defines wether or not the transparent surfaces write the depth of the back faces
	 * (`backfaceForceDepthWriteTransparentMeshes` of the screen space reflections).
	 */
	backDepthTransparent?: boolean;
	/**
	 * Depth of the view in half floats, of all the surfaces (used by the volumetric lighting). Same as the volumetric
	 * lighting of the Babylon.js version of the tools, the view depth of the pre-pass (`viewDepth`) is used instead when
	 * another texture of the pre-pass is requested: `volumetricDepth` is then null.
	 */
	volumetricDepth?: boolean;
}

/**
 * Defines the geometry textures rendered for a frame (null when not requested).
 */
export interface IPostProcessGeometryTextures {
	viewDepth: IPostProcessTexture | null;
	viewNormal: IPostProcessTexture | null;
	worldNormal: IPostProcessTexture | null;
	reflectivity: IPostProcessTexture | null;
	velocity: IPostProcessTexture | null;
	linearVelocity: IPostProcessTexture | null;
	depthRenderer: IPostProcessTexture | null;
	screenDepth: IPostProcessTexture | null;
	backDepth: IPostProcessTexture | null;
	volumetricDepth: IPostProcessTexture | null;
}

/**
 * Defines the context of the rendering of the post-processes of a frame.
 */
export interface IPostProcessContext {
	readonly engine: EngineContext;
	readonly scene: SceneContext;
	readonly camera: Camera;
	/**
	 * Defines the width of the rendering in pixels ("engine.getRenderWidth()" of Babylon.js).
	 */
	readonly width: number;
	/**
	 * Defines the height of the rendering in pixels ("engine.getRenderHeight()" of Babylon.js).
	 */
	readonly height: number;
	/**
	 * Defines the format of the textures of the post-processes: half floats, as the HDR textures of Babylon.js.
	 */
	readonly textureFormat: GPUTextureFormat;
	/**
	 * Defines the pool of the textures the passes draw into.
	 */
	readonly pool: PostProcessTargetPool;
	/**
	 * Defines the geometry textures rendered for the frame.
	 */
	readonly geometry: IPostProcessGeometryTextures;
	/**
	 * Defines the time elapsed since the previous frame, in milliseconds.
	 */
	readonly deltaMs: number;
	/**
	 * Defines the index of the frame.
	 */
	readonly frameId: number;
	/**
	 * Defines the pipelines rendering the camera this frame, in the order they render it.
	 */
	readonly pipelines: readonly IPostProcessPipeline[];
	/**
	 * Offsets the projection of the camera for the draws of the frame, the same way Babylon.js offsets the projection
	 * matrix of the camera ("clip.xy += offset * clip.w"). The commands of the frame are submitted once all its tasks are
	 * recorded: the offset applies to the scene drawn before the post-processes.
	 * @param x defines the offset on the x axis, in clip space.
	 * @param y defines the offset on the y axis, in clip space.
	 * @param includeGeometry defines wether or not the geometry textures of the frame are offset too.
	 */
	jitterProjection(x: number, y: number, includeGeometry: boolean): void;
	/**
	 * Offsets the vertices of the meshes drawn for the frame in clip space, the same way the TAA material manager of
	 * Babylon.js offsets the vertices of the materials ("gl_Position.xy += offset * gl_Position.w", once the velocity is
	 * computed): the scene and the geometry textures are offset, the velocity keeps the values computed from the
	 * positions before the offset.
	 * @param x defines the offset on the x axis, in clip space.
	 * @param y defines the offset on the y axis, in clip space.
	 */
	jitterVertices(x: number, y: number): void;
}

/**
 * Defines a rendering pipeline (or a post-process) rendered by the frame graph tasks of the tools for an editor scene
 * (see `createEditorSceneContext`).
 */
export interface IPostProcessPipeline {
	/**
	 * Defines the class name of the pipeline (see `renderingPipelinesOrder`), which sets the order in which the pipelines
	 * render a camera.
	 */
	getClassName(): string;
	/**
	 * Returns wether or not the pipeline renders the given camera this frame.
	 */
	isActiveForCamera(camera: Camera): boolean;
	/**
	 * Returns the number of samples (MSAA) of the texture the scene renders into when the pipeline is the first one to
	 * render the camera.
	 */
	getSceneSamples?(): number;
	/**
	 * Called before the scene is rendered, to request the geometry textures the pipeline reads this frame.
	 */
	beforeRender?(context: IPostProcessBeforeRenderContext): void;
	/**
	 * Renders the post-processes of the pipeline.
	 * @param context defines the context of the rendering of the frame.
	 * @param input defines the texture to process (the scene or the output of the previous pipeline).
	 * @param target defines the target to draw the result into when the pipeline is the last to render, null otherwise.
	 * @returns the texture holding the result: the given target, a texture acquired from the pool, or the input itself
	 * when nothing has been drawn.
	 */
	render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget | null): IPostProcessTexture;
}

/**
 * Defines a layer drawn over the scene before the rendering pipelines process it, rendered by the frame graph tasks of the
 * tools for an editor scene (same as the effect layers of Babylon.js, ie. the glow layer).
 */
export interface IPostProcessSceneLayer {
	/**
	 * Returns wether or not the layer renders the given camera this frame.
	 */
	isActiveForCamera(camera: Camera): boolean;
	/**
	 * Renders the layer and draws it into the color of the scene.
	 * @param context defines the context of the rendering of the frame.
	 * @param sceneColor defines the texture the scene has been rendered into.
	 * @returns the number of draw calls.
	 */
	render(context: IPostProcessContext, sceneColor: IPostProcessTarget): number;
}

/**
 * Defines the context given to the pipelines before the scene is rendered.
 */
export interface IPostProcessBeforeRenderContext {
	readonly engine: EngineContext;
	readonly scene: SceneContext;
	readonly camera: Camera;
	readonly width: number;
	readonly height: number;
	/**
	 * Requests the given geometry textures for the frame.
	 */
	requestGeometry(request: IPostProcessGeometryRequest): void;
}

/**
 * Returns wether or not the given texture is a texture of the pool of the post-processes.
 * @internal
 */
export function _isPooledTarget(texture: IPostProcessTexture | IPostProcessTarget): texture is IPostProcessPooledTarget {
	return "texture" in texture && !!(texture as IPostProcessPooledTarget).texture;
}
