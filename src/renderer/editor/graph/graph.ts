import { LiteGraph } from "litegraph.js";

import { Number } from "./basic/number";
import { Log } from "./basic/log";
import { Variable } from "./basic/variable";

import { Sinus, Cosinus } from "./math/trigonometry";

export class GraphCode {
    private static _Initialized: boolean = false;
    
    /**
     * Initializes the graph system.
     */
    public static Init(): void {
        if (this._Initialized) { return; }

        // Remove all existing nodes
        LiteGraph.registered_node_types = { };

        // Create basic nodes
        LiteGraph.registerNodeType("basics/number", Number);
        LiteGraph.registerNodeType("basics/log", Log);
        LiteGraph.registerNodeType("basics/variable", Variable);

        // Create math nodes
        LiteGraph.registerNodeType("trigonometry/sinus", Sinus);
        LiteGraph.registerNodeType("trigonometry/cosinus", Cosinus);
    }
}
