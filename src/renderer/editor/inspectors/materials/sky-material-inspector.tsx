import { SkyMaterial } from "babylonjs-materials";
import { GUI } from "dat.gui";

import { MaterialAssets } from "../../assets/materials";

import { Inspector } from "../../components/inspector";
import { MaterialInspector } from "./material-inspector";

export class SkyMaterialInspector extends MaterialInspector<SkyMaterial> {
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

        this.addSky();

        return common;
    }

    /**
     * Adds the sky editable properties.
     */
    protected addSky(): void {
        const sky = this.tool!.addFolder("Sky");
        sky.open();

        sky.add(this.material, "inclination").step(0.01).name("Inclination");
        sky.add(this.material, "azimuth").step(0.01).name("Azimuth");
        sky.add(this.material, "luminance").step(0.01).name("Luminance");
        sky.add(this.material, "turbidity").step(0.01).name("Turbidity");
        sky.add(this.material, "mieCoefficient").step(0.0001).name("Mie Coefficient");
        sky.add(this.material, "mieDirectionalG").step(0.01).name("Mie Coefficient G");
        sky.add(this.material, "rayleigh").step(0.01).name("Reileigh Coefficient");

        const positions = sky.addFolder("Positions");
        positions.open();
        positions.add(this.material, "useSunPosition").name("Use Sun Position");
        positions.addVector("Sun Position", this.material.sunPosition);
        positions.addVector("Camera Offset", this.material.cameraOffset);
    }
}

Inspector.RegisterObjectInspector({
    ctor: SkyMaterialInspector,
    ctorNames: ["SkyMaterial"],
    title: "Sky",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, SkyMaterial),
});
