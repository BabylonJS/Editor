import { Component, ReactNode } from "react";

import { Divider } from "@blueprintjs/core";

import { EditorCamera } from "../../../nodes/camera";

import { IEditorInspectorImplementationProps } from "../inspector";

import { EditorInspectorKeyField } from "../fields/key";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

export class EditorCameraInspector extends Component<IEditorInspectorImplementationProps<EditorCamera>> {
    /**
     * Returns whether or not the given object is supported by this inspector.
     * @param object defines the object to check.
     * @returns true if the object is supported by this inspector.
     */
    public static IsSupported(object: any): boolean {
        return object?.getClassName?.() === "EditorCamera";
    }

    public render(): ReactNode {
        return (
            <>
                <div className="text-center text-3xl">
                    Editor Camera
                </div>

                <EditorInspectorSectionField title="Common">
                    <EditorInspectorNumberField object={this.props.object} property="speed" label="Speed" />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Fov">
                    <EditorInspectorNumberField object={this.props.object} property="minZ" label="Min Z" min={0.01} />
                    <EditorInspectorNumberField object={this.props.object} property="maxZ" label="Max Z" />

                    <EditorInspectorNumberField object={this.props.object} property="fov" label="Fov" min={0.01} max={Math.PI - 0.01} />
                </EditorInspectorSectionField>

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
