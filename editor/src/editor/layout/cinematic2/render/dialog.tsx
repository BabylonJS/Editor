import { Component, ReactNode } from "react";

import { AnimationGroup } from "babylonjs";
import { generateCinematicAnimationGroup } from "babylonjs-editor-tools";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../../ui/shadcn/ui/alert-dialog";

import { EditorInspectorNumberField } from "../../inspector/fields/number";

import { CinematicEditor } from "../editor";

export interface ICinematicEditorRenderDialogProps {
    cinematicEditor: CinematicEditor;
    onRender: (from: number, to: number) => void;
}

export interface ICinematicEditorRenderDialogState {
    open: boolean;
    animationGroup: AnimationGroup | null;
}

export class CinematicEditorRenderDialog extends Component<ICinematicEditorRenderDialogProps, ICinematicEditorRenderDialogState> {
    private _from: number = 0;
    private _to: number = 0;

    public constructor(props: ICinematicEditorRenderDialogProps) {
        super(props);

        this.state = {
            open: false,
            animationGroup: null,
        };
    }

    public render(): ReactNode {
        return (
            <AlertDialog open={this.state.open} onOpenChange={(o) => !o && this.close()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Render cinematic
                        </AlertDialogTitle>
                        <AlertDialogDescription className="flex flex-col gap-2 py-5">
                            {/* Range */}
                            {this.state.animationGroup &&
                                <div className="flex flex-col gap-2">
                                    <EditorInspectorNumberField noUndoRedo object={this} property="_from" label="Start frame" step={1} min={this.state.animationGroup.from} max={this.state.animationGroup.to} />
                                    <EditorInspectorNumberField noUndoRedo object={this} property="_to" label="End frame" step={1} min={this.state.animationGroup.from} max={this.state.animationGroup.to} />
                                </div>
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="min-w-24" onClick={() => this.close()}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction className="min-w-24" onClick={() => this.props.onRender(this._from, this._to)}>
                            Render
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    public open(): void {
        this.props.cinematicEditor.prepareTemporaryAnimationGroup();

        const animationGroup = generateCinematicAnimationGroup(
            this.props.cinematicEditor.cinematic,
            this.props.cinematicEditor.editor.layout.preview.scene as any,
        ) as any;

        if (this._from === 0) {
            this._from = animationGroup.from;
        } else if (this._from < animationGroup.from) {
            this._from = animationGroup.from;
        }

        if (this._to === 0) {
            this._to = animationGroup.to;
        } else if (this._to > animationGroup.to) {
            this._to = animationGroup.to;
        }

        this.setState({
            open: true,
            animationGroup,
        });
    }

    public close(): void {
        this.state.animationGroup?.dispose();

        this.setState({
            open: false,
            animationGroup: null,
        });
    }
}
