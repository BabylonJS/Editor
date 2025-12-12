import { Scene, TransformNode } from "babylonjs";
import type { QuarksVFXJSON } from "./quarksTypes";
import type { VFXHierarchy } from "./hierarchy";
import type { VFXLoaderOptions } from "./loader";

/**
 * Context for VFX parsing operations
 */
export interface VFXParseContext {
	scene: Scene;
	rootUrl: string;
	jsonData: QuarksVFXJSON;
	options: VFXLoaderOptions;
	groupNodesMap: Map<string, TransformNode>;
	vfxData?: VFXHierarchy;
}
