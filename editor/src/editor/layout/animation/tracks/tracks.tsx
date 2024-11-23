import { Component, ReactNode } from "react";
import { AiOutlinePlus } from "react-icons/ai";

import { Animation, IAnimatable } from "babylonjs";

import { showAlert } from "../../../../ui/dialog";

import { Button } from "../../../../ui/shadcn/ui/button";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { getInspectorPropertyValue } from "../../../../tools/property";
import { getAnimationTypeForObject } from "../../../../tools/animation/tools";

import { EditorAnimation } from "../../animation";

import { showAddTrackPrompt } from "./add";
import { EditorAnimationTrackItem } from "./item";

export interface IEditorAnimationTracksPanelProps {
    animatable: IAnimatable | null;
    animationEditor: EditorAnimation;
}

export class EditorAnimationTracksPanel extends Component<IEditorAnimationTracksPanelProps> {
    public render(): ReactNode {
        if (this.props.animatable) {
            return this._getAnimationsList(this.props.animatable.animations!);
        }

        return this._getEmpty();
    }

    private _getEmpty(): ReactNode {
        return (
            <div className="flex justify-center items-center text-center font-semibold text-xl w-96 h-full">
                No object selected.
            </div>
        );
    }

    private _getAnimationsList(animations: Animation[]): ReactNode {
        return (
            <div className="flex flex-col w-96 h-full">
                <div className="flex justify-between items-center w-full h-10 p-2">
                    <div className="font-thin text-muted-foreground">
                        ({animations.length} tracks)
                    </div>

                    <Button variant="ghost" className="w-8 h-8 p-1" onClick={() => this.addTrack()}>
                        <AiOutlinePlus className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex flex-col w-full">
                    {animations.map((animation, index) => (
                        <EditorAnimationTrackItem
                            key={`${animation.targetProperty}${index}`}
                            animation={animation}
                            animationEditor={this.props.animationEditor}
                            onRemove={(animation) => this._handleRemoveTrack(animation)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    /**
     * Shows a prompt to add a new track to the animatable object.
     * Aka. animate a property on the currently selected animatable.
     */
    public async addTrack(): Promise<unknown> {
        const animatable = this.props.animatable;
        if (!animatable) {
            return;
        }

        const property = await showAddTrackPrompt(animatable);
        if (!property) {
            return;
        }

        const value = getInspectorPropertyValue(animatable, property);
        if (value === null || value === undefined) {
            return showAlert("Property not found", `The property to animate "${property}" was not found on the object.`);
        }

        const existingAnimation = animatable.animations?.find((a) => a.targetProperty === property);
        if (existingAnimation) {
            return showAlert("Property already animated", `The property "${property}" is already animated and cannot be animated twice.`);
        }

        const animationType = getAnimationTypeForObject(value);
        if (animationType === null) {
            return showAlert("Invalid property", (
                <div>
                    The property "{property}" is not animatable.
                    <br />
                    Only the following types are supported:
                    <br />
                    <ul className="list-disc p-5">
                        <li>Number</li>
                        <li>Vector2</li>
                        <li>Vector3</li>
                        <li>Quaternion</li>
                        <li>Color3</li>
                        <li>Color4</li>
                    </ul>
                </div>
            ));
        }

        const animation = new Animation(property, property, 60, animationType, 0, false);
        animation.setKeys([
            { frame: 0, value: value.clone?.() ?? value },
            { frame: 60, value: value.clone?.() ?? value },
        ]);

        registerUndoRedo({
            undo: () => {
                const index = animatable.animations?.indexOf(animation) ?? -1;
                if (index !== -1) {
                    animatable.animations?.splice(index, 1);
                }
            },
            redo: () => {
                animatable.animations?.push(animation);
            },
            executeRedo: true,
        });

        this.props.animationEditor.forceUpdate();
    }

    private _handleRemoveTrack(animation: Animation): void {
        const animatable = this.props.animatable;
        if (!animatable) {
            return;
        }

        const index = animatable.animations?.indexOf(animation) ?? -1;
        if (index === -1) {
            return;
        }

        registerUndoRedo({
            executeRedo: true,
            undo: () => {
                animatable.animations?.splice(index, 0, animation);
            },
            redo: () => {
                animatable.animations?.splice(index, 1);
            },
        });

        this.props.animationEditor.forceUpdate();
    }
}
