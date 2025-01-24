import { Component, ReactNode } from "react";

import { Divider } from "@blueprintjs/core";

import { FreeCamera } from "babylonjs";

import { isFreeCamera } from "../../../../tools/guards/nodes";
import { onNodeModifiedObservable } from "../../../../tools/observables";

import { IEditorInspectorImplementationProps } from "../inspector";

import { EditorInspectorKeyField } from "../fields/key";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSectionField } from "../fields/section";

import { ScriptInspectorComponent } from "../script/script";

export class EditorFreeCameraInspector extends Component<IEditorInspectorImplementationProps<FreeCamera>> {
    /**
     * Returns whether or not the given object is supported by this inspector.
     * @param object defines the object to check.
     * @returns true if the object is supported by this inspector.
     */
    public static IsSupported(object: any): boolean {
        return isFreeCamera(object);
    }

    public render(): ReactNode {
        return (
            <>
                <div className="text-center text-3xl">
                    Free Camera
                </div>

                <EditorInspectorSectionField title="Common">
                    <EditorInspectorStringField label="Name" object={this.props.object} property="name" onChange={() => onNodeModifiedObservable.notifyObservers(this.props.object)} />
                    <EditorInspectorNumberField object={this.props.object} property="speed" label="Speed" />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Transforms">
                    <EditorInspectorVectorField label={<div className="w-14">Position</div>} object={this.props.object} property="position" />
                    <EditorInspectorVectorField label={<div className="w-14">Rotation</div>} object={this.props.object} property="rotation" />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Fov">
                    <EditorInspectorNumberField object={this.props.object} property="minZ" label="Min Z" min={0.01} />
                    <EditorInspectorNumberField object={this.props.object} property="maxZ" label="Max Z" />

                    <EditorInspectorNumberField object={this.props.object} property="fov" label="Fov" min={0.01} max={Math.PI - 0.01} />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Camera">
                    <EditorInspectorNumberField object={this.props.object} property="speed" label="Speed" min={0} />
                    <EditorInspectorNumberField object={this.props.object} property="inertia" label="Inertia" min={0} max={0.99} />
                    <EditorInspectorNumberField object={this.props.object} property="angularSensibility" label="Angular Sensibility" min={0} />
                </EditorInspectorSectionField>

                <ScriptInspectorComponent editor={this.props.editor} object={this.props.object} />

                <EditorInspectorSectionField title="Keys">
                    <EditorInspectorKeyField value={this.props.object.keysUp[0]?.toString() ?? ""} onChange={(v) => this.props.object.keysUp = [v]} label="Forward" />
                    <EditorInspectorKeyField value={this.props.object.keysDown[0]?.toString() ?? ""} onChange={(v) => this.props.object.keysDown = [v]} label="Backward" />

                    <EditorInspectorKeyField value={this.props.object.keysLeft[0]?.toString() ?? ""} onChange={(v) => this.props.object.keysLeft = [v]} label="Left" />
                    <EditorInspectorKeyField value={this.props.object.keysRight[0]?.toString() ?? ""} onChange={(v) => this.props.object.keysRight = [v]} label="Right" />

                    <Divider />

                    <EditorInspectorKeyField value={this.props.object.keysUpward[0]?.toString() ?? ""} onChange={(v) => this.props.object.keysUpward = [v]} label="Up" />
                    <EditorInspectorKeyField value={this.props.object.keysDownward[0]?.toString() ?? ""} onChange={(v) => this.props.object.keysDownward = [v]} label="Down" />
                </EditorInspectorSectionField>
            </>
        );
    }
}
