import { FireMaterial } from "babylonjs-materials";
import { GUI } from "dat.gui";

import { Inspector } from "../../components/inspector";
import { MaterialInspector } from "./material-inspector";

export class FireMaterialInspector extends MaterialInspector<FireMaterial> {
    /**
     * Adds the common editable properties.
     * @override
     */
    protected addCommon(): GUI {
        const common = super.addCommon();

        this.addFire();

        return common;
    }

    /**
     * Adds all the fire editable properties.
     */
    protected addFire(): void {
        const fire = this.tool!.addFolder("Fire");
        fire.open();

        fire.add(this.material, "speed").step(0.01).name("Speed");
        this.addTextureList(fire, this.material, "diffuseTexture").name("Diffuse Texture");
        this.addTextureList(fire, this.material, "distortionTexture").name("Distortion Texture");
        this.addTextureList(fire, this.material, "opacityTexture").name("Opacity Texture");
    }
}

Inspector.RegisterObjectInspector({
    ctor: FireMaterialInspector,
    ctorNames: ["FireMaterial"],
    title: "Fire",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, FireMaterial),
});
