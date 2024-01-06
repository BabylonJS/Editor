import { Component, ReactNode } from "react";

import { AbstractMesh, MultiMaterial, PBRMaterial, StandardMaterial } from "babylonjs";

import { isAbstractMesh } from "../../../tools/guards/nodes";
import { onNodeModifiedObservable } from "../../../tools/observables";

import { EditorInspectorStringField } from "./fields/string";
import { EditorInspectorSwitchField } from "./fields/switch";
import { EditorInspectorVectorField } from "./fields/vector";
import { EditorInspectorSectionField } from "./fields/section";

import { IEditorInspectorImplementationProps } from "./inspector";

import { EditorPBRMaterialInspector } from "./material/pbr";
import { EditorMultiMaterialInspector } from "./material/multi";
import { EditorStandardMaterialInspector } from "./material/standard";

export class EditorMeshInspector extends Component<IEditorInspectorImplementationProps<AbstractMesh>> {
    /**
     * Returns whether or not the given object is supported by this inspector.
     * @param object defines the object to check.
     * @returns true if the object is supported by this inspector.
     */
    public static IsSupported(object: unknown): boolean {
        return isAbstractMesh(object);
    }

    public render(): ReactNode {
        return (
            <>
                <EditorInspectorSectionField title="Common">
                    <EditorInspectorStringField label="Name" object={this.props.object} property="name" onChange={() => onNodeModifiedObservable.notifyObservers(this.props.object)} />
                    <EditorInspectorSwitchField label="Pickable" object={this.props.object} property="isPickable" />
                </EditorInspectorSectionField>

                <EditorInspectorSectionField title="Transforms">
                    <EditorInspectorVectorField label={<div className="w-14">Position</div>} object={this.props.object} property="position" />
                    <EditorInspectorVectorField label={<div className="w-14">Rotation</div>} object={this.props.object} property="rotation" />
                    <EditorInspectorVectorField label={<div className="w-14">Scaling</div>} object={this.props.object} property="scaling" />
                </EditorInspectorSectionField>

                {this._getMaterialComponent()}
                {this._getSkeletonComponent()}
            </>
        );
    }

    private _getMaterialComponent(): ReactNode {
        if (!this.props.object.material) {
            return (
                <div className="flex flex-col gap-2 px-2">
                    <div className="text-center text-xl">
                        No material
                    </div>
                </div>
            );
        }

        switch (this.props.object.material.getClassName()) {
            case "MultiMaterial": return <EditorMultiMaterialInspector material={this.props.object.material as MultiMaterial} />;
            case "PBRMaterial": return <EditorPBRMaterialInspector material={this.props.object.material as PBRMaterial} />;
            case "StandardMaterial": return <EditorStandardMaterialInspector material={this.props.object.material as StandardMaterial} />;
        }
    }

    private _getSkeletonComponent(): ReactNode {
        if (!this.props.object.skeleton) {
            return null;
        }

        return (
            <EditorInspectorSectionField title="Skeleton">
                <EditorInspectorSwitchField label="Need Initial Skin Matrix" object={this.props.object.skeleton} property="needInitialSkinMatrix" />
            </EditorInspectorSectionField>
        );
    }
}
