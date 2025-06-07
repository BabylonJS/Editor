import { clipboard } from "electron";

import { FaCopy } from "react-icons/fa";
import { Component, ReactNode } from "react";

import { toast } from "sonner";

import { Sound } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";

import { isSound } from "../../../../tools/guards/sound";
import { reloadSound } from "../../../../tools/sound/tools";
import { registerUndoRedo } from "../../../../tools/undoredo";

import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

import { EditorSpatialSoundInspectorComponent } from "./spatial";
import { IEditorInspectorImplementationProps } from "../inspector";

export class EditorSoundInspector extends Component<IEditorInspectorImplementationProps<Sound>> {
    /**
     * Returns whether or not the given object is supported by this inspector.
     * @param object defines the object to check.
     * @returns true if the object is supported by this inspector.
     */
    public static IsSupported(object: unknown): boolean {
        return isSound(object);
    }

    public render(): ReactNode {
        return (
            <>
                <EditorInspectorSectionField title="Common">
                    <div className="flex justify-between items-center px-2 py-2">
                        <div className="w-1/2">
                            Name
                        </div>

                        <div className="flex justify-between items-center w-full">
                            <div className="text-white/50">
                                {this.props.object.name}
                            </div>

                            <Button variant="ghost" onClick={() => this._handleCopyName()}>
                                <FaCopy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <EditorInspectorNumberField
                        noUndoRedo
                        min={0}
                        max={1}
                        label="Volume"
                        property="value"
                        object={{ value: this.props.object.getVolume() }}
                        onChange={(value) => this.props.object.setVolume(value)}
                        onFinishChange={(value, oldValue) => {
                            registerUndoRedo({
                                executeRedo: true,
                                undo: () => this.props.object.setVolume(oldValue),
                                redo: () => this.props.object.setVolume(value),
                            });
                        }}
                    />

                    <Button
                        variant={this.props.object.isPlaying ? "default" : "secondary"}
                        onClick={() => this.props.object.isPlaying ? this._handleStop() : this._handlePlay()}
                    >
                        {this.props.object.isPlaying ? "Stop" : "Play"}
                    </Button>
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Helpers">
                    <Button variant="ghost" onClick={() => this._handleReload()}>
                        Reload
                    </Button>
                </EditorInspectorSectionField>

                {this.props.object.spatialSound &&
                    <EditorSpatialSoundInspectorComponent sound={this.props.object} />
                }
            </>
        );
    }

    public componentWillUnmount(): void {
        this.props.object.stop();
    }

    private _handleCopyName(): void {
        clipboard.writeText(this.props.object.name);
        toast.success("Name copied to clipboard.");
    }

    private _handlePlay(): void {
        this.props.object.stop();
        this.props.object.play(0, 0);
        this.forceUpdate();
    }

    private _handleStop(): void {
        this.props.object.pause();
        this.forceUpdate();
    }

    private _handleReload(): void {
        this.props.editor.layout.inspector.setEditedObject(
            reloadSound(this.props.editor, this.props.object),
        );
    }
}
