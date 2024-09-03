import { ipcRenderer } from "electron";
import { readJSON, writeJSON } from "fs-extra";

import { toast } from "sonner";

import { Component, ReactNode } from "react";

import { NodeEditor } from "babylonjs-node-editor";
import { NodeMaterial, NullEngine, Scene } from "babylonjs";

import { ToolbarComponent } from "../../../ui/toolbar";

import { Toaster } from "../../../ui/shadcn/ui/sonner";

import "babylonjs-loaders";

export interface INodeMaterialEditorWindowProps {
    filePath: string;
}

export default class NodeMaterialEditorWindow extends Component<INodeMaterialEditorWindowProps> {
    private _divRef: HTMLDivElement | null = null;

    private _nodeMaterial: NodeMaterial | null = null;

    public constructor(props: INodeMaterialEditorWindowProps) {
        super(props);
    }

    public render(): ReactNode {
        return (
            <>
                <div className="flex flex-col w-screen h-screen">
                    <ToolbarComponent>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="flex flex-col items-center select-none">
                                <div className="font-semibold text-lg">
                                    Node Material Editor
                                </div>
                                <div className="font-thin text-sm w-full overflow-hidden whitespace-nowrap text-ellipsis">
                                    ...{this.props.filePath.substring(this.props.filePath.length - 60)}
                                </div>
                            </div>
                        </div>
                    </ToolbarComponent>

                    <div ref={(r) => this._divRef = r} className="w-full h-full overflow-hidden" />
                </div>

                <Toaster />
            </>
        );
    }

    public async componentDidMount(): Promise<void> {
        if (!this._divRef) {
            return;
        }

        // Force dark theme here as Node Material Editor doesn't support light theme
        if (!document.body.classList.contains("dark")) {
            document.body.classList.add("dark");
        }

        const data = await readJSON(this.props.filePath);

        const engine = new NullEngine();
        const scene = new Scene(engine);

        this._nodeMaterial = NodeMaterial.Parse(data, scene);
        this._nodeMaterial.uniqueId = data.uniqueId;

        NodeEditor.Show({
            hostElement: this._divRef,
            nodeMaterial: this._nodeMaterial,
            customSave: {
                label: "Save",
                action: () => this._save(),
            },
        });

        ipcRenderer.on("save", () => this._save());

        ipcRenderer.on("editor:close-window", () => this.close());
    }

    public close(): void {
        ipcRenderer.send("window:close");
    }

    private async _save(): Promise<void> {
        if (!this._nodeMaterial) {
            return;
        }

        this._nodeMaterial.build(false);

        NodeEditor["_CurrentState"].stateManager.onRebuildRequiredObservable.notifyObservers();

        const data = this._nodeMaterial.serialize();
        await writeJSON(this.props.filePath, data, { spaces: 4 });

        toast.success("Material saved");

        ipcRenderer.send("editor:asset-updated", "material", data);
    }
}
