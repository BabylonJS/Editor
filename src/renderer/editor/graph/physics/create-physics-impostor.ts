import { AbstractMesh, PhysicsImpostor } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class CreatePhysicsImpostor extends GraphNode<{ type: string; mass: number; friction: number; restitution: number; }> {
    /**
     * Defines the list of all available impostors.
     */
    public static Impostors: string[] = [
        "NoImpostor",
        "SphereImpostor",
        "BoxImpostor",
    ];

    /**
     * Constructor.
     */
    public constructor() {
        super("Create Physics Impostor");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Mesh *", "AbstractMesh");

        this.addProperty("type", "NoImpostor", "string");
        this.addProperty("mass", 1, "number");
        this.addProperty("friction", 0.2, "number");
        this.addProperty("restitution", 0.2, "number");

        this.addWidget("combo", "type", this.properties.type, (v) => this.properties.type = v, {
            values: CreatePhysicsImpostor.Impostors,
        });
        this.addWidget("number", "mass", this.properties.mass, (v) => this.properties.mass = v);
        this.addWidget("number", "friction", this.properties.friction, (v) => this.properties.friction = v);
        this.addWidget("number", "restitution", this.properties.restitution, (v) => this.properties.restitution = v);

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("mesh", "Node,TransformNode,AbstractMesh");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const mesh = this.getInputData(1) as AbstractMesh;
        if (!mesh) { return; }

        mesh.physicsImpostor = new PhysicsImpostor(mesh, PhysicsImpostor[this.properties.type], {
            mass: this.properties.mass,
            friction: this.properties.friction,
            restitution: this.properties.restitution,
        });

        this.setOutputData(1, mesh);
        this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(mesh: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `${mesh.code}.physicsImpostor = new PhysicsImpostor(${mesh.code}, PhysicsImpostor.${this.properties.type}, {
                mass: ${this.properties.mass},
                friction: ${this.properties.friction},
                restitution: ${this.properties.restitution},
            });`;

        return {
            type: CodeGenerationOutputType.Function,
            code,
            outputsCode: [
                { code: undefined },
                { code: mesh.code },
            ],
            requires: [
                { module: "@babylonjs/core", classes: ["PhysicsImpostor"] }
            ]
        };
    }
}
