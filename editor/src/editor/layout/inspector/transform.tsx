import { Component, ReactNode } from "react";

import { AbstractMesh } from "babylonjs";

import { isTransformNode } from "../../../tools/guards/nodes";
import { onNodeModifiedObservable } from "../../../tools/observables";

import { EditorInspectorStringField } from "./fields/string";
import { EditorInspectorVectorField } from "./fields/vector";
import { EditorInspectorSectionField } from "./fields/section";

import { ScriptInspectorComponent } from "./script/script";

import { IEditorInspectorImplementationProps } from "./inspector";

export class EditorTransformNodeInspector extends Component<IEditorInspectorImplementationProps<AbstractMesh>> {
    /**
     * Returns whether or not the given object is supported by this inspector.
     * @param object defines the object to check.
     * @returns true if the object is supported by this inspector.
     */
    public static IsSupported(object: unknown): boolean {
        return isTransformNode(object);
    }

    public render(): ReactNode {
        return (
            <>
                <EditorInspectorSectionField title="Common">
                    <EditorInspectorStringField label="Name" object={this.props.object} property="name" onChange={() => onNodeModifiedObservable.notifyObservers(this.props.object)} />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Transforms">
                    <EditorInspectorVectorField label={<div className="w-14">Position</div>} object={this.props.object} property="position" />
                    <EditorInspectorVectorField label={<div className="w-14">Rotation</div>} object={this.props.object} property="rotation" />
                    <EditorInspectorVectorField label={<div className="w-14">Scaling</div>} object={this.props.object} property="scaling" />
                </EditorInspectorSectionField>

                <ScriptInspectorComponent editor={this.props.editor} object={this.props.object} />
            </>
        );
    }
}
