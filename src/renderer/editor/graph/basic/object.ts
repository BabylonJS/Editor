import { Alert } from "../../gui/alert";
import { Dialog } from "../../gui/dialog";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, INodeContextMenuOption } from "../node";

export class ObjectNode extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Object");

        this.addInput("key1", "", { removable: true });

        this.addOutput("Ref", "Object");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const obj = { };
        this.inputs.forEach((i, index) => {
            obj[i.name] = this.getInputData(index);
        });

        this.setOutputData(0, obj);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(...inputs: ICodeGenerationOutput[]): ICodeGenerationOutput {
        const code = `{
            ${inputs.map((i, index) => `${this.inputs[index].name.replace(/ /g, "_")}: ${i.code}`).join(",\n")}
        }`;

        return {
            type: CodeGenerationOutputType.Constant,
            code,
        };
    }

    /**
     * Called on the node is right-clicked in the Graph Editor.
     * This is used to show extra options in the context menu.
     */
    public getContextMenuOptions(): INodeContextMenuOption[] {
        return [
            { label: "Add Input...", onClick: async () => {
                const name = await Dialog.Show("Input name", "Please provide a name for the input");
                if (this.inputs.find((i) => i.name === name)) {
                    return Alert.Show("Can't Create Input", `An input named "${name}" already exists.`);
                }

                this.addInput(name, "", { removable: true });
            } }
        ];
    }
}