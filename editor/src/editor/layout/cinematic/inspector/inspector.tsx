import { Component, ReactNode } from "react";

import { Animation, AnimationGroup, IAnimationKey } from "babylonjs";

import { CinematicEditor } from "../editor";

import { EditorInspectorColorField } from "../../inspector/fields/color";
import { EditorInspectorVectorField } from "../../inspector/fields/vector";
import { EditorInspectorNumberField } from "../../inspector/fields/number";
import { EditorInspectorSectionField } from "../../inspector/fields/section";

import { getAnimationTypeForObject } from "../../../../tools/animation/tools";

import { isCinematicGroup, isCinematicKey, isCinematicKeyCut } from "../schema/guards";
import { ICinematicAnimationGroup, ICinematicKey, ICinematicKeyCut, ICinematicTrack } from "../schema/typings";

export interface ICinematicEditorInspectorProps {
    /**
     * Defines the reference to the editor.
     */
    cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorInspectorState {
    track: ICinematicTrack | null;
    key: ICinematicKey | ICinematicKeyCut | ICinematicAnimationGroup | null;
}

export class CinematicEditorInspector extends Component<ICinematicEditorInspectorProps, ICinematicEditorInspectorState> {
    public constructor(props: ICinematicEditorInspectorProps) {
        super(props);

        this.state = {
            key: null,
            track: null,
        };
    }

    public render(): ReactNode {
        return (
            <div
                className={`
                absolute top-0 right-0 w-96 h-full p-2 bg-background border-l-primary-foreground border-l-4
                ${this.state.key ? "translate-x-0" : "opacity-0 translate-x-full pointer-events-none"}
                transition-all duration-150 ease-in-out
            `}
            >
                {this._getInspectorContent()}
            </div>
        );
    }

    /**
     * Sets the rerefence to the key to edit.
     * @param key defines the reference to the key to edit.
     */
    public setEditedKey(
        track: ICinematicTrack | null,
        key: ICinematicKey | ICinematicKeyCut | ICinematicAnimationGroup | null,
    ): void {
        if (key !== this.state.key) {
            this.setState({ track, key });
        }
    }

    private _getInspectorContent(): ReactNode {
        if (!this.state.key) {
            return null;
        }

        return (
            <div className="flex flex-col gap-2 h-full">
                <div className="mx-auto font-semibold text-xl py-2">
                    {this._getTitle(this.state.key)}
                </div>

                {isCinematicKey(this.state.key) &&
                    <EditorInspectorSectionField title="Properties">
                        {this._getKeyInspector(this.state.key)}
                    </EditorInspectorSectionField>
                }

                {isCinematicKeyCut(this.state.key) && this._getKeyCutInspector(this.state.key)}

                {isCinematicGroup(this.state.key) &&
                    <EditorInspectorSectionField title="Properties">
                        {this._getKeyGroupInspector(this.state.key)}
                    </EditorInspectorSectionField>
                }
            </div>
        );
    }

    private _getTitle(key: ICinematicKey | ICinematicKeyCut | ICinematicAnimationGroup): string {
        switch (key.type) {
            case "key": return "Key";
            case "cut": return "Key Cut";
            case "group": return "Group";
        }
    }

    private _getKeyInspector(key: IAnimationKey): ReactNode {
        const animationType = getAnimationTypeForObject(key.value);

        return (
            <>
                <EditorInspectorNumberField object={key} property="frame" label="Frame" step={1} min={0} onChange={() => {
                    this.props.cinematicEditor.timelines.forceUpdate();
                    this.props.cinematicEditor.timelines.updateTracksAtCurrentTime();
                }} />

                {animationType === Animation.ANIMATIONTYPE_FLOAT &&
                    <EditorInspectorNumberField object={key} property="value" label="Value" onChange={() => this.props.cinematicEditor.timelines.updateTracksAtCurrentTime()} />
                }

                {animationType === Animation.ANIMATIONTYPE_VECTOR3 &&
                    <EditorInspectorVectorField object={key} property="value" label="Value" onChange={() => this.props.cinematicEditor.timelines.updateTracksAtCurrentTime()} />
                }

                {(animationType === Animation.ANIMATIONTYPE_COLOR3 || animationType === Animation.ANIMATIONTYPE_COLOR4) &&
                    <EditorInspectorColorField label={<div className="w-14">Value</div>} object={key} property="value" onChange={() => this.props.cinematicEditor.timelines.updateTracksAtCurrentTime()} />
                }
            </>
        );
    }

    private _getKeyCutInspector(key: ICinematicKeyCut): ReactNode {
        return (
            <>
                <EditorInspectorSectionField title="Last Frame">
                    {this._getKeyInspector(key.key1)}
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="New Frame">
                    {this._getKeyInspector(key.key2)}
                </EditorInspectorSectionField>
            </>
        );
    }

    private _getKeyGroupInspector(key: ICinematicAnimationGroup): ReactNode {
        const animationGroup = this.state.track?.animationGroup as AnimationGroup;
        if (!animationGroup) {
            return null;
        }

        return (
            <>
                <EditorInspectorNumberField object={key} property="frame" label="Frame" step={1} min={0} onChange={() => {
                    this.props.cinematicEditor.timelines.forceUpdate();
                    this.props.cinematicEditor.timelines.updateTracksAtCurrentTime();
                }} />

                <EditorInspectorNumberField object={key} property="startFrame" label="Start Frame" step={1} min={animationGroup.from} max={key.endFrame} onChange={() => {
                    this.forceUpdate();
                    this.props.cinematicEditor.timelines.forceUpdate();
                    this.props.cinematicEditor.timelines.updateTracksAtCurrentTime();
                }} />

                <EditorInspectorNumberField object={key} property="endFrame" label="End Frame" step={1} min={key.startFrame} max={animationGroup.to} onChange={() => {
                    this.forceUpdate();
                    this.props.cinematicEditor.timelines.forceUpdate();
                    this.props.cinematicEditor.timelines.updateTracksAtCurrentTime();
                }} />
            </>
        );
    }
}
