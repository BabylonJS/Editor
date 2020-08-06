import { NodeMaterial, InputBlock } from "babylonjs";
import { GUI } from "dat.gui";

import { MaterialAssets } from "../../assets/materials";

import { Tools } from "../../tools/tools";

import { Inspector } from "../../components/inspector";
import { MaterialInspector } from "./material-inspector";

export class NodeMaterialInspector extends MaterialInspector<NodeMaterial> {
    /**
     * Called on a controller finished changes.
     * @override
     */
    public onControllerFinishChange(): void {
        super.onControllerFinishChange();
        this.editor.assets.refresh(MaterialAssets, this.material);
    }

    /**
     * Adds the common editable properties.
     * @override
     */
    protected addCommon(): GUI {
        const common = super.addCommon();

        this.addUniforms();
        // this.addTextures();

        return common;
    }

    /**
     * Adds the uniforms editable properties.
     */
    protected addUniforms(): void {
        const folder = this.tool!.addFolder("Uniforms");
        folder.open();

        const inputs = this.material.getInputBlocks().filter((i) => i.visibleInInspector);
        inputs.forEach((i) => this._addInput(i, folder));
    }

    // /**
    //  * Adds the textures editable properties.
    //  */
    // protected addTextures(): void {
    //     const folder = this.tool!.addFolder("Textures");
    //     folder.open();

    //     const textures = this.material.getTextureBlocks();
    //     textures.forEach((block) => {
    //         const o = { name: block.texture?.name ?? "None" };
    //         this.addTexture(folder, o, "name").name(block.name).onChange(() => {
    //             const texture = this.editor.scene!.textures.find((t) => basename(t.name) === o.name);
    //             block.texture = texture as Texture;
    //         });
    //     });
    // }

    /**
     * Adds the given input.
     */
    private _addInput(block: InputBlock, folder: GUI): void {
        const type = Tools.GetConstructorName(block.value).toLowerCase();
        switch (type) {
            case "number": folder.add(block, "value").min(block.min).max(block.max).name(block.name); break;
            case "vector2":
            case "vector3":
            case "vector4": folder.addVector(block.name, block.value); break;
            case "color3":
            case "color4": this.addColor(folder, block.name, block, "value"); break;
        }
    }
}

Inspector.RegisterObjectInspector({
    ctor: NodeMaterialInspector,
    ctorNames: ["NodeMaterial"],
    title: "Node",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, NodeMaterial),
});
