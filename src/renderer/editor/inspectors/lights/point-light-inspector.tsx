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
        const position = this.tool!.addFolder("Position");
        position.open();
        position.add(this.selectedObject.position, "x");
        position.add(this.selectedObject.position, "y");
        position.add(this.selectedObject.position, "z");

        return position;
    }
}

Inspector.registerObjectInspector({
    ctor: PointLightInspector,
    ctorNames: ["PointLight"],
    title: "Point Light",
});
