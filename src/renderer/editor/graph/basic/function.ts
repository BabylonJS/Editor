import { Nullable } from "../../../../shared/types";

import { INodeOutputSlot, LiteGraph } from "litegraph.js";

import { Alert } from "../../gui/alert";
import { Dialog } from "../../gui/dialog";

import { NodeUtils } from "../utils";
import { GraphCodeGenerator } from "../generate";
import {
	GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType,
	INodeContextMenuOption,
} from "../node";

export class GFunction extends GraphNode<{ name: string; }> {
	/**
	 * Defines the list of all available functions in the code.
	 */
	public static Functions: GFunction[] = [];

	/**
	 * Constructor.
	 */
	public constructor() {
		super("Function");

		this.color = "#1e3a5a";
		this.bgcolor = "#244872";

		this.size[1] = 120;

		this.addProperty("name", "myFunction", "string");
		this.addWidget("text", "name", this.properties.name, (v) => {
			this.properties.name = v;
			this.title = `Function (${v})`;
			this.size = this.computeSize();
		});

		this.addOutput("", LiteGraph.EVENT as any);

		GFunction.Functions.push(this);
	}

	/**
	 * Called on the node is being executed.
	 */
	public execute(): void {
		// Nothing to do for now...
	}

	/**
	 * Adds a new output slot to use in this node
	 * @param name defines the name of the output.
	 * @param type string defining the output type ("vec3","number",...)
	 * @param extra_info this can be used to have special properties of an output (label, special color, position, etc)
	 */
	public addOutput(name: string, type: string | number, extra_info?: Partial<INodeOutputSlot>): void {
		super.addOutput(name, type, extra_info);

		const calls = CallGFunction.FunctionCalls.filter((f) => f._functionRef === this);
		calls.forEach((c) => {
			c.addInput(name, type, extra_info);
		});

		this._checkGraph();
	}

	/**
	 * Remove an existing output slot.
	 * @param slot defines the index of the output slot to remove.
	 */
	public removeOutput(slot: number): void {
		super.removeOutput(slot);

		const calls = CallGFunction.FunctionCalls.filter((f) => f._functionRef === this);
		calls.forEach((c) => {
			c.removeInput(slot);
		});

		this._checkGraph();
	}

	/**
	 * when removed from graph
	 * Called by `LGraph.remove` `LGraph.clear`
	 */
	public onRemoved(): void {
		const index = GFunction.Functions.indexOf(this);
		if (index !== -1) {
			GFunction.Functions.splice(index, 1);
		}
	}

	/**
	 * Generates the code of the graph.
	 */
	public generateCode(): ICodeGenerationOutput {
		const outputs = this.outputs.filter((o) => o.name);

		const code = `
		private _function_${this.properties.name}(${outputs.map((o) => `${o.name}: any`).join(", ")}): void {
			{{generated__body}}
		}`;

		return {
			code,
			type: CodeGenerationOutputType.Function,
			executionType: CodeGenerationExecutionType.Properties,
			outputsCode: [{ code: undefined }].concat(outputs.map((o) => ({ code: o.name }) as any)),
		};
	}

	/**
	 * Called on a property changed.
	 * @param name defines the name of the property that changed.
	 * @param value defines the new value of the property.
	 */
	public propertyChanged(name: string, value: any): boolean {
		if (name == "name") {
			const calls = CallGFunction.FunctionCalls.filter((f) => f._functionRef === this);
			calls.forEach((c) => {
				c.properties.name = value;
				c.propertyChanged(name, value);
			});
		}

		return super.propertyChanged(name, value);
	}

	/**
	 * Called on the node is right-clicked in the Graph Editor.
	 * This is used to show extra options in the context menu.
	 */
	public getContextMenuOptions(): INodeContextMenuOption[] {
		return [
			{
				label: "Add Input Parameter...", onClick: async () => {
					const name = await Dialog.Show("Input Parameter name", "Please provide a name for the input parameter");
					if (this.inputs.find((i) => i.name === name)) {
						return Alert.Show("Can't Create Input Parameter", `An input parameter named "${name}" already exists.`);
					}

					this.addOutput(name, "", { removable: true });
				}
			}
		];
	}

	/**
	 * Called each time the background is drawn.
	 * @param ctx defines the rendering context of the canvas.
	 * @override
	 */
	public drawBackground(ctx: CanvasRenderingContext2D): void {
		super.drawBackground(ctx);

		ctx.font = "20px Arial";
		ctx.fillStyle = "#666";
		ctx.textAlign = "center";
		ctx.fillText("ƒ", this.size[0] * 0.5, (this.size[1] + LiteGraph.NODE_TITLE_HEIGHT) * 0.2);
		ctx.textAlign = "left";
	}

	/**
	 * Checks the graph.
	 */
	private _checkGraph(): void {
		if (!this.graph) {
			return;
		}

		const check = GraphCodeGenerator._GenerateCode(this.graph!);
		if (check.error) {
			check.error.node.color = "#ff2222";
		} else {
			this.graph["_nodes"].forEach((n) => NodeUtils.SetColor(n as GraphNode));
		}
	}
}

export class CallGFunction extends GraphNode {
	/**
	 * Defines the list of all available functions in the code.
	 */
	public static FunctionCalls: CallGFunction[] = [];

	/**
	 * @hidden
	 */
	public _functionRef: Nullable<GFunction> = null;

	/**
	 * Constructor.
	 */
	public constructor() {
		super("Call Function");

		this.bgcolor = "#244872";

		this.addProperty("name", GFunction.Functions[0]?.properties.name ?? "None", "string");
		this.addWidget("combo", "name", this.properties.name, (v) => {
			this.properties.name = v;
			this.title = `Call Function (${v})`;
			this.size = this.computeSize();
			this._functionRef = GFunction.Functions.find((f) => f.properties.name === v) ?? null;
		}, {
			values: () => GFunction.Functions.map((v) => v.properties.name),
		});

		this.addInput("", LiteGraph.EVENT as any);
		this.addOutput("", LiteGraph.EVENT as any);

		CallGFunction.FunctionCalls.push(this);
	}

	/**
	 * Called on the node is being executed.
	 */
	public async execute(): Promise<void> {
		this.inputs.forEach((_, index) => {
			this._functionRef?.setOutputData(index, this.getInputData(index));
		});

		await this._functionRef?.triggerSlot(0, null);

		return this.triggerSlot(0, null);
	}

	/**
	 * when removed from graph
	 * Called by `LGraph.remove` `LGraph.clear`
	 */
	public onRemoved(): void {
		const index = CallGFunction.FunctionCalls.indexOf(this);
		if (index !== -1) {
			CallGFunction.FunctionCalls.splice(index, 1);
		}
	}

	/**
	 * Called on the node is right-clicked in the Graph Editor.
	 * This is used to show extra options in the context menu.
	 */
	public getContextMenuOptions(): INodeContextMenuOption[] {
		return [{
			label: "Go To Function",
			onClick: () => {
				GFunction.Functions.find((v) => v.properties.name === this.properties.name)?.focusOn();
			},
		}];
	}

	/**
	 * Generates the code of the graph.
	 */
	public generateCode(...inputs: ICodeGenerationOutput[]): ICodeGenerationOutput {
		this._functionRef = GFunction.Functions.find((f) => f.properties.name === this.properties.name) ?? null;

		return {
			code: `this._function_${this.properties.name}(${inputs.map((i) => i?.code ?? "null").join(", ")})`,
			type: CodeGenerationOutputType.FunctionCall,
		};
	}

	/**
	 * Called each time the background is drawn.
	 * @param ctx defines the rendering context of the canvas.
	 * @override
	 */
	public drawBackground(ctx: CanvasRenderingContext2D): void {
		super.drawBackground(ctx);

		ctx.font = "20px Arial";
		ctx.fillStyle = "#666";
		ctx.textAlign = "center";
		ctx.fillText("ƒ", this.size[0] * 0.5, (this.size[1] + LiteGraph.NODE_TITLE_HEIGHT) * 0.2);
		ctx.textAlign = "left";
	}
}