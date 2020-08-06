import { Light } from "babylonjs";
import { GUI } from "dat.gui";

import { Inspector } from "../../components/inspector";
import { NodeInspector } from "../node-inspector";

export class LightInspector extends NodeInspector {
    /**
     * The selected object reference.
     */
    protected selectedObject: Light;

    /**
     * Adds the common editable properties.
     * @override
     */
    protected addCommon(): GUI {
        const common = super.addCommon();
        common.add(this.selectedObject, "intensity").step(0.01).name("Intensity");
        common.add(this.selectedObject, "range").step(0.01).name("Range");

        this.addColors();

        return common;
    }

    /**
     * Adds the colors editable properties
     */
    protected addColors(): GUI {
        this.addColor(this.tool!, "Diffuse", this.selectedObject, "diffuse");
        return this.addColor(this.tool!, "Specular", this.selectedObject, "specular");
    }
}

Inspector.RegisterObjectInspector({
    ctor: LightInspector,
    ctorNames: ["Light"],
    title: "Light",
});
