/**
 * Defines where the volumetric lighting rendering pipeline reads the depth of the scene from. Kept for compatibility with
 * the Babylon.js version of the tools: Babylon Lite has no prepass renderer, the depth of the scene is always rendered by
 * a geometry renderer task of the frame graph (shared with the depth of field).
 */
export enum VolumetricDepthSource {
	/**
	 * A depth renderer, which renders every mesh of the scene a second time. Only used when the scene has
	 * neither a prepass renderer nor a geometry buffer renderer to read the depth from.
	 */
	DepthRenderer = 0,
	/**
	 * The depth texture of the geometry buffer renderer of the scene.
	 */
	GeometryBuffer = 1,
	/**
	 * The depth texture of the prepass renderer of the scene, written while the scene itself is drawn.
	 */
	PrePass = 2,
}

/**
 * Returns the source of the depth of the scene used by the volumetric lighting rendering pipeline. Babylon Lite renders
 * the depth of the scene using a geometry renderer task, shared with the depth of field.
 */
export function resolveVolumetricDepthSource(): VolumetricDepthSource {
	return VolumetricDepthSource.GeometryBuffer;
}
