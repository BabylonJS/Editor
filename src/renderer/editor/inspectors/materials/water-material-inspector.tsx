import * as React from "react";
import { GUI } from "dat.gui";

import { WaterMaterial } from "babylonjs-materials";

import { Inspector } from "../../components/inspector";
import { MaterialInspector } from "./material-inspector";

import { RenderList } from "../components/render-list";

export class WaterMaterialInspector extends MaterialInspector<WaterMaterial> {
    /**
     * Adds the common editable properties.
     * @override
     */
    protected addCommon(): GUI {
        const common = super.addCommon();

        this.addColors();
        this.addWind();
        this.addBump();
        this.addWaves();
        this.addReflection();

        return common;
    }

    /**
     * Adds all the colors editable properties.
     */
    protected addColors(): void {
        const specularColor = this.addColor(this.tool!, "Specular Color", this.material, "specularColor");
        specularColor.add(this.material, "specularPower").step(0.01).name("Specular Power");

        const waterColor = this.addColor(this.tool!, "Water Color", this.material, "waterColor");
        waterColor.add(this.material, "colorBlendFactor").step(0.01).name("Color Blend Factor");
        
        const waterColor2 = this.addColor(this.tool!, "Water Color 2", this.material, "waterColor2");
        waterColor2.add(this.material, "colorBlendFactor2").step(0.01).name("Color Blend Factor");
    }

    /**
     * Adds all the wind editable properties.
     */
    protected addWind(): void {
        const wind = this.tool!.addFolder("Wind");
        wind.open();

        wind.add(this.material, "windForce").step(0.01).name("Wind Force");
        wind.addVector("Wind Direction", this.material.windDirection);
    }

    /**
     * Adds all the bump editable properties.
     */
    protected addBump(): void {
        const bump = this.tool!.addFolder("Bump");
        bump.open();

        bump.add(this.material, "bumpHeight").step(0.01).name("Bump Height");
        bump.add(this.material, "bumpSuperimpose").name("Bump Super Impose");
        bump.add(this.material, "bumpAffectsReflection").name("Bump Affects Reflection");
        bump.add(this.material, "fresnelSeparate").name("Fresnel Separate");
        this.addTextureList(bump, this.material, "bumpTexture").name("Bump Texture");
    }

    /**
     * Adds all the waves editable properties.
     */
    protected addWaves(): void {
        const waves = this.tool!.addFolder("Waves");
        waves.open();

        waves.add(this.material, "waveSpeed").step(0.01).name("Wave Speed");
        waves.add(this.material, "waveLength").step(0.01).name("Wave Length");
        waves.add(this.material, "waveHeight").step(0.01).name("Wave Height");
        waves.add(this.material, "waveCount").min(0.01).step(0.01).name("Wave Count");
    }

    /**
     * Adds all the reflection editable properties.
     */
    protected addReflection(): void {
        const reflection = this.tool!.addFolder("Reflection & Refraction");
        reflection.open();

        // reflection.add(this.material, "disableClipPlane").name("Disable Clip Plane");

        if (this.material.reflectionTexture?.renderList) {
            reflection.addCustom("500px", <RenderList editor={this.editor} renderTarget={this.material.reflectionTexture} onChange={() => {
                if (!this.material.refractionTexture?.renderList) { return; }
                this.material.refractionTexture.renderList = [];
                this.material.reflectionTexture?.renderList?.forEach((m) => {
                    this.material.refractionTexture?.renderList?.push(m);
                });
            }} />);
        }
    }
}

Inspector.RegisterObjectInspector({
    ctor: WaterMaterialInspector,
    ctorNames: ["WaterMaterial"],
    title: "Water",
    isSupported: (o) => MaterialInspector.IsObjectSupported(o, WaterMaterial),
});
