import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { SubMesh, MultiMaterial, Material } from "babylonjs";

import { Inspector, IObjectInspectorProps } from "../../components/inspector";

import { Tools } from "../../tools/tools";
import { undoRedo } from "../../tools/undo-redo";

import { Dialog } from "../../gui/dialog";

import { InspectorList } from "../../gui/inspector/fields/list";
import { InspectorButton } from "../../gui/inspector/fields/button";
import { InspectorSection } from "../../gui/inspector/fields/section";

import { AbstractInspector } from "../abstract-inspector";

export class SubMeshInspector extends AbstractInspector<SubMesh, { }> {
    private _material: Nullable<Material> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
     public constructor(props: IObjectInspectorProps) {
        super(props);
    }

    /**
     * Renders the content of the inspector.
     */
    public renderContent(): React.ReactNode {
        return (
            <InspectorSection title="Rendering">
                {this._getRenderingInspector()}
            </InspectorSection>
        );
    }

    /**
     * Returns the rendering inspector that handles multi material creation/edition.
     */
    private _getRenderingInspector(): React.ReactNode {
        const mesh = this.selectedObject.getMesh();
        if (!mesh.material || !(mesh.material instanceof MultiMaterial)) {
            return (
                <>
                    <h2 style={{ color: "white", textAlign: "center" }}>No Multi Material set.</h2>
                    <InspectorButton label="Create Multi Material..." onClick={() => this._handleCreateMultiMaterial()} />
                </>
            );
        }

        this._material = this.selectedObject.getMaterial();

        return (
            <>
                <h2 style={{ color: "white", textAlign: "center" }}>Selected SubMesh N°{this.selectedObject.materialIndex}</h2>
                <InspectorList object={this} property="_material" label="Material" items={this.getMaterialsList()} noUndoRedo={true} onFinishChange={() => this._handleMaterialChanged()} />
            </>
        );
    }

    /**
     * Called on the user wants to create a new multi material.
     */
    private async _handleCreateMultiMaterial(): Promise<void> {
        const name = await Dialog.Show("Create Multi Material", "Please provide a name for the new multi material to create");
        const mesh = this.selectedObject.getMesh();

        const material = new MultiMaterial(name, this.editor.scene!);
        material.id = Tools.RandomId();
        for (let i = 0; i < mesh.subMeshes.length; i++) {
            material.subMaterials.push(this.editor.scene!.defaultMaterial);
        }

        const oldMaterial = mesh.material;
        await undoRedo.push({
            common: () => this.forceUpdate(),
            undo: () => mesh.material = oldMaterial,
            redo: () => mesh.material = material,
        });
    }

    /**
     * Called on the user changed the material for the sub mesh.
     */
    private _handleMaterialChanged(): void {
        const mesh = this.selectedObject.getMesh();
        if (!(mesh.material instanceof MultiMaterial)) {
            return;
        }

        if (mesh.material.subMaterials.length <= this.selectedObject.materialIndex) {
            return;
        }

        const material = this._material;
        const oldMaterial = mesh.material.subMaterials[this.selectedObject.materialIndex];

        undoRedo.push({
            common: () => this.forceUpdate(),
            undo: () => (mesh.material as MultiMaterial).subMaterials[this.selectedObject.materialIndex] = oldMaterial,
            redo: () => (mesh.material as MultiMaterial).subMaterials[this.selectedObject.materialIndex] = material,
        });
    }
}

Inspector.RegisterObjectInspector({
    ctor: SubMeshInspector,
    ctorNames: ["SubMesh"],
    title: "Sub Mesh",
});
