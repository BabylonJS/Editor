import { extname, join, dirname } from "path/posix";

import { Component, DragEvent, ReactNode } from "react";

import { Editor } from "../../../main";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { EditorInspectorSectionField } from "../fields/section";

import { InspectorScriptField } from "./field";

export interface IScriptInspectorComponent {
    object: any;
    editor: Editor;
}

export interface IScriptInspectorComponentState {
    dragOver: boolean;
    scriptFound: boolean;
}

export class ScriptInspectorComponent extends Component<IScriptInspectorComponent, IScriptInspectorComponentState> {
    public constructor(props: IScriptInspectorComponent) {
        super(props);

        this.state = {
            dragOver: false,
            scriptFound: true,
        };
    }

    public render(): ReactNode {
        return (
            <EditorInspectorSectionField title="Scripts">
                {this.props.object.metadata?.scripts?.map((script: any, index: number) => (
                    <InspectorScriptField key={`${script}_${index}`} script={script} onRemove={() => this._handleRemoveScript(index)} />
                ))}

                {this._getEmptyComponent()}
            </EditorInspectorSectionField>
        );
    }

    private _handleRemoveScript(index: number): void {
        const script = this.props.object.metadata?.scripts?.[index];

        registerUndoRedo({
            executeRedo: true,
            undo: () => this.props.object.metadata?.scripts?.splice(index, 0, script),
            redo: () => this.props.object.metadata?.scripts?.splice(index, 1),
        });

        this.forceUpdate();
    }

    private _getEmptyComponent(): ReactNode {
        return (
            <div
                onDrop={((ev) => this._handleDropEmptyComponent(ev))}
                onDragLeave={(() => this.setState({ dragOver: false }))}
                onDragOver={((ev) => this._handleDragOverEmptyComponent(ev))}
                className={`flex flex-col justify-center items-center w-full h-[64px] rounded-lg border-[1px] border-secondary-foreground/35 border-dashed ${this.state.dragOver ? "bg-secondary-foreground/35" : ""} transition-all duration-300 ease-in-out`}
            >
                <div>
                    Drag'n'drop a script here
                </div>
            </div>
        );
    }

    private _handleDragOverEmptyComponent(ev: DragEvent<HTMLDivElement>): void {
        ev.preventDefault();
        ev.stopPropagation();

        this.setState({ dragOver: true });
    }

    private _handleDropEmptyComponent(ev: DragEvent<HTMLDivElement>): void {
        ev.preventDefault();
        ev.stopPropagation();

        this.setState({ dragOver: false });

        if (!this.props.editor.state.projectPath) {
            return;
        }

        const absolutePaths = JSON.parse(ev.dataTransfer.getData("assets")) as string[];
        if (!Array.isArray(absolutePaths)) {
            return;
        }

        const files = absolutePaths.filter((path) => {
            const extension = extname(path).toLowerCase();
            return extension === ".ts" || extension === ".tsx";
        });

        if (!files.length) {
            return;
        }

        const projectDir = dirname(this.props.editor.state.projectPath!);

        this.props.object.metadata ??= {};
        this.props.object.metadata.scripts ??= [];

        files.forEach((file) => {
            const relativePath = file.replace(join(projectDir, "/src/"), "").replace(/\\/g, "/");
            if (relativePath === file) {
                return;
            }

            if (this.props.object.metadata.scripts.find((script) => script.key === relativePath)) {
                return;
            }

            registerUndoRedo({
                executeRedo: true,
                undo: () => this.props.object.metadata.scripts.pop(),
                redo: () => {
                    this.props.object.metadata.scripts.push({
                        enabled: true,
                        key: relativePath,
                    });
                },
            });
        });

        this.forceUpdate();
    }
}
