import { Vector2, Vector3 } from "babylonjs";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";
import { LiteGraph, SerializedLGraphNode } from "litegraph.js";

type VariableType = "number" | "string" | "boolean" |
                    "Vector2" | "Vector3" |
                    "AbstractMesh" | "Mesh" | "InstancedMesh" |
                    "Camera" | "Light" | "Skeleton" |
                    "Animatable";

const basicTypes: string[] = [
    "number", "string", "boolean",
];

const inspectorVisibleTypes: string[] = basicTypes.concat([
    "Vector2", "Vector3",
]);

export class Variable extends GraphNode<
    { name: string; type: VariableType; visibleInInspector?: boolean }
> {
    /**
     * Defines the list of all available variables in the code.
     */
    public static Variables: Variable[] = [];

    /**
     * @hidden
     */
    public _value: any = undefined;

    /**
     * Constructor.
     */
    public constructor() {
        super("Variable");

        this.bgcolor = "#503117";

        this.addProperty("type", "number", "string");
        this.addProperty("name", "myVariable", "string");

        this.addWidget("text", "name", this.properties.name, (v) => this.properties.name = v);
        this.addWidget("combo", "type", this.properties.type, (v) => {
            this.properties.type = v;
            this._reset();
        }, {
            values: inspectorVisibleTypes.concat([
                "AbstractMesh", "Mesh", "InstancedMesh", "Camera",
                "Light", "Skeleton",
                "Animatable",
            ]),
        });

        Variable.Variables.push(this);
    }

    /**
     * configure a node from an object containing the serialized info
     */
    public configure(info: SerializedLGraphNode): void {
        super.configure(info);
        this._resetDefaultValue();
    }

    /**
     * Called on the graph is being started.
     */
    public onStart(): void {
        this._value = this.getInputData(0, true) ?? this._value;
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, this._value);
    }

    /**
     * when removed from graph
     * Called by `LGraph.remove` `LGraph.clear`
     */
    public onRemoved(): void {
        const index = Variable.Variables.indexOf(this);
        if (index !== -1) {
            Variable.Variables.splice(index, 1);
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(input?: ICodeGenerationOutput): ICodeGenerationOutput {
        const requires: any[] = [];
        if (basicTypes.indexOf(this.properties.type) === -1) {
            requires.push({ module: "@babylonjs/core", classes: [this.properties.type] });
        }

        if (inspectorVisibleTypes.indexOf(this.properties.type) !== -1 && this.properties.visibleInInspector) {
            requires.push({ module: "../decorators", classes: ["visibleInInspector"] });
        }

        return {
            type: CodeGenerationOutputType.Variable,
            code: this.properties.name,
            executionType: CodeGenerationExecutionType.Properties,
            variable: {
                name: this.properties.name,
                type: this.properties.type,
                value: input?.code ?? this._getOutput(),
                visibleInInspector: this.properties.visibleInInspector,
            },
            requires,
        };
    }

    /**
     * Returns the output of the variable.
     */
    private _getOutput(): string {
        switch (this.properties.type) {
            case "number": return "0";
            case "boolean": return "true";
            case "string": return `"Value"`;

            case "Vector2": return "new Vector2(0, 0)";
            case "Vector3": return "new Vector3(0, 0, 0)";

            case "AbstractMesh": return "null";
            case "Mesh": return "null";
            case "InstancedMesh": return "null";
            case "Camera": return "null";
            case "Light": return "null";
            case "Skeleton": return "null";
            case "Animatable": return "null";
        }
    }

    /**
     * Resets the node inputs/outputs.
     */
    private _reset(): void {
        this.removeInput(0);
        this.removeOutput(0);
        this.properties = {
            name: this.properties.name,
            type: this.properties.type,
        };

        this._value = undefined;
        
        // Decorator?
        if (inspectorVisibleTypes.indexOf(this.properties.type) !== -1) {
            this.properties.visibleInInspector = false;
        } else {
            delete this.properties.visibleInInspector;
        }


        this.addInput(`Default Value (${this.properties.type})`, this.properties.type);
        this.addOutput("Value", this.properties.type);

        this._resetDefaultValue();
    }

    private _resetDefaultValue(): void {
        switch (this.properties.type) {
            case "number": this._value = 0; break;
            case "boolean": this._value = true; break;
            case "string": this._value = "Value"; break;

            case "Vector2": this._value = new Vector2(0, 0); break;
            case "Vector3": this._value = new Vector3(0, 0, 0); break;

            case "AbstractMesh": this._value = null; break;
            case "Mesh": this._value = null; break;
            case "InstancedMesh": this._value = null; break;

            case "Camera": this._value = null; break;
            case "Light": this._value = null; break;

            case "Skeleton": this._value = null; break;
            case "Animatable": this._value = null; break;
        }
    }
}

export class GetVariable extends GraphNode<{ name: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Get Variable");

        this.bgcolor = "#503117";

        this.addProperty("name", Variable.Variables[0]?.properties.name ?? "None", "string");
        this.addWidget("combo", "name", this.properties.name, (v) => {
            this.properties.name = v;
        }, {
            values: () => Variable.Variables.map((v) => v.properties.name),
        });

        this.addOutput("value", "");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const variable = Variable.Variables.find((v) => v.properties.name === this.properties.name);

        if (variable) {
            this.setOutputData(0, variable._value);
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `this.${this.properties.name}`,
        };
    }
}

export class UpdateVariable extends GraphNode<{ name: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Update Variable");

        this.bgcolor = "#503117";

        this.addProperty("name", Variable.Variables[0]?.properties.name ?? "None", "string");
        this.addWidget("combo", "name", this.properties.name, (v) => {
            this.properties.name = v;
        }, {
            values: () => Variable.Variables.map((v) => v.properties.name),
        });

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Value *", "");

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Value", "");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const value = this.getInputData(1, true);
        const variable = Variable.Variables.find((v) => v.properties.name === this.properties.name);

        if (!variable) { return; }

        variable._value = value;
        this.setOutputData(1, value);

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(input: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.FunctionCall,
            code: `this.${this.properties.name} = ${input.code}`,
            outputsCode: [
                { code: undefined },
                { code: `this.${this.properties.name}` },
            ],
        };
    }
}
