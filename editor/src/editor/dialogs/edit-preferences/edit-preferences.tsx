import { Component, ReactNode } from "react";

import { Label } from "../../../ui/shadcn/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/shadcn/ui/select";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../ui/shadcn/ui/alert-dialog";

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
                        <AlertDialogTitle>
                            Edit Preferences
                        </AlertDialogTitle>
                        <AlertDialogDescription className="flex flex-col gap-[10px]">
                            {this._getThemesComponent()}
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
                    <Label>Theme</Label>
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
}
