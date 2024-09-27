import { Component, ReactNode } from "react";

import { Animation, Color3, Color4, IAnimationKey, Quaternion, Vector2, Vector3 } from "babylonjs";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getAnimationTypeForObject } from "../../../../tools/animation/tools";

import { EditorInspectorColorField } from "../../inspector/fields/color";
import { EditorInspectorNumberField } from "../../inspector/fields/number";
import { EditorInspectorVectorField } from "../../inspector/fields/vector";
import { EditorInspectorSwitchField } from "../../inspector/fields/switch";
import { EditorInspectorSectionField } from "../../inspector/fields/section";

import { EditorAnimation } from "../../animation";
import { ICinematicKey, ICinematicKeyCut } from "../cinematic/typings";

export interface IEditorAnimationInspectorProps {
    animationEditor: EditorAnimation;
}

export interface IEditorAnimationInspectorState {
    animationKey: IAnimationKey | null;
    cinematicKey: ICinematicKey | ICinematicKeyCut | null;
}

export class EditorAnimationInspector extends Component<IEditorAnimationInspectorProps, IEditorAnimationInspectorState> {
    public constructor(props: IEditorAnimationInspectorProps) {
        super(props);

        this.state = {
            animationKey: null,
            cinematicKey: null,
        };
    }

    public render(): ReactNode {
        return (
            <div
                className={`
                    absolute top-0 right-0 w-96 h-full p-2 bg-background border-l-primary-foreground border-l-4
                    ${this.state.animationKey ? "translate-x-0" : "opacity-0 translate-x-full pointer-events-none"}
                    transition-all duration-150 ease-in-out
                `}
            >
                {this._getKeyInspector()}
            </div>
        );
    }

    /**
     * Sets the rerefence to the key to edit.
     * @param key defines the reference to the key to edit.
     */
    public setEditedAnimationKey(key: IAnimationKey | null): void {
        if (key !== this.state.animationKey) {
            this.setState({
                animationKey: key,
                cinematicKey: null,
            });
        }
    }

    /**
     * Sets the reference to the key to edit.
     * @param key defines the reference to the key to edit.
     */
    public setEditedCinematicKey(key: ICinematicKey | ICinematicKeyCut | null): void {
        if (key !== this.state.cinematicKey) {
            this.setState({
                cinematicKey: key,
                animationKey: null,
            });
        }
    }

    private _getKeyInspector(): ReactNode {
        if (!this.state.animationKey) {
            return null;
        }

        const animationType = getAnimationTypeForObject(this.state.animationKey.value);

        return (
            <div className="flex flex-col gap-2 h-full">
                <div className="mx-auto font-semibold text-xl py-2">
                    Key
                </div>

                <EditorInspectorSectionField title="Properties">
                    <EditorInspectorNumberField object={this.state.animationKey} property="frame" label="Frame" step={1} min={0} onChange={() => {
                        this.props.animationEditor.timelines.forceUpdate();
                        this.props.animationEditor.timelines.updateTracksAtCurrentTime();
                    }} />

                    {animationType === Animation.ANIMATIONTYPE_FLOAT &&
                        <EditorInspectorNumberField object={this.state.animationKey} property="value" label="Value" onChange={() => this.props.animationEditor.timelines.updateTracksAtCurrentTime()} />
                    }

                    {animationType === Animation.ANIMATIONTYPE_VECTOR3 &&
                        <EditorInspectorVectorField object={this.state.animationKey} property="value" label="Value" onChange={() => this.props.animationEditor.timelines.updateTracksAtCurrentTime()} />
                    }

                    {(animationType === Animation.ANIMATIONTYPE_COLOR3 || animationType === Animation.ANIMATIONTYPE_COLOR4) &&
                        <EditorInspectorColorField label={<div className="w-14">Value</div>} object={this.state.animationKey} property="value" onChange={() => this.props.animationEditor.timelines.updateTracksAtCurrentTime()} />
                    }
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Tangents">
                    <EditorInspectorSwitchField label="In Tangents" object={{ checked: (this.state.animationKey.inTangent ?? null) !== null }} property="checked" noUndoRedo onChange={(v) => {
                        registerSimpleUndoRedo({
                            object: this.state.animationKey,
                            property: "inTangent",
                            oldValue: this.state.animationKey?.inTangent,
                            newValue: v ? this._getTangentDefaultValue(this.state.animationKey!) : undefined,
                            executeRedo: true,
                        });

                        this.forceUpdate();
                    }} />

                    {(this.state.animationKey.inTangent ?? null) !== null && this._getTangentInspector(this.state.animationKey, "inTangent")}

                    <EditorInspectorSwitchField label="Out Tangents" object={{ checked: (this.state.animationKey.outTangent ?? null) !== null }} property="checked" noUndoRedo onChange={(v) => {
                        registerSimpleUndoRedo({
                            object: this.state.animationKey,
                            property: "outTangent",
                            oldValue: this.state.animationKey?.outTangent,
                            newValue: v ? this._getTangentDefaultValue(this.state.animationKey!) : undefined,
                            executeRedo: true,
                        });

                        this.forceUpdate();
                    }} />

                    {(this.state.animationKey.outTangent ?? null) !== null && this._getTangentInspector(this.state.animationKey, "outTangent")}
                </EditorInspectorSectionField>
            </div>
        );
    }

    private _getTangentDefaultValue(key: IAnimationKey): number | Vector2 | Vector3 | Quaternion | Color3 | Color4 | null {
        const animationType = getAnimationTypeForObject(key.value);

        switch (animationType) {
            case Animation.ANIMATIONTYPE_FLOAT: return 0;
            case Animation.ANIMATIONTYPE_VECTOR2: return Vector2.Zero();
            case Animation.ANIMATIONTYPE_VECTOR3: return Vector3.Zero();
            case Animation.ANIMATIONTYPE_QUATERNION: return Quaternion.Zero();
            case Animation.ANIMATIONTYPE_COLOR3: return Color3.Black();
            case Animation.ANIMATIONTYPE_COLOR4: return Color3.Black().toColor4(0);
            default: return null;
        }
    }

    private _getTangentInspector(key: IAnimationKey, property: "inTangent" | "outTangent"): ReactNode {
        const animationType = getAnimationTypeForObject(key.value);

        switch (animationType) {
            case Animation.ANIMATIONTYPE_FLOAT:
                return <EditorInspectorNumberField object={key} property={property} onChange={() => this.props.animationEditor.timelines.updateTracksAtCurrentTime()} />;
            case Animation.ANIMATIONTYPE_VECTOR3:
                return <EditorInspectorVectorField object={key} property={property} onChange={() => this.props.animationEditor.timelines.updateTracksAtCurrentTime()} />;

            case Animation.ANIMATIONTYPE_COLOR3:
            case Animation.ANIMATIONTYPE_COLOR4:
                return <EditorInspectorColorField object={key} property={property} noColorPicker noClamp onChange={() => this.props.animationEditor.timelines.updateTracksAtCurrentTime()} />;
            default: return null;
        }
    }
}
