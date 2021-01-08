import { CellMaterial } from "babylonjs-materials";
import { GUI } from "dat.gui";

import { Inspector } from "../../components/inspector";
import { MaterialInspector } from "./material-inspector";

export class CellMaterialInspector extends MaterialInspector<CellMaterial> {
    /**
     * Adds the common editable properties.
     * @override
     */
    protected addCommon(): GUI {
        const common = super.addCommon();

        this.addDiffuse();

        return common;
    }

    /**
     * Adds all the diffuse editable properties.
     */
    protected addDiffuse(): void {
        const diffuse = this.tool!.addFolder("Diffuse");
        diffuse.open();

        diffuse.add(this.material, "computeHighLevel").name("Compute Hight Level");
        this.addColor(diffuse, "Color", this.material, "diffuseColor");
        this.addTextureList(diffuse, this.material, "diffuseTexture").name("Texture");
    }
}

Inspector.RegisterObjectInspector({
    ctor: CellMaterialInspector,
    ctorNames: ["CellMaterial"],
    title: "Cell",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, CellMaterial),
});
