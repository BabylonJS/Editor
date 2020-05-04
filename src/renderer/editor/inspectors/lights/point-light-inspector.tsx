import { PointLight } from "babylonjs";
import { GUI } from "dat.gui";

import { Inspector } from "../../components/inspector";
import { LightInspector } from "./light-inspector";

export class PointLightInspector extends LightInspector {
    /**
     * The selected object reference.
     */
    protected selectedObject: PointLight;

    /**
     * Adds the colors editable properties
     */
    protected addColors(): GUI {
        const colors = super.addColors();

        this.addTransforms();

        return colors;
    }

    /**
     * Adds the transforms editable properties.
     */
    protected addTransforms(): GUI {
        const transforms = this.tool!.addFolder("Transforms");
        transforms.open();
        transforms.addVector("Position", this.selectedObject.position);

        return transforms;
    }
}

Inspector.registerObjectInspector({
    ctor: PointLightInspector,
    ctorNames: ["PointLight"],
    title: "Point Light",
});
