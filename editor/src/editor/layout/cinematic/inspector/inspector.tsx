import { Component, ReactNode } from "react";

import { Icon, NonIdealState } from "@blueprintjs/core";

import {
    Animation, AnimationGroup, Color3, Color4, IAnimationKey, Quaternion, Vector2, Vector3, Sound,
} from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../ui/shadcn/ui/tabs";

import { getDefaultRenderingPipeline } from "../../../rendering/default-pipeline";

import { Editor } from "../../../main";

import { CinematicEditor } from "../editor";

import { EditorInspectorListField } from "../../inspector/fields/list";
import { EditorInspectorColorField } from "../../inspector/fields/color";
import { EditorInspectorVectorField } from "../../inspector/fields/vector";
import { EditorInspectorNumberField } from "../../inspector/fields/number";
import { EditorInspectorSwitchField } from "../../inspector/fields/switch";
import { EditorInspectorSectionField } from "../../inspector/fields/section";

import { getInspectorPropertyValue } from "../../../../tools/property";
import { getAnimationTypeForObject } from "../../../../tools/animation/tools";
import { registerSimpleUndoRedo, registerUndoRedo } from "../../../../tools/undoredo";

import { isCinematicGroup, isCinematicKey, isCinematicKeyCut, isCinematicKeyEvent, isCinematicSound } from "../schema/guards";
import { ICinematicKeyAnimationGroup, ICinematicKey, ICinematicKeyCut, ICinematicKeySound, ICinematicTrack, ICinematicKeyEvent } from "../schema/typings";

import { CinematicEventSetEnabled } from "../events/set-enabled";
import { CinematicEventApplyImpulse } from "../events/apply-impulse";

export interface ICinematicEditorInspectorProps {
    editor: Editor;
    cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorInspectorState {
    track: ICinematicTrack | null;
    key: ICinematicKey | ICinematicKeyCut | ICinematicKeyAnimationGroup | ICinematicKeySound | ICinematicKeyEvent | null;
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
            <div className="w-96 h-full p-2 bg-background border-l-primary-foreground border-l-2 rounded-l-xl">
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
        key: ICinematicKey | ICinematicKeyCut | ICinematicKeyAnimationGroup | null,
    ): void {
        if (key !== this.state.key) {
            this.setState({ track, key });
        }
    }

    private _getInspectorContent(): ReactNode {
        return (
            <div className="flex flex-col gap-2 w-96 h-full">
                {this.state.key &&
                    <>
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

                        {isCinematicSound(this.state.key) &&
                            <EditorInspectorSectionField title="Properties">
                                {this._getKeySoundInspector(this.state.key)}
                            </EditorInspectorSectionField>
                        }

                        {isCinematicKeyEvent(this.state.key) &&
                            <EditorInspectorSectionField title="Properties">
                                {this._keyKeyEventInspector(this.state.key)}
                            </EditorInspectorSectionField>
                        }
                    </>
                }

                {!this.state.key &&
                    <NonIdealState
                        icon={<Icon icon="search" size={96} />}
                        title={
                            <div className="text-white">
                                No key to edit
                            </div>
                        }
                    />
                }
            </div>
        );
    }

    private _getTitle(key: ICinematicKey | ICinematicKeyCut | ICinematicKeyAnimationGroup | ICinematicKeySound | ICinematicKeyEvent): string {
        switch (key.type) {
            case "key": return "Key";
            case "cut": return "Key Cut";
            case "group": return "Group";
            case "sound": return "Sound";
            case "event": return "Event";
        }
    }

    private _getKeyInspector(key: IAnimationKey): ReactNode {
        if (!this.state.track) {
            return null;
        }

        const animationType = getAnimationTypeForObject(key.value);

        return (
            <>
                <EditorInspectorNumberField object={key} property="frame" label="Frame" step={1} min={0} onChange={() => {
                    this.props.cinematicEditor.timelines.forceUpdate();
                    this.props.cinematicEditor.timelines.updateTracksAtCurrentTime();
                }} />

                {animationType === Animation.ANIMATIONTYPE_FLOAT &&
                    <EditorInspectorNumberField
                        object={key}
                        label="Value"
                        property="value"
                        step={
                            this.state.track.propertyPath === "depthOfField.focusDistance"
                                ? (this.props.editor.layout.preview.scene.activeCamera?.maxZ ?? 0) / 1000
                                : 0.01
                        }
                        onChange={() => this.props.cinematicEditor.timelines.updateTracksAtCurrentTime()}
                    />
                }

                {animationType === Animation.ANIMATIONTYPE_VECTOR3 &&
                    <EditorInspectorVectorField object={key} property="value" label="Value" onChange={() => this.props.cinematicEditor.timelines.updateTracksAtCurrentTime()} />
                }

                {(animationType === Animation.ANIMATIONTYPE_COLOR3 || animationType === Animation.ANIMATIONTYPE_COLOR4) &&
                    <EditorInspectorColorField label={<div className="w-14">Value</div>} object={key} property="value" onChange={() => this.props.cinematicEditor.timelines.updateTracksAtCurrentTime()} />
                }

                <Button variant="secondary" onClick={() => this._copyCurrentValue(key)}>
                    Set current value
                </Button>

                {this._getAnimationKeyTangentsInspector(key)}
            </>
        );
    }

    private _copyCurrentValue(key: IAnimationKey): void {
        const node = this.state.track?.defaultRenderingPipeline
            ? getDefaultRenderingPipeline()
            : this.state.track?.node;

        if (!this.state.key || !node || !this.state.track?.propertyPath) {
            return;
        }

        const oldValue = key.value.clone?.() ?? key.value;

        let newValue = getInspectorPropertyValue(node, this.state.track.propertyPath);
        newValue = newValue.clone?.() ?? newValue;

        registerUndoRedo({
            executeRedo: false,
            action: () => {
                this.props.cinematicEditor.timelines.updateTracksAtCurrentTime();
            },
            undo: () => {
                key.value = oldValue;
            },
            redo: () => {
                key.value = newValue;
            },
        });

        key.value = newValue;
        this.forceUpdate();
    }

    private _getKeyCutInspector(key: ICinematicKeyCut): ReactNode {
        return (
            <>
                <Tabs defaultValue="key1" className="w-full">
                    <TabsList className="w-full">
                        <TabsTrigger className="w-full" value="key1">Last Frame</TabsTrigger>
                        <TabsTrigger className="w-full" value="key2">New Frame</TabsTrigger>
                    </TabsList>

                    <TabsContent value="key1">
                        <EditorInspectorSectionField title="Properties">
                            {this._getKeyInspector(key.key1)}
                        </EditorInspectorSectionField>
                    </TabsContent>

                    <TabsContent value="key2">
                        <EditorInspectorSectionField title="Properties">
                            {this._getKeyInspector(key.key2)}
                        </EditorInspectorSectionField>
                    </TabsContent>
                </Tabs>
            </>
        );
    }

    private _getKeyGroupInspector(key: ICinematicKeyAnimationGroup): ReactNode {
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

                <EditorInspectorNumberField object={key} property="speed" label="Speed" step={0.01} min={0.1} onChange={() => {
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

    private _getKeySoundInspector(key: ICinematicKeySound): ReactNode {
        const sound = this.state.track?.sound as Sound;
        const buffer = sound?.getAudioBuffer();

        if (!sound || !buffer) {
            return null;
        }

        const endFrame = buffer.duration * this.props.cinematicEditor.props.cinematic.framesPerSecond;

        return (
            <>
                <EditorInspectorNumberField object={key} property="frame" label="Frame" step={1} min={0} onChange={() => {
                    this.props.cinematicEditor.timelines.forceUpdate();
                    this.props.cinematicEditor.timelines.updateTracksAtCurrentTime();
                }} />

                <EditorInspectorNumberField object={key} property="startFrame" label="Start Frame" step={1} min={0} max={key.endFrame} onChange={() => {
                    this.forceUpdate();
                    this.props.cinematicEditor.timelines.forceUpdate();
                    this.props.cinematicEditor.timelines.updateTracksAtCurrentTime();
                }} />

                <EditorInspectorNumberField object={key} property="endFrame" label="End Frame" step={1} min={key.startFrame} max={endFrame} onChange={() => {
                    this.forceUpdate();
                    this.props.cinematicEditor.timelines.forceUpdate();
                    this.props.cinematicEditor.timelines.updateTracksAtCurrentTime();
                }} />
            </>
        );
    }

    private _keyKeyEventInspector(key: ICinematicKeyEvent): ReactNode {
        const o = {
            type: key.data?.type ?? "none",
        };

        return (
            <>
                <EditorInspectorNumberField object={key} property="frame" label="Frame" step={1} min={0} onChange={() => {
                    this.props.cinematicEditor.timelines.forceUpdate();
                    this.props.cinematicEditor.timelines.updateTracksAtCurrentTime();
                }} />

                <EditorInspectorListField
                    noUndoRedo
                    object={o}
                    property="type"
                    label="Event Type"
                    items={[
                        { text: "None", value: "none" },
                        { text: "Set Enabled", value: "set-enabled" },
                        { text: "Apply Impulse", value: "apply-impulse" },
                    ]}
                    onChange={(value) => {
                        const oldData = key.data;

                        registerUndoRedo({
                            executeRedo: true,
                            undo: () => {
                                key.data = oldData;
                            },
                            redo: () => {
                                switch (value) {
                                    case "set-enabled":
                                        key.data = new CinematicEventSetEnabled(this.props.editor.layout.preview.scene);
                                        break;
                                    case "apply-impulse":
                                        key.data = new CinematicEventApplyImpulse(this.props.editor.layout.preview.scene);
                                        break;

                                    default:
                                        key.data = undefined;
                                        break;
                                }
                            },
                        });

                        this.forceUpdate();
                    }}
                />

                {key.data?.getInspector()}
            </>
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

    private _getAnimationKeyTangentsInspector(key: IAnimationKey): ReactNode {
        return (
            <>
                <EditorInspectorSwitchField label="In Tangents" object={{ checked: (key.inTangent ?? null) !== null }} property="checked" noUndoRedo onChange={(v) => {
                    registerSimpleUndoRedo({
                        object: key,
                        property: "inTangent",
                        oldValue: key?.inTangent,
                        newValue: v ? this._getTangentDefaultValue(key!) : undefined,
                        executeRedo: true,
                    });

                    this.forceUpdate();
                }} />

                {(key.inTangent ?? null) !== null && this._getTangentInspector(key, "inTangent")}

                <EditorInspectorSwitchField label="Out Tangents" object={{ checked: (key.outTangent ?? null) !== null }} property="checked" noUndoRedo onChange={(v) => {
                    registerSimpleUndoRedo({
                        object: key,
                        property: "outTangent",
                        oldValue: key?.outTangent,
                        newValue: v ? this._getTangentDefaultValue(key!) : undefined,
                        executeRedo: true,
                    });

                    this.forceUpdate();
                }} />

                {(key.outTangent ?? null) !== null && this._getTangentInspector(key, "outTangent")}
            </>
        );
    }

    private _getTangentInspector(key: IAnimationKey, property: "inTangent" | "outTangent"): ReactNode {
        const animationType = getAnimationTypeForObject(key.value);

        switch (animationType) {
            case Animation.ANIMATIONTYPE_FLOAT:
                return <EditorInspectorNumberField object={key} property={property} onChange={() => this.props.cinematicEditor.timelines.updateTracksAtCurrentTime()} />;
            case Animation.ANIMATIONTYPE_VECTOR3:
                return <EditorInspectorVectorField object={key} property={property} onChange={() => this.props.cinematicEditor.timelines.updateTracksAtCurrentTime()} />;

            case Animation.ANIMATIONTYPE_COLOR3:
            case Animation.ANIMATIONTYPE_COLOR4:
                return <EditorInspectorColorField object={key} property={property} noColorPicker noClamp onChange={() => this.props.cinematicEditor.timelines.updateTracksAtCurrentTime()} />;
            default: return null;
        }
    }
}
