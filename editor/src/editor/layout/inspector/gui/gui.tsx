import { Component, ReactNode } from "react";

import { AdvancedDynamicTexture } from "babylonjs-gui";

import { isAdvancedDynamicTexture } from "../../../../tools/guards/texture";
import { onTextureModifiedObservable } from "../../../../tools/observables";

import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorSectionField } from "../fields/section";

import { IEditorInspectorImplementationProps } from "../inspector";

export class EditorAdvancedDynamicTextureInspector extends Component<IEditorInspectorImplementationProps<AdvancedDynamicTexture>> {
    /**
     * Returns whether or not the given object is supported by this inspector.
     * @param object defines the object to check.
     * @returns true if the object is supported by this inspector.
     */
    public static IsSupported(object: unknown): boolean {
        return isAdvancedDynamicTexture(object) && object._isFullscreen;
    }

    public render(): ReactNode {
        return (
            <EditorInspectorSectionField title="Common">
                <EditorInspectorStringField label="Name" object={this.props.object} property="name" onChange={() => onTextureModifiedObservable.notifyObservers(this.props.object)} />
            </EditorInspectorSectionField>
        );
    }
}
