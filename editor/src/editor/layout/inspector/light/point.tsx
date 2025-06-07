import { Component, ReactNode } from "react";
import { Divider } from "@blueprintjs/core";

import { PointLight } from "babylonjs";

import { isPointLight } from "../../../../tools/guards/nodes";
import { onNodeModifiedObservable } from "../../../../tools/observables";
import { updateLightShadowMapRefreshRate, updatePointLightShadowMapRenderListPredicate } from "../../../../tools/light/shadows";

import { IEditorInspectorImplementationProps } from "../inspector";

import { EditorInspectorColorField } from "../fields/color";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSectionField } from "../fields/section";

import { ScriptInspectorComponent } from "../script/script";

import { EditorLightShadowsInspector } from "./shadows";

export class EditorPointLightInspector extends Component<IEditorInspectorImplementationProps<PointLight>> {
    /**
     * Returns whether or not the given object is supported by this inspector.
     * @param object defines the object to check.
     * @returns true if the object is supported by this inspector.
     */
    public static IsSupported(object: unknown): boolean {
        return isPointLight(object);
    }

    public render(): ReactNode {
        return (
            <>
                <EditorInspectorSectionField title="Common">
                    <div className="flex justify-between items-center px-2 py-2">
                        <div className="w-1/2">
                            Type
                        </div>

                        <div className="text-white/50 w-full">
                            {this.props.object.getClassName()}
                        </div>
                    </div>
                    <EditorInspectorStringField label="Name" object={this.props.object} property="name" onChange={() => onNodeModifiedObservable.notifyObservers(this.props.object)} />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Transforms">
                    <EditorInspectorVectorField label={<div className="w-14">Position</div>} object={this.props.object} property="position" onChange={() => {
                        updateLightShadowMapRefreshRate(this.props.object);
                        updatePointLightShadowMapRenderListPredicate(this.props.object);
                    }} />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Light">
                    <EditorInspectorColorField label={<div className="w-14">Diffuse</div>} object={this.props.object} property="diffuse" />
                    <EditorInspectorColorField label={<div className="w-14">Specular</div>} object={this.props.object} property="specular" />

                    <Divider />

                    <EditorInspectorNumberField label="Intensity" object={this.props.object} property="intensity" />
                    <EditorInspectorNumberField label="Range" object={this.props.object} property="range" min={0} max={this.props.editor.layout.preview.camera.maxZ} step={this.props.editor.layout.preview.camera.maxZ / 1000} onChange={() => {
                        updateLightShadowMapRefreshRate(this.props.object);
                        updatePointLightShadowMapRenderListPredicate(this.props.object);
                    }} />
                </EditorInspectorSectionField>

                <ScriptInspectorComponent editor={this.props.editor} object={this.props.object} />

                <EditorLightShadowsInspector light={this.props.object} />
            </>
        );
    }
}
