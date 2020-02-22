import { basename } from "path";

import { Texture, PBRMaterial } from "babylonjs";
import { GUI } from "dat.gui";

import { MaterialAssets } from "../../assets/materials";

import { Inspector } from "../../components/inspector";
import { MaterialInspector } from "./material-inspector";

export class PBRMaterialInspector extends MaterialInspector<PBRMaterial> {
    private _albedoTexture: string = "";
    private _bumpTexture: string = "";
    private _reflectivityTexture: string = "";
    private _reflectionTexture: string = "";
    private _ambientTexture: string = "";
    private _opacityTexture: string = "";
    private _microSurfaceTexture: string = "";

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

        this._albedoTexture = this.material.albedoTexture?.name ?? "None";
        this.addTexture(albedo, this, "_albedoTexture").name("Texture").onChange(() => {
            const texture = this.editor.scene!.textures.find((t) => basename(t.name) === this._albedoTexture);
            this.material.albedoTexture = texture as Texture;
        });

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

        this._bumpTexture = this.material.bumpTexture?.name ?? "None";
        this.addTexture(bump, this, "_bumpTexture").name("Texture").onChange(() => {
            const texture = this.editor.scene!.textures.find((t) => basename(t.name) === this._bumpTexture);
            this.material.bumpTexture = texture as Texture;
        });

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

        this._reflectivityTexture = this.material.reflectivityTexture?.name ?? "None";
        this.addTexture(reflectivity, this, "_reflectivityTexture").name("Texture").onChange(() => {
            const texture = this.editor.scene!.textures.find((t) => basename(t.name) === this._reflectivityTexture);
            this.material.reflectivityTexture = texture as Texture;
        });

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

        this._reflectionTexture = this.material.reflectionTexture?.name ?? "None";
        this.addTexture(reflection, this, "_reflectionTexture").name("Texture").onChange(() => {
            const texture = this.editor.scene!.textures.find((t) => basename(t.name) === this._reflectionTexture);
            this.material.reflectionTexture = texture as Texture;
        });

        this.addColor(reflection, "Color", this.material, "reflectionColor");

        return reflection;
    }

    /**
     * Adds the ambient editable properties.
     */
    protected addAmbient(): GUI {
        const ambient = this.tool!.addFolder("Ambient");
        ambient.open();

        this._ambientTexture = this.material.ambientTexture?.name ?? "None";
        this.addTexture(ambient, this, "_ambientTexture").name("Texture").onChange(() => {
            const texture = this.editor.scene!.textures.find((t) => basename(t.name) === this._ambientTexture);
            this.material.ambientTexture = texture as Texture;
        });

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

        this._opacityTexture = this.material.opacityTexture?.name ?? "None";
        this.addTexture(opacity, this, "_opacityTexture").name("Texture").onChange(() => {
            const texture = this.editor.scene!.textures.find((t) => basename(t.name) === this._opacityTexture);
            this.material.opacityTexture = texture as Texture;
        });

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
        
        this._microSurfaceTexture = this.material.microSurfaceTexture?.name ?? "None";
        this.addTexture(microSurface, this, "_microSurfaceTexture").name("Texture").onChange(() => {
            const texture = this.editor.scene!.textures.find((t) => basename(t.name) === this._microSurfaceTexture);
            this.material.microSurfaceTexture = texture as Texture;
        });

        return microSurface;
    }
}

Inspector.registerObjectInspector({
    ctor: PBRMaterialInspector,
    ctorNames: ["PBRMaterial"],
    title: "PBR",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, PBRMaterial),
});
