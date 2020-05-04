import { DirectionalLight } from "babylonjs";
import { GUI } from "dat.gui";

import { Inspector } from "../../components/inspector";
import { LightInspector } from "./light-inspector";

export class DirectionalLightInspector extends LightInspector {
    /**
     * The selected object reference.
     */
    protected selectedObject: DirectionalLight;

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
        transforms.addVector("Direction", this.selectedObject.direction);

        return transforms;
    }
}

Inspector.registerObjectInspector({
    ctor: DirectionalLightInspector,
    ctorNames: ["DirectionalLight"],
    title: "Directional Light",
});
