import { Scene, Node, Vector3, Vector2, Vector4, Color3, Color4 } from 'babylonjs';
import { LGraphCanvas } from 'litegraph.js';

import { IGraphNode, IGraphNodeDescriptor, GraphMethodCallType } from './types';

/**
 * Registers the given node in order to be used.
 * @param description the description object of the node to add in the collection.
 * @param object defines the object being customized using the graph editor.
 */
export function registerNode (description: IGraphNodeDescriptor, object: any): void {
    if (object && !(object instanceof description.ctor))
        return;
    
    // Register
    GraphNode.RegisterNode(description.path, class extends GraphNode {
        static Title = description.name;
        static Desc = description.description;
        title = description.name;
        desc = description.description;
        constructor () {
            super(description);
        }
    });
}

/**
 * Defines an input used for function execution.
 */
export type ExecuteInput = {
    /**
     * The name of the input.
     */
    name: string;
    /**
     * The data of the input just being retrieved.
     */
    data: any;
}

export class GraphNode extends IGraphNode {
    private _propertiesOrder: GraphMethodCallType[] = [];

    /**
     * Constructor.
     * @param description the description object of the node to add in the collection.
     */
    constructor (public description: IGraphNodeDescriptor) {
        super();

        // Properties
        description.properties && description.properties.forEach(i => {
            switch (i.type) {
                case 'number':
                case 'string':
                case 'boolean':
                    this._propertiesOrder.push(GraphNode.commonToCommon);
                    this.addProperty(i.name, i.defaultValue);
                    break;
                case 'vec2':
                    this._propertiesOrder.push(GraphNode.vec2ToVector2);
                    this.addProperty(i.name, [0, 0]);
                    break;
                case 'vec3':
                    this._propertiesOrder.push(GraphNode.vec3ToVector3);
                    this.addProperty(i.name, [0, 0, 0]);
                    break;
                case 'vec4':
                    this._propertiesOrder.push(GraphNode.vec4ToVector4);
                    this.addProperty(i.name, [0, 0, 0, 0]);
                    break;
                default: debugger; break; // Should never happen
            }
        });

        // Inputs
        description.inputs && description.inputs.forEach(i => this.addInput(i.name, i.type));

        // Outputs
        description.outputs && description.outputs.forEach(o => this.addOutput(o.name, o.type));

        // Widgets
        description.widgets && description.widgets.forEach(w => {
            const widget = this.addWidget(w.type, w.name, w.value, w.callback, w.options);

            if (w.type === 'combo') {
                // Bypass a missing callback call in litegraph.js. Set "value" as getter/setter to call ourself the callback
                widget._value = w.value;
                Object.defineProperty(widget, 'value', {
                    get: () => widget._value,
                    set: (v) => {
                        widget._value = v;
                        w.callback && w.callback(v, this.graph, this);
                    }
                });
            }
        });

        // On added
        if (description.onAdded)
            description.onAdded(this);
    }

    /**
     * Can be implemented by the node, defines the list of available inputs not added by default to add on the fly.
     */
    public onGetInputs (): [string, (string | number)][] {
        if (this.description && this.description.onGetInputs().length > 0)
            return this.description.onGetInputs();

        return [];
    }

    /**
     * Can be implemented by the node, defines the list of available outputs not added by default to add on the fly.
     */
    public onGetOutputs (): [string, (string | number)][] {
        if (this.description && this.description.onGetOutputs().length > 0)
            return this.description.onGetOutputs();

        return [];
    }

    /**
     * Called on the node is being executed.
     */
    public onExecute (): void {
        const targetPath = this.properties['Target Path'];
        const target = targetPath ? GraphNode.GetTargetPath(targetPath, this.graph.scriptObject, this.graph.scriptScene) : this.graph.scriptObject;
        const functionRef = <(...args: any[]) => any> (this.description.functionRef ?
                                typeof(this.description.functionRef) === 'string' ? GraphNode.GetProperty(target, this.description.functionRef) :
                                this.description.functionRef
                            : null);
        
        const inputs: ExecuteInput[] = [];
        const parameters: any[] = [];
        
        // Inputs and parameters
        if (this.description.inputs) {
            for (const [index, input] of this.description.inputs.entries()) {
                const data = this.getInputData(index);
                inputs.push({ name: input.name, data });

                if (data && input.propertyPath) {
                    const split = input.propertyPath.split('.');
                    const property = GraphNode.GetEffectiveProperty(target, input.propertyPath);
                    property[split[split.length - 1]] = data;
                }
            }
        }

        if (this.description.parameters) {
            for (const [index, parameter] of this.description.parameters.entries()) {
                if (parameter.inputName) {
                    const input = inputs.find(i => i.name === parameter.inputName);
                    if (!input && !parameter.optional)
                        return console.warn(`Warning: calling "${this.description.functionRef}", input "${input.name}" is mandatory`);
                    parameters.push(input.data);
                }
            }
        }
       
        // Call function!
        const result = functionRef ?
                            typeof(this.description.functionRef) === 'string' ? functionRef.apply(target, parameters) :
                            functionRef(this, target, this.graph.scriptScene)
                        : null;

        // Ouputs
        if (this.description.outputs) {
            for (const [index, output] of this.description.outputs.entries()) {
                // First output is always the function's output.
                if (this.description.functionRef && index === 0) {
                    this.setOutputData(index, result);
                    continue;
                }

                // Properties
                if (output.propertyPath) {
                    // From a property
                    if (output.propertyName) {
                        const property = GraphNode.GetProperty<any>(target, this.properties[output.propertyName]);
                        this.setOutputData(index, property);
                    }
                    // From the fixed property path
                    else {
                        const property = GraphNode.GetProperty(target, output.propertyPath);
                        this.setOutputData(index, property);
                    }
                    continue;
                }

                // Return the property name
                if (output.propertyName) {
                    this.setOutputData(index, this.properties[output.propertyName]);
                    continue;
                }
                
                // From the input name
                if (output.inputName) {
                    const input = inputs.find(i => i.name === output.inputName);
                    this.setOutputData(index, input.data);
                    continue;
                }

                // Other types of outputs coming...
            }
        }
    }

    /**
     * On the background is drawn, draw custom text.
     * @param ctx the canvas 2d context reference.
     * @param graph the graph canvas reference.
     * @param canvas the canvas reference where to draw the text.
     * @param text the text to draw.
     */
    public onDrawBackground (ctx: CanvasRenderingContext2D, graph: LGraphCanvas, canvas: HTMLCanvasElement, text?: string): void {
        if (this.description.drawBackground)
            super.onDrawBackground(ctx, graph, canvas, this.description.drawBackground(this, this.properties['Target Path']));
    }

    /**
     * Called on the user releases a keyboard key.
     * @param ev the source keyboard event reference.
     * @todo support undo/redo
     */
    public onKeyUp(ev: KeyboardEvent): void {
        if (ev.keyCode === 46) {
            this.graph.remove(this);
        }
    }

    /**
     * Returns wether or not the given value is valid.
     * @param value the value to check.
     */
    public isInputValid (value: any): boolean {
        return value !== null && value !== undefined;
    }

    /**
     * Returns the generated code.
     */
    public generateCode (): string {
        const targetPath = this.properties['Target Path'];
        const target = targetPath ? GraphNode.GetTargetPath(targetPath, this.graph.scriptObject, this.graph.scriptScene) : this.graph.scriptObject;

        if (this.description.getCodeRef)
            return this.description.getCodeRef(this, target, this.graph.scriptScene);

        return 'todo';
    }

    /**
     * Returns the effective property.
     * @param object the object reference containing the property to get.
     * @param path the path of the property to get its reference/copy.
     */
    public static GetProperty<T> (object: any, path: string): T {
        const split = path.split('.');
        for (let i = 0; i < split.length; i++)
            object = object[split[i]];

        return object;
    }

    /**
     * Returns the effective property.
     * @param object the object reference containing the property to get.
     * @param path the path of the property to get its reference/copy.
     */
    public static GetEffectiveProperty<T> (object: any, path: string): T {
        const split = path.split('.');
        for (let i = 0; i < split.length - 1; i++)
            object = object[split[i]];

        return object;
    }

    /**
     * Returns the constructor name of the given object.
     * @param obj the object the get its constructor name.
     */
    public static GetConstructorName (obj: any): string {
        let ctrName = (obj !== undefined && obj !== null && obj.constructor) ? obj.constructor.name : '';

        if (ctrName === '')
            ctrName = typeof obj;

        return ctrName;
    }

    /**
     * Returns the target (scene or not) according to the given path ('Scene' or node name).
     * @param path the path/name of the node/scene to get.
     * @param scene the scene reference.
     */
    public static GetTargetPath (path: string, target: any, scene: Scene): Scene | Node {
        if (path === 'Self') return target;
        if (path === 'Scene') return scene;
        const node = scene.getNodeByName(path);
        return node;
    }

    /**
     * Works as a bypass to just return value.
     * @param value the value to return.
     */
    public static commonToCommon (value: number | string): number | string {
        return value;
    }

    /**
     * Returns a new Vector3 from the given array.
     * @param vec2 the vec3 input as number[].
     */
    public static vec2ToVector2 (vec2: number[]): Vector2 {
        return Vector2.FromArray(vec2);
    }

    /**
     * Returns a new Vector3 from the given array.
     * @param vec3 the vec3 input as number[].
     */
    public static vec3ToVector3 (vec3: number[]): Vector3 {
        return Vector3.FromArray(vec3);
    }

    /**
     * Returns a new Vector4 from the given array.
     * @param vec4 the vec4 input as number[].
     */
    public static vec4ToVector4 (vec4: number[]): Vector4 {
        return Vector4.FromArray(vec4);
    }

    /**
     * Returns a new Color 3 from the given array.
     * @param col3 the col3 input as number[].
     */
    public static col3ToColor3 (col3: number[]): Color3 {
        return Color3.FromArray(col3);
    }

    /**
     * Returns a new Color 4 from the given array.
     * @param col4 the col4 input as number[].
     */
    public static col4ToColor4 (col4: number[]): Color4 {
        return Color4.FromArray(col4);
    }
}
