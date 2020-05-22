import { LGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenrationOutputType } from "./node";

export interface IGlobalCodeGenerationOutput extends ICodeGenerationOutput {
    /**
     * Defines the id of the node that has been generated.
     */
    id: number;

    /**
     * In case of a variable, this is the effective variable name. for example if two variables named "a"
     * exist, the second variable should be named "a_2".
     * @hidden
     */
    _effectiveVariableName?: string;
}

export class GraphCodeGenerator {
    /**
     * Converts the given graph into code that games can execute.
     * @param graph defines the reference to the graph that should be converted to code.
     */
    public static GenerateCode(graph: LGraph): string {
        const nodes = graph.computeExecutionOrder(false, true) as GraphNode[];
        const result: string[] = [];
        const outputs: IGlobalCodeGenerationOutput[] = [];

        let previous: IGlobalCodeGenerationOutput;

        // Traverse nodes and generate code
        nodes.forEach((n) => {
            // Get all inputs
            const inputs: IGlobalCodeGenerationOutput[] = [];
            for (const linkId in graph.links) {
                const link = graph.links[linkId];
                if (link.target_id !== n.id) { continue; }

                const output = outputs.find((o) => o.id === link.origin_id);
                if (output) {
                    inputs.push(output);
                }
            }

            // Generate the code of the current node
            previous = {
                id: n.id,
                ...n.generateCode(...inputs),
            } as IGlobalCodeGenerationOutput;

            // According to the node type, build the final code string
            switch (previous.type) {
                // Variable
                case CodeGenrationOutputType.Variable:
                    const count = outputs.filter((o) => o.variable?.name === previous.variable?.name);
                    
                    if (count.length) {
                        previous._effectiveVariableName = `${previous.variable?.name}_${count}`;
                    } else {
                        previous._effectiveVariableName = previous.variable?.name;
                    }
                    
                    previous._effectiveVariableName = previous._effectiveVariableName!.replace(/ \t\n\r/g, "");
                    result.push(`let ${previous._effectiveVariableName} = ${previous.variable?.value.toString()}`);
                    break;
                case CodeGenrationOutputType.Function:
                    result.push(previous.code);
                    break;
            }

            // Register output.
            outputs.push(previous);
        });

        return result.join("\n\t");
    }
}
