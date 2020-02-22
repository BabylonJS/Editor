import { basename } from "path";

import { StandardMaterial, Texture } from "babylonjs";
import { GUI } from "dat.gui";

import { MaterialAssets } from "../../assets/materials";

import { Inspector } from "../../components/inspector";
import { MaterialInspector } from "./material-inspector";

export class StandardMaterialInspector extends MaterialInspector<StandardMaterial> {
    private _diffuseTexture: string = "";
    private _bumpTexture: string = "";
    private _specularTexture: string = "";
    private _ambientTexture: string = "";
    private _opacityTexture: string = "";
    private _emissiveTexture: string = "";
    private _lightMapTexture: string = "";

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

        this.addDiffuse();
        this.addBump();
        this.addSpecular();
        this.addAmbient();
        this.addOpacity();
        this.addEmissive();
        this.addLightMap();

        return common;
    }

    /**
     * Adds the diffuse editable properties.
     */
    protected addDiffuse(): GUI {
        const diffuse = this.tool!.addFolder("Diffuse");
        diffuse.open();
        diffuse.add(this.material, "linkEmissiveWithDiffuse").name("Link Emissive With Diffuse");
        diffuse.add(this.material, "useAlphaFromDiffuseTexture").name("Use Alpha From Diffuse Texture");

        this._diffuseTexture = this.material.diffuseTexture?.name ?? "None";
        this.addTexture(diffuse, this, "_diffuseTexture").name("Texture").onChange(() => {
            const texture = this.editor.scene!.textures.find((t) => basename(t.name) === this._diffuseTexture);
            this.material.diffuseTexture = texture as Texture;
        });

        this.addColor(diffuse, "Color", this.material, "diffuseColor");

        return diffuse;
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
    protected addSpecular(): GUI {
        const specular = this.tool!.addFolder("Specular");
        specular.open();
        specular.add(this.material, "specularPower").step(0.01).name("Specular Power");
        specular.add(this.material, "useGlossinessFromSpecularMapAlpha").name("Use Glossiness From Specular Map Alpha");
        specular.add(this.material, "useReflectionFresnelFromSpecular").name("Use Reflection Fresnel From Specular");
        specular.add(this.material, "useSpecularOverAlpha").name("Use Specular Over Alpha");

        this._specularTexture = this.material.specularTexture?.name ?? "None";
        this.addTexture(specular, this, "_specularTexture").name("Texture").onChange(() => {
            const texture = this.editor.scene!.textures.find((t) => basename(t.name) === this._specularTexture);
            this.material.specularTexture = texture as Texture;
        });

        this.addColor(specular, "Color", this.material, "specularColor");

        return specular;
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
     * Adds the emissive editable properties.
     */
    protected addEmissive(): GUI {
        const emissive = this.tool!.addFolder("Emissive");
        emissive.open();

        this._emissiveTexture = this.material.emissiveTexture?.name ?? "None";
        this.addTexture(emissive, this, "_emissiveTexture").name("Texture").onChange(() => {
            const texture = this.editor.scene!.textures.find((t) => basename(t.name) === this._emissiveTexture);
            this.material.emissiveTexture = texture as Texture;
        });

        this.addColor(emissive, "Color", this.material, "emissiveColor");

        return emissive;
    }

    /**
     * Adds the light map editable properties.
     */
    protected addLightMap(): GUI {
        const lightMap = this.tool!.addFolder("Light Map");
        lightMap.open();
        lightMap.add(this.material, "useLightmapAsShadowmap").name("Use Lightmap As Shadowmap");

        this._lightMapTexture = this.material.lightmapTexture?.name ?? "None";
        this.addTexture(lightMap, this, "_lightMapTexture").name("Texture").onChange(() => {
            const texture = this.editor.scene!.textures.find((t) => basename(t.name) === this._lightMapTexture);
            this.material.lightmapTexture = texture as Texture;
        });

        return lightMap;
    }
}

Inspector.registerObjectInspector({
    ctor: StandardMaterialInspector,
    ctorNames: ["StandardMaterial"],
    title: "Material",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, StandardMaterial),
});
