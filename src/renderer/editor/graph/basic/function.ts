import { LiteGraph } from "litegraph.js";
import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType, INodeContextMenuOption } from "../node";

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

		this.color = "#12233a";
		this.bgcolor = "#244872";

		this.addProperty("name", "myFunction", "string");
		this.addWidget("text", "name", this.properties.name, (v) => this.properties.name = v);

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
		const code = `
		private _function_${this.properties.name}(): void {
			{{generated__body}}
		}`;

		return {
			code,
			type: CodeGenerationOutputType.Function,
			executionType: CodeGenerationExecutionType.Properties,
		};
	}
}

export class CallGFunction extends GraphNode {
	/**
	 * Constructor.
	 */
	public constructor() {
		super("Call Function");

		this.bgcolor = "#244872";

		this.addProperty("name", GFunction.Functions[0]?.properties.name ?? "None", "string");
		this.addWidget("combo", "name", this.properties.name, (v) => {
			this.properties.name = v;
		}, {
			values: () => GFunction.Functions.map((v) => v.properties.name),
		});

		this.addInput("", LiteGraph.EVENT as any);
		this.addOutput("", LiteGraph.EVENT as any);
	}

	/**
	 * Called on the node is being executed.
	 */
	public async execute(): Promise<void> {
		const gfunction = GFunction.Functions.find((v) => v.properties.name === this.properties.name);
		await gfunction?.triggerSlot(0, null);

		return this.triggerSlot(0, null);
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
	public generateCode(): ICodeGenerationOutput {
		return {
			code: `this._function_${this.properties.name}()`,
			type: CodeGenerationOutputType.FunctionCall,
		};
	}
}