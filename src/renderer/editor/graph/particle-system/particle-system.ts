import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class ParticleSystem extends GraphNode<{ name: string; var_name: string; }> {
    /**
     * Defines the list of all avaialbe sounds in the scene.
     */
    public static ParticleSystems: string[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Particle System");

        this.addProperty("name", "None", "string");
        this.addProperty("var_name", "myPs", "string");

        this.addWidget("combo", "name", this.properties.name, (v) => this.properties.name = v, {
            values: () => ParticleSystem.ParticleSystems,
        });
        this.addWidget("text", "var_name", this.properties.var_name, (v) => this.properties.var_name = v);

        this.addOutput("Particles System", "IParticleSystem");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const ps = this.getScene().particleSystems.find((ps) => ps.name === this.properties.name);
        this.setOutputData(0, ps ?? null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Variable,
            code: this.properties.var_name,
            executionType: CodeGenerationExecutionType.Properties,
            variable: {
                name: this.properties.var_name,
                value: `this._scene.particleSystems.find((ps) => ps.name === "${this.properties.name.replace("\\", "\\\\")}")`,
            },
            outputsCode: [
                { code: `this.${this.properties.var_name}` },
            ],
        };
    }
}
