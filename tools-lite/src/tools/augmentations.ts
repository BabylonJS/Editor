import type { SceneLoaderQualitySelector } from "../loading/loader";

declare module "@babylonjs/lite" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface SceneNode {
		/**
		 * Defines the id of the node as set in the editor.
		 */
		id?: string;
		/**
		 * Defines the unique id of the node as set in the editor.
		 */
		uniqueId?: number;
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface Camera {
		/**
		 * Defines the id of the camera as set in the editor.
		 */
		id?: string;
		/**
		 * Defines the unique id of the camera as set in the editor.
		 */
		uniqueId?: number;
		/**
		 * Defines the metadata of the camera as set in the editor.
		 */
		metadata?: LiteMetadata;
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface Mesh {
		/**
		 * Defines the reference to the physics aggregate created for the mesh when it is configured in the editor.
		 */
		physicsAggregate?: PhysicsAggregate | null;
		/**
		 * Defines the reference to the mesh the mesh is an instance of. Babylon Lite doesn't support instanced meshes:
		 * the instances created in the editor are loaded as meshes sharing the geometry and material of their source mesh.
		 */
		sourceMesh?: Mesh | null;
		/**
		 * Defines the distance used to switch to this mesh when it is a LOD level of another mesh, as set in the editor.
		 */
		originalDistanceOrScreenCoverage?: number;
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface LiteMetadata {
		/**
		 * Defines the list of scripts attached to the object in the editor.
		 */
		scripts?: any;
		/**
		 * Defines wether or not the transform node is a static group.
		 */
		isStaticGroup?: any;
		/**
		 * Defines the decal configuration when the mesh is a decal created in the editor.
		 */
		decal?: any;
		/**
		 * Defines the physics aggregate configuration of the mesh, consumed once the physics aggregate is created.
		 */
		physicsAggregate?: any;
		/**
		 * Defines the id of the original node when the node was instantiated from an asset container.
		 */
		originalId?: any;
		/**
		 * Defines the shadow map refresh rate of a light.
		 */
		refreshRate?: any;
		/**
		 * Defines the list of animations of a sprite.
		 */
		spriteAnimations?: any;
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface SceneContext {
		/**
		 * Defines the metadata of the scene as set in the editor (scripts, rendering configurations, etc.).
		 */
		metadata?: any;

		loadingQuality: SceneLoaderQualitySelector;
		loadingTexturesQuality: SceneLoaderQualitySelector;
		loadingShadowsQuality: SceneLoaderQualitySelector;
		loadingLodsQuality: SceneLoaderQualitySelector;
	}
}
