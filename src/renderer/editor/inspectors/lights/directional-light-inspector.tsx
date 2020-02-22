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
        const position = this.tool!.addFolder("Position");
        position.open();
        position.add(this.selectedObject.position, "x");
        position.add(this.selectedObject.position, "y");
        position.add(this.selectedObject.position, "z");

        const direction = this.tool!.addFolder("Direction");
        direction.open();
        direction.add(this.selectedObject.direction, "x");
        direction.add(this.selectedObject.direction, "y");
        direction.add(this.selectedObject.direction, "z");

        return direction;
    }
}

Inspector.registerObjectInspector({
    ctor: DirectionalLightInspector,
    ctorNames: ["DirectionalLight"],
    title: "Directional Light",
});
