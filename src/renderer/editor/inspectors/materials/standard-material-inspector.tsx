import { StandardMaterial } from "babylonjs";
import { GUI } from "dat.gui";

import { MaterialAssets } from "../../assets/materials";

import { Inspector } from "../../components/inspector";
import { MaterialInspector } from "./material-inspector";

export class StandardMaterialInspector extends MaterialInspector<StandardMaterial> {
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
        this.addReflection();

        this.material.disableLighting;
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

        this.addTextureList(diffuse, this.material, "diffuseTexture").name("Texture");
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

        this.addTextureList(bump, this.material, "bumpTexture").name("Texture");

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

        this.addTextureList(specular, this.material, "specularTexture").name("Texture");
        this.addColor(specular, "Color", this.material, "specularColor");

        return specular;
    }

    /**
     * Adds the ambient editable properties.
     */
    protected addAmbient(): GUI {
        const ambient = this.tool!.addFolder("Ambient");
        ambient.open();

        this.addTextureList(ambient, this.material, "ambientTexture").name("Texture");
        this.addColor(ambient, "Color", this.material, "ambientColor");

        return ambient;
    }

    /**
     * Adds the opacity editable properties.
     */
    protected addOpacity(): GUI {
        const opacity = this.tool!.addFolder("Opacity");
        opacity.open();

        this.addTextureList(opacity, this.material, "opacityTexture").name("Texture");

        return opacity;
    }

    /**
     * Adds the emissive editable properties.
     */
    protected addEmissive(): GUI {
        const emissive = this.tool!.addFolder("Emissive");
        emissive.open();

        this.addTextureList(emissive, this.material, "emissiveTexture").name("Texture");
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

        this.addTextureList(lightMap, this.material, "lightmapTexture").name("Texture");

        return lightMap;
    }

    /**
     * Adds the reflection editable properties.
     */
    protected addReflection(): GUI {
        const reflection = this.tool!.addFolder("Reflection");
        reflection.open();

        this.addTextureList(reflection, this.material, "reflectionTexture").name("Texture");

        return reflection;
    }
}

Inspector.registerObjectInspector({
    ctor: StandardMaterialInspector,
    ctorNames: ["StandardMaterial"],
    title: "Material",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, StandardMaterial),
});
