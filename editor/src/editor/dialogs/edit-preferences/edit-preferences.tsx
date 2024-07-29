import { Component, ReactNode } from "react";

import { Label } from "../../../ui/shadcn/ui/label";
import { Separator } from "../../../ui/shadcn/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/shadcn/ui/select";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../ui/shadcn/ui/alert-dialog";

import { EditorInspectorKeyField } from "../../layout/inspector/fields/key";

import { Editor } from "../../main";

export interface IEditorEditPreferencesComponentProps {
    /**
     * Defines the editor reference.
     */
    editor: Editor;
    /**
     * Defines if the dialog is open.
     */
    open: boolean;
    onClose: () => void;
}

export interface IEditorEditPreferencesComponentState {
    theme: "light" | "dark";
}

export class EditorEditPreferencesComponent extends Component<IEditorEditPreferencesComponentProps, IEditorEditPreferencesComponentState> {
    public constructor(props: IEditorEditPreferencesComponentProps) {
        super(props);

        this.state = {
            theme: document.body.classList.contains("dark") ? "dark" : "light",
        };
    }

    public render(): ReactNode {
        return (
            <AlertDialog open={this.props.open}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-3xl font-[400]">
                            Edit Preferences
                        </AlertDialogTitle>
                        <AlertDialogDescription className="flex flex-col gap-[20px]">
                            <Separator />
                            {this._getThemesComponent()}
                            <Separator />
                            {this._getCameraControlPreferences()}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => this.props.onClose()}>Close</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    private _getThemesComponent(): ReactNode {
        return (
            <div className="flex flex-col gap-[10px] w-full">
                <div className="flex flex-col gap-[10px]">
                    <Label className="text-xl font-[400]">Theme</Label>
                    <Select
                        value={this.state.theme}
                        onValueChange={(v) => {
                            this.setState({ theme: v as any });

                            if (v === "light") {
                                document.body.classList.remove("dark");
                            } else {
                                document.body.classList.add("dark");
                            }

                            localStorage.setItem("editor-theme", v);
                        }}
                    >
                        <SelectTrigger className="">
                            <SelectValue placeholder="Select Value..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        );
    }

    private _getCameraControlPreferences(): ReactNode {
        const camera = this.props.editor.layout?.preview?.camera;
        if (!camera) {
            return false;
        }

        return (
            <div>
                <div className="flex flex-col gap-[10px] w-full">
                    <div className="flex flex-col gap-[10px]">
                        <Label className="text-xl font-[400]">Editor camera control</Label>

                        <EditorInspectorKeyField value={camera.keysUp[0]?.toString() ?? ""} label="Forward" onChange={(v) => {
                            camera.keysUp = [v];
                            this._saveCameraControls();
                        }} />
                        <EditorInspectorKeyField value={camera.keysDown[0]?.toString() ?? ""} label="Backward" onChange={(v) => {
                            camera.keysDown = [v];
                            this._saveCameraControls();
                        }} />

                        <EditorInspectorKeyField value={camera.keysLeft[0]?.toString() ?? ""} label="Left" onChange={(v) => {
                            camera.keysLeft = [v];
                            this._saveCameraControls();
                        }} />
                        <EditorInspectorKeyField value={camera.keysRight[0]?.toString() ?? ""} label="Right" onChange={(v) => {
                            camera.keysRight = [v];
                            this._saveCameraControls();
                        }} />

                        <EditorInspectorKeyField value={camera.keysUpward[0]?.toString() ?? ""} label="Up" onChange={(v) => {
                            camera.keysUpward = [v];
                            this._saveCameraControls();
                        }} />
                        <EditorInspectorKeyField value={camera.keysDownward[0]?.toString() ?? ""} label="Down" onChange={(v) => {
                            camera.keysDownward = [v];
                            this._saveCameraControls();
                        }} />
                    </div>
                </div>
            </div>
        );
    }

    private _saveCameraControls(): void {
        const camera = this.props.editor.layout?.preview?.camera;
        if (!camera) {
            return;
        }

        try {
            localStorage.setItem("editor-camera-controls", JSON.stringify({
                keysUp: camera.keysUp,
                keysDown: camera.keysDown,
                keysLeft: camera.keysLeft,
                keysRight: camera.keysRight,
                keysUpward: camera.keysUpward,
                keysDownward: camera.keysDownward,
            }));
        } catch (e) {
            this.props.editor.layout.console.error("Failed to write editor's camera controls configuration.");
            if (e.message) {
                this.props.editor.layout.console.error(e.message);
            }
        }
    }
}
