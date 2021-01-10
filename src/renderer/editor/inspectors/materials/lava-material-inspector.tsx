import { LavaMaterial } from "babylonjs-materials";
import { GUI } from "dat.gui";

import { Inspector } from "../../components/inspector";
import { MaterialInspector } from "./material-inspector";

export class LavaMaterialInspector extends MaterialInspector<LavaMaterial> {
    /**
     * Adds the common editable properties.
     * @override
     */
    protected addCommon(): GUI {
        const common = super.addCommon();

        this.addLava();

        return common;
    }

    /**
     * Adds all the lava editable properties.
     */
    protected addLava(): void {
        const lava = this.tool!.addFolder("Lava");
        lava.open();

        lava.add(this.material, "speed").step(0.01).name("Speed");
        lava.add(this.material, "movingSpeed").step(0.01).name("Moving Speed");
        lava.add(this.material, "lowFrequencySpeed").step(0.01).name("Low Frequency Speed");
        lava.add(this.material, "fogDensity").step(0.01).name("Fog Density");
        lava.add(this.material, "unlit").name("Unlit");

        this.addTextureList(lava, this.material, "diffuseTexture").name("Diffuse Texture");
        this.addTextureList(lava, this.material, "noiseTexture").name("Noise Texture");
    }
}

Inspector.RegisterObjectInspector({
    ctor: LavaMaterialInspector,
    ctorNames: ["LavaMaterial"],
    title: "Lava",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, LavaMaterial),
});
