import { readJSON } from "fs-extra";
import { extname } from "path/posix";

import { Component, DragEvent, ReactNode } from "react";

import { MdOutlineQuestionMark } from "react-icons/md";

import { Material } from "babylonjs";

import { Editor } from "../../../main";

import { loadImportedMaterial } from "../../preview/import/import";

import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

import { decalsConfiguration } from "./configuration";

export interface IEditorDecalsInspectorProps {
    editor: Editor;
}

export interface IEditorDecalsInspectorState {
    dragOver: boolean;
    material: Material | null;
}

export class EditorDecalsInspector extends Component<IEditorDecalsInspectorProps, IEditorDecalsInspectorState> {
    private _mouseMoveListener: ((event: MouseEvent) => void) | null = null;
    private _mouseDownListener: ((event: MouseEvent) => void) | null = null;
    private _mouseUpListener: ((event: MouseEvent) => void) | null = null;

    public constructor(props: IEditorDecalsInspectorProps) {
        super(props);

        this.state = {
            dragOver: false,
            material: null,
        };
    }

    public render(): ReactNode {
        if (!this.props.editor.state.enableExperimentalFeatures) {
            return (
                <div className="text-xl font-semibold text-center w-full">
                    Coming soon...
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-2 w-full h-full">
                {this._getMaterialDragAndDropComponent()}

                <EditorInspectorSectionField title="Options">
                    <EditorInspectorNumberField object={decalsConfiguration} property="angle" asDegrees label="Angle" />
                </EditorInspectorSectionField>
            </div>
        );
    }

    public componentDidMount(): void {
        const canvas = this.props.editor.layout.preview.engine.getRenderingCanvas()!;

        canvas.addEventListener("mousemove", this._mouseMoveListener = (_event) => {
            // TODO
        });

        canvas.addEventListener("mousedown", this._mouseDownListener = (_event) => {
            // TODO
        });

        canvas.addEventListener("mouseup", this._mouseUpListener = (_event) => {
            // TODO
        });

        // Load existing material
        if (decalsConfiguration.materialPath) {
            this._loadMaterialFromPath(decalsConfiguration.materialPath);
        }
    }

    public componentWillUnmount(): void {
        const canvas = this.props.editor.layout.preview.engine.getRenderingCanvas()!;

        canvas.removeEventListener("mousemove", this._mouseMoveListener!);
        canvas.removeEventListener("mousedown", this._mouseDownListener!);
        canvas.removeEventListener("mouseup", this._mouseUpListener!);
    }

    private _getMaterialDragAndDropComponent(): ReactNode {
        return (
            <div
                className={`
                    flex gap-2 w-full h-24 rounded-lg
                    ${this.state.dragOver ? "bg-secondary" : ""}
                    transition-all duration-300 ease-in-out
                `}
                onDragOver={(ev) => {
                    ev.preventDefault();
                    this.setState({ dragOver: true });
                }}
                onDrop={(ev) => this._handleAssetDropped(ev)}
                onDragLeave={() => this.setState({ dragOver: false })}
            >
                <div
                    className={`
                        flex justify-center items-center w-24 h-24 rounded-lg
                        ${decalsConfiguration.materialPath ? "" : "bg-accent"}
                    `}
                >
                    {!decalsConfiguration.materialPath &&
                        <MdOutlineQuestionMark className="w-8 h-8" />
                    }
                </div>

                <div className="flex flex-1 flex-col gap-2 justify-center items-center">
                    <div className="text-xl font-semibold text-center w-full">
                        No material set
                    </div>
                    <div className="font-thin">
                        Drag and drop a material asset here.
                    </div>
                </div>
            </div>
        );
    }

    private async _handleAssetDropped(ev: DragEvent<HTMLDivElement>): Promise<void> {
        this.setState({ dragOver: false });

        const assets = ev.dataTransfer.getData("assets");
        if (!assets) {
            return;
        }

        const assetAbsolutePath = JSON.parse(assets)[0] as string;
        const extension = extname(assetAbsolutePath).toLowerCase();

        if (extension !== ".material") {
            return;
        }

        await this._loadMaterialFromPath(assetAbsolutePath);

        decalsConfiguration.materialPath = assetAbsolutePath;
    }

    private async _loadMaterialFromPath(path: string): Promise<void> {
        const data = await readJSON(path);
        const scene = this.props.editor.layout.preview.scene;

        let material = scene.getMaterialById(data.id);
        if (!material) {
            material = await loadImportedMaterial(scene, path);
        }

        this.setState({ material });
    }
}
