import { Nullable } from "../../../shared/types";

import { LiteGraph } from "litegraph.js";

import { GraphNode } from "./node";

export class NodeUtils {
    /**
     * Defines the reference to the node that is being paused.
     */
    public static PausedNode: Nullable<GraphNode> = null;

    /**
     * Sets the node's color according to its mode.
     * @param node defines the node to configure its color according to its current mode.
     * @see .mode
     */
    public static SetColor (node: GraphNode): void {
        switch (node.mode) {
            case LiteGraph.ALWAYS: node.color = undefined!; break;
            case LiteGraph.ON_EVENT: node.color = "#55A"; break;
            case LiteGraph.ON_TRIGGER: node.color = "#115543"; break;
            case LiteGraph.NEVER: node.color = "#A55"; break;
            default: break;
        }
    }

    /**
     * Resumes all the nodes in case the graph is paused on a breakpoint.
     */
    public static ResumeExecution(): void {
        if (!this.PausedNode) { return; }

        this.PausedNode.pausedOnBreakPoint = false;
        if (this.PausedNode.graph) {
            this.PausedNode.graph.hasPaused = false;
        }

        this.PausedNode.setDirtyCanvas(true, true);
        (this.PausedNode.graph as any)._nodes.forEach((n) => n instanceof GraphNode && n.resume());
    }
}
