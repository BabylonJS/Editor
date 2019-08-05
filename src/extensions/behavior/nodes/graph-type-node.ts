import { GraphNode } from './graph-node';
import { IGraphNode } from './types';

/**
 * Registers the given node in order to be used as a type node.
 * @param path the path of the node in the context menu.
 * @param name the name of the node.
 * @param description description of the node to draw in node edition tool.
 * @param getDefaultValue the function that returns the default value of the type to work as a constant.
 */
export function registerTypeNode (path: string, name: string, description: string, getDefaultValue: () => any): void {
    GraphNode.RegisterNode(path, (class extends GraphTypeNode {
        title = name;
        desc = description;
        constructor () {
            super(getDefaultValue);
        }
    }));
}

export class GraphTypeNode extends IGraphNode {
    /**
     * Constructor.
     * @param getDefaultValue the function that returns the effective value to store as a node type.
     */
    constructor (getDefaultValue: () => any) {
        super();

        // Get value (newly created or parsed?)
        const value = getDefaultValue();

        // Get transform method
        let type = GraphNode.GetConstructorName(value).toLowerCase();
        switch (type) {
            case 'number':
            case 'string':
                this.addProperty('value', value);
                break;
            case 'vector2':
                type = 'vec3';
                this.addProperty('value', GraphNode.vector3ToVec3(value));
                break;
            case 'vector3':
                type = 'vec3';
                this.addProperty('value', GraphNode.vector3ToVec3(value));
                break;
            default: debugger; break; // Should never happen
        }

        // Output
        this.addOutput('value', type);
    }

    /**
     * Called on the node is being executed.
     */
    public onExecute (): void {
        this.setOutputData(0, this.properties.value);
    }
}
