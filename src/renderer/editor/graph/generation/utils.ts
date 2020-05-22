import { LGraph } from "litegraph.js";

import { GraphNode, CodeGenerationExecutionType } from "../node";
import { ICodeGenerationStackOutput } from "../generation/types";

export class CodeGenerationUtils {
    /**
     * Retrieves all children of the given node starting from the connection at the given slot id.
     * @param graph defines the reference to the graph that contains the nodes.
     * @param node defines the reference to the node to retrieve its children.
     * @param slotId defines the id of the slot to retrieve its children.
     */
    public static GetChildren(graph: LGraph, node: GraphNode, slotId: number): GraphNode[] {
        const result: GraphNode[] = [node];
        const links = Object.keys(graph.links).map((l) => graph.links[l]);

        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            
            const existingNode = result.find((r) => link.origin_id === r.id);
            
            if (!existingNode) { continue; }
            if (existingNode === node && link.origin_slot !== slotId) { continue; }

            const finalNode = graph.getNodeById(link.target_id) as GraphNode;
            if (finalNode && !result.find((r) => r === finalNode)) {
                result.push(finalNode);
                i = 0;
            }
        }

        return result.filter((r) => r !== node);
    }

    /**
     * Retrieves all ancestors of the given node.
     * @param graph defines the reference to the graph that contains the nodes.
     * @param node defines the node being converted to retrieve its ancestors.
     * @param nodes defines the list of all graph nodes, ordered.
     * @param index defines the index of the current node being converted.
     */
    public static GetAncestors(graph: LGraph, node: GraphNode, nodes: GraphNode[], index: number, children?: GraphNode[]): GraphNode[] {
        const result: GraphNode[] = [];

        for (let i = index + 1; i < nodes.length; i++) {
            const n = nodes[i];
            const a = graph.getAncestors(n) as GraphNode[];

            if (a.indexOf(node) !== -1) {
                if (children && !children.find((a) => a === n)) { continue; }

                const r = a.concat(n).filter((a) => a !== node && result.indexOf(a) === -1);
                result.push.apply(result, r);
            }
        }

        return result;
    }

    /**
     * Deconstructs the given output to retrieve common nodes and properties.
     * @param output defines the list of all outputs.
     */
    public static DeconstructOutput(output: ICodeGenerationStackOutput[]): {
        properties: ICodeGenerationStackOutput[];
        common: ICodeGenerationStackOutput[];
    } {
        return {
            common: this.ExcludeProperties(output),
            properties: this.GetProperties(output),
        };
    }

    /**
     * Excludes properties from the given output array.
     * @param output defines the list of all outputs.
     */
    public static ExcludeProperties(output: ICodeGenerationStackOutput[]): ICodeGenerationStackOutput[] {
        return output.filter((o) => o.type !== CodeGenerationExecutionType.Properties);
    }

    /**
     * Returns the list of all properties from the given output array?
     * @param output defines the list of all outputs.
     */
    public static GetProperties(output: ICodeGenerationStackOutput[]): ICodeGenerationStackOutput[] {
        return output.filter((o) => o.type === CodeGenerationExecutionType.Properties);
    }
}
