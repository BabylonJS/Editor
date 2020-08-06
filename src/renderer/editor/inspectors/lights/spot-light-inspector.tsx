import { SpotLight } from "babylonjs";
import { GUI } from "dat.gui";

import { Inspector } from "../../components/inspector";
import { LightInspector } from "./light-inspector";

export class SpotLightInspector extends LightInspector {
    /**
     * The selected object reference.
     */
    protected selectedObject: SpotLight;

    /**
     * Adds the colors editable properties
     */
    protected addColors(): GUI {
        const colors = super.addColors();

        this.addSpotLight();
        this.addTransforms();

        return colors;
    }

    /**
     * Adds the spot light editable properties.
     */
    protected addSpotLight(): void {
        const spotLight = this.tool!.addFolder("Spot Light");
        spotLight.open();

        spotLight.add(this.selectedObject, "angle").step(0.01).name("Angle");
        spotLight.add(this.selectedObject, "exponent").step(0.01).name("Exponent");
        
        spotLight.add(this.selectedObject, "innerAngle").step(0.01).name("Inner Angle (gltf)");
        
        const shadowGenerator = this.selectedObject.getShadowGenerator();
        if (shadowGenerator) {
            spotLight.add(this.selectedObject, "shadowAngleScale").step(0.01).name("Shadow Angle Scale");
        }
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

Inspector.RegisterObjectInspector({
    ctor: SpotLightInspector,
    ctorNames: ["SpotLight"],
    title: "Spot Light",
});
