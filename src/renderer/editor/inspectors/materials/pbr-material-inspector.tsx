import { PBRMaterial } from "babylonjs";
import { GUI } from "dat.gui";

import { MaterialAssets } from "../../assets/materials";

import { Inspector } from "../../components/inspector";
import { MaterialInspector } from "./material-inspector";

export class PBRMaterialInspector extends MaterialInspector<PBRMaterial> {
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

        this.addAlbedo();
        this.addBump();
        this.addReflectivity();
        this.addReflection();
        this.addAmbient();
        this.addOpacity();
        this.addMicroSurface();

        return common;
    }

    /**
     * Adds the albedo editable properties.
     */
    protected addAlbedo(): GUI {
        const albedo = this.tool!.addFolder("Albedo");
        albedo.open();
        albedo.add(this.material, "useAlphaFromAlbedoTexture").name("Use Alpha From Albedo Texture");

        this.addTexture(albedo, this.material, "albedoTexture").name("Texture");
        this.addColor(albedo, "Color", this.material, "albedoColor");

        return albedo;
    }

    /**
     * Adds the bump editable properties.
     */
    protected addBump(): GUI {
        const bump = this.tool!.addFolder('Bump');
        bump.open();
        bump.add(this.material, "invertNormalMapX").name("Invert Normal Map X");
        bump.add(this.material, "invertNormalMapY").name("Invert Normal Map Y");

        this.addTexture(bump, this.material, "bumpTexture").name("Texture");

        bump.add(this.material, "useParallax").name("Use Parallax");
        bump.add(this.material, "useParallaxOcclusion").name("Use Parallax Occlusion");
        bump.add(this.material, "parallaxScaleBias").step(0.001).name("Parallax Scale Bias");

        return bump;
    }

    /**
     * Adds the specular editable properties.
     */
    protected addReflectivity(): GUI {
        const reflectivity = this.tool!.addFolder("Reflectivity");
        reflectivity.open();
        reflectivity.add(this.material, "useSpecularOverAlpha").name("Use Specular Over Alpha");

        this.addTexture(reflectivity, this.material, "reflectivityTexture").name("Texture");
        this.addColor(reflectivity, "Color", this.material, "reflectivityColor");

        return reflectivity;
    }

    /**
     * Adds the reflection editable properties.
     */
    protected addReflection(): GUI {
        const reflection = this.tool!.addFolder("Reflection");
        reflection.open();

        reflection.add(this.material, "environmentIntensity").step(0.01).name("Intensity");

        this.addTexture(reflection, this.material, "reflectionTexture").name("Texture");
        this.addColor(reflection, "Color", this.material, "reflectionColor");

        return reflection;
    }

    /**
     * Adds the ambient editable properties.
     */
    protected addAmbient(): GUI {
        const ambient = this.tool!.addFolder("Ambient");
        ambient.open();

        this.addTexture(ambient, this.material, "ambientTexture").name("Texture");

        ambient.add(this.material, "useAmbientInGrayScale").name("Use Ambient In Gray Scale");
        ambient.add(this.material, "ambientTextureStrength").name("Ambient Texture Strength");
        this.addColor(ambient, "Color", this.material, "ambientColor");

        return ambient;
    }

    /**
     * Adds the opacity editable properties.
     */
    protected addOpacity(): GUI {
        const opacity = this.tool!.addFolder("Opacity");
        opacity.open();

        this.addTexture(opacity, this.material, "opacityTexture").name("Texture");

        return opacity;
    }

    /**
     * Adds the micro surface editable properties.
     */
    protected addMicroSurface(): GUI {
        const microSurface = this.tool!.addFolder("Micro Surface (Glossiness)");
        microSurface.open();

        microSurface.add(this.material, "microSurface").min(0).max(1).name("Micro Surface");
        microSurface.add(this.material, "useAutoMicroSurfaceFromReflectivityMap").name("Use Auto Micro Surface From Reflectivity Map");
        
        this.addTexture(microSurface, this.material, "microSurfaceTexture").name("Texture");

        return microSurface;
    }
}

Inspector.registerObjectInspector({
    ctor: PBRMaterialInspector,
    ctorNames: ["PBRMaterial"],
    title: "PBR",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, PBRMaterial),
});
