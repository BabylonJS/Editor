import { Scene, TransformNode } from "babylonjs";
import type { QuarksJSON } from "./quarksTypes";
import type { Data } from "./hierarchy";
import type { LoaderOptions } from "./loader";

/**
 * Context for  parsing operations
 */
export interface ParseContext {
	scene: Scene;
	rootUrl: string;
	jsonData: QuarksJSON;
	options: LoaderOptions;
	groupNodesMap: Map<string, TransformNode>;
	Data?: Data;
}
