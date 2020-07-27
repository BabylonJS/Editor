import { Nullable } from "../../../shared/types";

import { SubMesh, MultiMaterial, Material } from "babylonjs";

import { Dialog } from "../gui/dialog";
import { Tools } from "../tools/tools";

import { Inspector } from "../components/inspector";
import { AbstractInspector } from "./abstract-inspector";

export class SubMeshInspector extends AbstractInspector<SubMesh> {
    private _material: Nullable<Material> = null;

    /**
     * Called on the component did mount.
     * @override
     */
    public onUpdate(): void {
        this.addMaterial();
    }

    /**
     * Adds the common editable properties.
     */
    protected addMaterial(): void {
        this.tool!.addTextBox(`Selected submesh id: "${this.selectedObject._id}"`);
        
        const folder = this.tool!.addFolder("Material");
        folder.open();

        const mesh = this.selectedObject.getMesh();
        if (!mesh.material || !(mesh.material instanceof MultiMaterial)) {
            folder.addTextBox("Please add a multi material to the root mesh before.");
            folder.addButton("Create new multi material...").onClick(() => this._createMultiMaterial());
            return;
        }

        this._material = mesh.material.subMaterials[this.selectedObject.materialIndex];
        this.addMaterialList(folder, this, "_material", () => {
            if (!(mesh.material instanceof MultiMaterial)) { return; }
            mesh.material.subMaterials[this.selectedObject.materialIndex] = this._material;
        });
    }

    /**
     * Called on the user wants to create a new multi material.
     */
    // @ts-ignore
    private async _createMultiMaterial(): Promise<void> {
        const materialName = await Dialog.Show("Create new multi material", "Please provide a name for the new multi material to create");
        const mesh = this.selectedObject.getMesh();

        const material = new MultiMaterial(materialName, this.editor.scene!);
        material.id = Tools.RandomId();
        for (let i = 0; i < mesh.subMeshes.length; i++) {
            material.subMaterials.push(this.editor.scene!.defaultMaterial);
        }

        mesh.material = material;
        this.refresh();
    }
}

Inspector.registerObjectInspector({
    ctor: SubMeshInspector,
    ctorNames: ["SubMesh"],
    title: "SubMesh",
});
