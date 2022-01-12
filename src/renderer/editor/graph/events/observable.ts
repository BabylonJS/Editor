import { Nullable } from "../../../../shared/types";

import { Observer, Observable } from "babylonjs";

import { CodeGenerationExecutionType, CodeGenerationOutputType, GraphNode, ICodeGenerationOutput } from "../node";
import { LiteGraph, LLink, SerializedLGraphNode } from "litegraph.js";

interface IObservableInput {
	name: string;
	type: string;
}

interface IObservable {
	name: string;
	inputs: IObservableInput[];
}

const observablesList: Record<string, IObservable[]> = {
	"ParticleSystem": [
		{ name: "onDisposeObservable", inputs: [{ name: "Particles System", type: "IParticleSystem,ParticleSystem" }] },
		{ name: "onStoppedObservable", inputs: [{ name: "Particles System", type: "IParticleSystem,ParticleSystem" }] },
		// { name: "onBeforeDrawParticlesObservable", inputs: [{ name: "Effect", type: "Effect" }] },
	],
	"Material": [
		{ name: "onDisposeObservable", inputs: [{ name: "Material", type: "Material" }] },
		{ name: "onBindObservable", inputs: [{ name: "Mesh", type: "Node,TransformNode,AbstractMesh" }] },
		{ name: "onUnBindObservable", inputs: [{ name: "Material", type: "Material" }] },
		// { name: "onEffectCreatedObservable", inputs: [{ name: "Material", type: "Material" }] },
	],
	"Node": [
		{ name: "onDisposeObservable", inputs: [{ name: "Node", type: "Node" }] },
	],
	"TransformNode": [
		{ name: "onAfterWorldMatrixUpdateObservable", inputs: [{ name: "Node", type: "Node,TransformNode" }] },
	],
	"AbstractMesh": [
		{ name: "onCollideObservable", inputs: [{ name: "Other Mesh", type: "Node,TransformNode,AbstractMesh" }] },
		{ name: "onCollisionPositionChangeObservable", inputs: [{ name: "New Position", type: "Vector3" }] },
		{ name: "onMaterialChangedObservable", inputs: [{ name: "Mesh", type: "Node,TransformNode,AbstractMesh" }] },
		{ name: "onRebuildObservable", inputs: [{ name: "Mesh", type: "Node,TransformNode,AbstractMesh" }] },
	],
	"Mesh": [
		{ name: "onBeforeRenderObservable", inputs: [{ name: "Mesh", type: "Node,TransformNode,AbstractMesh,Mesh" }] },
		{ name: "onBeforeBindObservable", inputs: [{ name: "Mesh", type: "Node,TransformNode,AbstractMesh,Mesh" }] },
		{ name: "onAfterRenderObservable", inputs: [{ name: "Mesh", type: "Node,TransformNode,AbstractMesh,Mesh" }] },
		{ name: "onBeforeDrawObservable", inputs: [{ name: "Mesh", type: "Node,TransformNode,AbstractMesh,Mesh" }] },
	],
};

export class GraphObservable extends GraphNode<{ name: string; once: boolean; }> {
	private _object: Nullable<any> = null;

	private _observer: Nullable<Observer<any>> = null;
	private _observable: Nullable<Observable<any>> = null;

	private _observablesList: IObservable[] = [];

	private static _GenerationId: number = 0;

	/**
	 * Constructor.
	 */
	public constructor() {
		super("Observable");

		this.addProperty("name", "None", "string");
		this.addProperty("once", false, "boolean");

		this.addWidget("toggle", "once", this.properties.once, (v) => this.properties.once = v);
		this.addWidget("combo", "name", this.properties.name, (v) => {
			this.properties.name = v;
			this.title = `Observable (${v})`;

			while (this.outputs.length > 2) {
				this.removeOutput(2);
			}

			const observable = this._observablesList.find((o) => o.name === v);
			observable?.inputs.forEach((i) => this.addOutput(i.name, i.type));

			this.size = this.computeSize();
		}, {
			values: () => this._observablesList.map((o) => o.name),
		});

		this.addInput("", LiteGraph.EVENT);
		this.addInput("Object", "", { linkedOutput: "Object" });

		this.addOutput("", LiteGraph.EVENT);
		this.addOutput("Object", "");
	}

	/**
	 * Called on the graph is being stopped.
	 */
	public onStop(): void {
		this._observable?.remove(this._observer);

		this._observer = null;
		this._observable = null;
	}

	/**
	 * Called on the node is being executed.
	 */
	public execute(): void {
		if (this._observer) {
			return;
		}

		this._object = this.getInputData(1);
		this._observable = this._object[this.properties.name];

		const callback = (o) => {
			this.setOutputData(1, this._object);
			this.setOutputData(2, o);

			this.triggerSlot(0, null);
		};

		if (this.properties.once) {
			this._observer = this._observable?.addOnce((o) => callback(o)) ?? null;
		} else {
			this._observer = this._observable?.add((o) => callback(o)) ?? null;
		}
	}

	/**
	 * Generates the code of the graph.
	 */
	public generateCode(input: ICodeGenerationOutput): ICodeGenerationOutput {
		const argumentName = `ev_${GraphObservable._GenerationId++}`;

		const code = `
			${input.code}.${this.properties.name}.${this.properties.once ? "addOnce" : "add"}((${argumentName}) => {
				{{generated__body}}
			});
		`;

		return {
			code,
			type: CodeGenerationOutputType.CallbackFunction,
			executionType: CodeGenerationExecutionType.Start,
			outputsCode: [
				{ code: undefined },
				{ code: input.code },
				{ code: argumentName },
			],
		};
	}

	/**
	 * Configures the node from an object containing the serialized infos.
	 * @param infos defines the JSON representation of the node.
	 */
	public configure(infos: SerializedLGraphNode): void {
		super.configure(infos);

		this._refreshObservablesList();
	}

	/**
	 * On connections changed for this node, change its mode according to the new connections.
	 * @param type input (1) or output (2).
	 * @param slot the slot which has been modified.
	 * @param added if the connection is newly added.
	 * @param link the link object informations.
	 * @param input the input object to check its type etc.
	 */
	public onConnectionsChange(type: number, slot: number, added: boolean, link: LLink, input: any): void {
		super.onConnectionsChange(type, slot, added, link, input);

		if (type !== LiteGraph.INPUT || !this.graph || !link) {
			return;
		}

		if (link.target_slot !== 1) { return; }

		// Set output
		const connectedNode = this.graph.getNodeById(link.origin_id);
		const output = connectedNode?.outputs[link.origin_slot];

		if (!output) { return; }

		// Set output type
		this.setOutputDataType(1, output.type);

		// Get list of observables according to type
		this._refreshObservablesList();

		if (!this._observablesList.find((o) => o.name === this.properties.name)) {
			this.properties.name = this._observablesList[0]?.name ?? "None";
			this.propertyChanged("name", this.properties.name);
		}
	}

	/**
	 * Refrehses the current list of available observables according to the current
	 * object output type.
	 */
	private _refreshObservablesList(): void {
		this._observablesList = [];

		const output = this.outputs[1];
		if (!output?.type) { return; }

		const split = output.type.split(",");
		split.forEach((s) => {
			this._observablesList.push.apply(this._observablesList, observablesList[s] ?? []);
		});
	}
}
