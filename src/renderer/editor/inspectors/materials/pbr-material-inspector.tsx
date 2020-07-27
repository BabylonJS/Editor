import { Nullable } from "../../../../shared/types";

import { PBRMaterial } from "babylonjs";
import { GUI } from "dat.gui";

import { MaterialAssets } from "../../assets/materials";

import { TextureTools } from "../../tools/texture";

import { Inspector } from "../../components/inspector";
import { MaterialInspector } from "./material-inspector";

export class PBRMaterialInspector extends MaterialInspector<PBRMaterial> {
    private _useMetallic: boolean = false;
    private _useRoughness: boolean = false;
    private _useSheenRoughness: boolean = false;

    private _bumpFolder: Nullable<GUI> = null;
    private _opacityFolder: Nullable<GUI> = null;
    private _metallicFolder: Nullable<GUI> = null;
    private _clearCoatFolder: Nullable<GUI> = null;
    private _sheenFolder: Nullable<GUI> = null;
    private _anisotropyFolder: Nullable<GUI> = null;

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
        this.addEmissive();
        this.addMicroSurface();
        this.addMetallicRoughness();
        this.addClearCoat();
        this.addSheen();
        this.addAnisotropy();

        return common;
    }

    /**
     * Adds the albedo editable properties.
     */
    protected addAlbedo(): GUI {
        const albedo = this.tool!.addFolder("Albedo");
        albedo.open();
        albedo.add(this.material, "useAlphaFromAlbedoTexture").name("Use Alpha From Albedo Texture");

        this.addTextureList(albedo, this.material, "albedoTexture").name("Texture");
        this.addColor(albedo, "Color", this.material, "albedoColor");

        return albedo;
    }

    /**
     * Adds the bump editable properties.
     */
    protected addBump(): GUI {
        this._bumpFolder = this._bumpFolder ?? this.tool!.addFolder('Bump');
        this._bumpFolder.open();
    
        if (this.material.bumpTexture) {
            this._bumpFolder.add(this.material, "invertNormalMapX").name("Invert Normal Map X");
            this._bumpFolder.add(this.material, "invertNormalMapY").name("Invert Normal Map Y");
            this._bumpFolder.add(this.material.bumpTexture, "level").min(0).step(0.01).name("Strength");
        }

        this.addTextureList(this._bumpFolder, this.material, "bumpTexture", () => {
            this.clearFolder(this._bumpFolder!);
            this.addBump();
        }).name("Texture");

        if (this.material.bumpTexture) {
            this._bumpFolder.add(this.material, "useParallax").name("Use Parallax");
            this._bumpFolder.add(this.material, "useParallaxOcclusion").name("Use Parallax Occlusion");
            this._bumpFolder.add(this.material, "parallaxScaleBias").step(0.001).name("Parallax Scale Bias");
        }

        return this._bumpFolder;
    }

    /**
     * Adds the specular editable properties.
     */
    protected addReflectivity(): GUI {
        const reflectivity = this.tool!.addFolder("Reflectivity");
        reflectivity.open();
        reflectivity.add(this.material, "useSpecularOverAlpha").name("Use Specular Over Alpha");

        this.addTextureList(reflectivity, this.material, "reflectivityTexture").name("Texture");
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

        this.addTextureList(reflection, this.material, "reflectionTexture").name("Texture");
        this.addColor(reflection, "Color", this.material, "reflectionColor");

        return reflection;
    }

    /**
     * Adds the ambient editable properties.
     */
    protected addAmbient(): GUI {
        const ambient = this.tool!.addFolder("Ambient");
        ambient.open();

        this.addTextureList(ambient, this.material, "ambientTexture").name("Texture");

        ambient.add(this.material, "useAmbientInGrayScale").name("Use Ambient In Gray Scale");
        ambient.add(this.material, "ambientTextureStrength").name("Ambient Texture Strength");
        this.addColor(ambient, "Color", this.material, "ambientColor");

        return ambient;
    }

    /**
     * Adds the opacity editable properties.
     */
    protected addOpacity(): GUI {
        this._opacityFolder = this._opacityFolder ?? this.tool!.addFolder("Opacity");
        this._opacityFolder.open();

        this.addTextureList(this._opacityFolder, this.material, "opacityTexture", () => {
            this.clearFolder(this._opacityFolder!);
            this.addOpacity();
        }).name("Texture");

        if (this.material.albedoTexture && this.material.opacityTexture) {
            this._opacityFolder.addButton("Merge Opacity To Albedo Texture...").onClick(async () => {
                if (!this.material.albedoTexture) { return; }
                await TextureTools.MergeDiffuseWithOpacity(this.editor, this.material.albedoTexture, this.material.opacityTexture);
            });
        }

        return this._opacityFolder;
    }

    /**
     * Adds the micro surface editable properties.
     */
    protected addMicroSurface(): GUI {
        const microSurface = this.tool!.addFolder("Micro Surface (Glossiness)");
        microSurface.open();

        microSurface.add(this.material, "microSurface").min(0).max(1).name("Micro Surface");
        microSurface.add(this.material, "useAutoMicroSurfaceFromReflectivityMap").name("Use Auto Micro Surface From Reflectivity Map");
        
        this.addTextureList(microSurface, this.material, "microSurfaceTexture").name("Texture");

        return microSurface;
    }

    /**
     * Adds the metallic editable properties.
     */
    protected addMetallicRoughness(): GUI {
        this._metallicFolder = this._metallicFolder ?? this.tool!.addFolder("Metallic / Roughness");
        this._metallicFolder.open();

        this._metallicFolder.add(this.material, "useMetallnessFromMetallicTextureBlue").name("Use Metallness From Metallic Texture Blue");
        this._metallicFolder.add(this.material, "useRoughnessFromMetallicTextureAlpha").name("Use Roughness From Metallic Texture Alpha");
        this._metallicFolder.add(this.material, "useRoughnessFromMetallicTextureGreen").name("Use Roughness From Metallic Texture Green");
        this.addTextureList(this._metallicFolder, this.material, "metallicTexture").name("Texture");

        this._useMetallic = (this.material.metallic ?? null) !== null ? true : false;
        this._useRoughness = (this.material.roughness ?? null) !== null ? true : false;

        // Metallic
        this._metallicFolder.add(this, "_useMetallic").name("Use Metallic").onChange(() => {
            this.material.metallic = this._useMetallic ? 0 : null;

            this.clearFolder(this._metallicFolder!);
            this.addMetallicRoughness();
        });

        if (this._useMetallic) {
            this._metallicFolder.add(this.material, "metallic").min(0).max(1).name("Metallic");
        }

        // Roughness
        this._metallicFolder.add(this, "_useRoughness").name("Use Roughness").onChange(() => {
            this.material.roughness = this._useRoughness ? 0 : null;

            this.clearFolder(this._metallicFolder!);
            this.addMetallicRoughness();
        });
        
        if (this._useRoughness) {
            this._metallicFolder.add(this.material, "roughness").min(0).max(1).name("Roughness");
        }

        return this._metallicFolder;
    }

    /**
     * Adds the clear coat editable properties.
     */
    protected addClearCoat(): GUI {
        this._clearCoatFolder = this._clearCoatFolder ?? this.tool!.addFolder("Clear Coat");
        this._clearCoatFolder.open();

        this._clearCoatFolder.add(this.material.clearCoat, "isEnabled").name("Enabled").onFinishChange(() => {
            this.clearFolder(this._clearCoatFolder!);
            this.addClearCoat();
        });
        if (!this.material.clearCoat.isEnabled) { return this._clearCoatFolder; }

        this._clearCoatFolder.add(this.material.clearCoat, "intensity").step(0.01).name("Intensity");
        this._clearCoatFolder.add(this.material.clearCoat, "roughness").min(0).max(1).step(0.01).name("Roughness");
        this._clearCoatFolder.add(this.material.clearCoat, "indexOfRefraction").min(0).step(0.01).name("Index Of Refraction");

        this.addTextureList(this._clearCoatFolder, this.material.clearCoat, "texture").name("Texture");
        this.addTextureList(this._clearCoatFolder, this.material.clearCoat, "bumpTexture").name("Bump Texture");

        // Tint
        this._clearCoatFolder.add(this.material.clearCoat, "isTintEnabled").name("Tint Enabled");
        this._clearCoatFolder.add(this.material.clearCoat, "tintColorAtDistance").name("Tint Color At Distance");
        this._clearCoatFolder.add(this.material.clearCoat, "tintThickness").name("Tint Thickness");
        this.addColor(this._clearCoatFolder, "Tint Color", this.material.clearCoat, "tintColor");

        return this._clearCoatFolder;
    }

    /**
     * Adds the anisotropy editable properties.
     */
    protected addAnisotropy(): GUI {
        this._anisotropyFolder = this._anisotropyFolder ?? this.tool!.addFolder("Anisotropy");
        this._anisotropyFolder.open();

        this._anisotropyFolder.add(this.material.anisotropy, "isEnabled").name("Enabled").onFinishChange(() => {
            this.clearFolder(this._anisotropyFolder!);
            this.addAnisotropy();
        });
        if (!this.material.anisotropy.isEnabled) { return this._anisotropyFolder; }

        this._anisotropyFolder.add(this.material.anisotropy, "intensity").step(0.01).name("Intensity");
        this._anisotropyFolder.addVector("Direction", this.material.anisotropy.direction);
        this.addTextureList(this._anisotropyFolder, this.material.anisotropy, "texture").name("Texture");

        return this._anisotropyFolder;
    }

    /**
     * Adds the sheen editable properties.
     */
    protected addSheen(): GUI {
        this._sheenFolder = this._sheenFolder ?? this.tool!.addFolder("Sheen");
        this._sheenFolder.open();

        this._sheenFolder.add(this.material.sheen, "isEnabled").name("Enabled").onFinishChange(() => {
            this.clearFolder(this._sheenFolder!);
            this.addSheen();
        });
        if (!this.material.sheen.isEnabled) { return this._sheenFolder; }

        this._sheenFolder.add(this.material.sheen, "linkSheenWithAlbedo").name("Link With Albedo");
        this._sheenFolder.add(this.material.sheen, "albedoScaling").name("Albedo Scaling");

        this._useSheenRoughness = (this.material.sheen.roughness ?? null) !== null ? true : false;
        this._sheenFolder.add(this, "_useSheenRoughness").name("Use Roughness").onFinishChange(() => {
            this.material.sheen.roughness = this._useSheenRoughness ? 0 : null;

            this.clearFolder(this._sheenFolder!);
            this.addSheen();
        });

        if (this._useSheenRoughness) {
            this._sheenFolder.add(this.material.sheen, "roughness").min(0).max(1).name("Roughness");
        }

        this._sheenFolder.add(this.material.sheen, "intensity").step(0.01).name("Intensity");

        this.addTextureList(this._sheenFolder, this.material.sheen, "texture").name("Texture");
        this.addColor(this._sheenFolder, "Color", this.material.sheen, "color");

        return this._sheenFolder;
    }

    /**
     * Adds the emissive editable properties.
     */
    protected addEmissive(): GUI {
        const emissive = this.tool!.addFolder("Emissive");
        emissive.open();

        this.addTextureList(emissive, this.material, "emissiveTexture").name("Texture");
        emissive.add(this.material, "emissiveIntensity").min(0).step(0.01).name("Intensity");
        this.addColor(emissive, "Color", this.material, "emissiveColor");

        return emissive;
    }
}

Inspector.registerObjectInspector({
    ctor: PBRMaterialInspector,
    ctorNames: ["PBRMaterial"],
    title: "PBR",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, PBRMaterial),
});
