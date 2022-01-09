import { Undefinable } from "../../../shared/types";
import { GraphNode } from "../graph/node";

export interface IPluginGraphNode {
	/**
	 * Defines the path of the graph node in the node creator menu.
	 * @example "custom/my_node" which gives "Custom -> My Node".
	 */
	creatorPath: string;
	/**
	 * Defines the reference to the constructor of the node.
	 * The constructor can't take any 
	 */
	ctor: new () => GraphNode;
}

export interface IPluginGraph {
	/**
	 * Defines the list of all graph nodes to register when the plugin has been loaded.
	 */
	nodes?: Undefinable<IPluginGraphNode[]>;
}
