import { HemisphericLight } from "babylonjs";
import { GUI } from "dat.gui";

import { Inspector } from "../../components/inspector";

import { LightInspector } from "./light-inspector";

export class HemisphericLightInspector extends LightInspector {
    /**
     * The selected object reference.
     */
    protected selectedObject: HemisphericLight;

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
        transforms.addVector("Direction", this.selectedObject.direction);

        return transforms;
    }
}

Inspector.RegisterObjectInspector({
    ctor: HemisphericLightInspector,
    ctorNames: ["HemisphericLight"],
    title: "Hemispheric Light",
});
