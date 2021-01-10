import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { DirectionalLight, SpotLight, PointLight, CascadedShadowGenerator, ShadowGenerator, RenderTargetTexture, IShadowLight } from "babylonjs";
import { GUI } from "dat.gui";

import { Inspector } from "../../components/inspector";
import { AbstractInspector } from "../abstract-inspector";

import { Confirm } from "../../gui/confirm";

import { RenderList } from "../components/render-list";

export class ShadowsInspector extends AbstractInspector<DirectionalLight | SpotLight> {
    private _hasShadowGenerator: boolean = false;
    private _shadowsDarkness: number = 0;
    private _cascadeFilter: string = "";
    private _cascadedQuality: string = "";
    private _mapSize: string = "";

    private _shadowsFolder: Nullable<GUI> = null;
    private _shadowMapFolder: Nullable<GUI> = null;

    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        this.addShadows();
    }

    /**
     * Adds the shadows editable properties.
     */
    protected addShadows(): GUI {
        this._shadowsFolder = this.tool!.addFolder("Shadows");
        this._shadowsFolder.open();

        this._hasShadowGenerator = this.selectedObject.getShadowGenerator() ? true : false;
        this._shadowsFolder.add(this, "_hasShadowGenerator").name("Generates Shadows").onChange(() => this._handleHasShadowsChanged());

        if (this._hasShadowGenerator) {
            const generator = this.selectedObject.getShadowGenerator()! as CascadedShadowGenerator | ShadowGenerator;

            this._shadowsFolder.add(generator, "enableSoftTransparentShadow").name("Enable Soft Transparent Shadow");
            this._shadowsFolder.add(generator, "transparencyShadow").name("Enable Transparency Shadow");
            
            if (generator instanceof CascadedShadowGenerator) {
                this._addCascadedShadowGenerator(this._shadowsFolder, generator);
            } else if (generator instanceof ShadowGenerator) {
                this._addShadowGenerated(this._shadowsFolder, generator);
            }
            
            const shadowMap = this.selectedObject.getShadowGenerator()?.getShadowMap();
            if (shadowMap && shadowMap.renderList) {
                this.addShadowMap(shadowMap);
            }
        }

        return this._shadowsFolder;
    }

    /**
     * Adds the render list editable properties.
     * @param shadowMap the reference to the shadow map to be configured.
     */
    protected addShadowMap(shadowMap: RenderTargetTexture): void {
        this._shadowMapFolder = this.tool!.addFolder("Shadow Map");
        this._shadowMapFolder.open();

        this._shadowMapFolder.add(shadowMap, "refreshRate").min(0).name("Refresh Rate");

        if (shadowMap.canRescale) {
            const scales = ["128", "256", "512", "1024", "2048", "4096"];
            this._mapSize = scales.find((s) => parseInt(s) === shadowMap.getRenderWidth()) ?? "512";

            this._shadowMapFolder.add(this, "_mapSize", scales).name("Size").onChange(() => {
                const size = parseInt(this._mapSize);
                shadowMap.resize(size);
            });
        }

        this._shadowMapFolder.addCustom("500px", <RenderList editor={this.editor} renderTarget={shadowMap} />);
    }

    /**
     * Called on the user changes the property "hasShadows".
     */
    private async _handleHasShadowsChanged(): Promise<void> {
        if (this._hasShadowGenerator) {
            if (this.selectedObject instanceof DirectionalLight) {
                const cascaded = await Confirm.Show("Use Cascaded Shadow Mapping?", "Would you like to create Cascaded Shadow Maps? Cascaded Shadow Maps are optimized for large scenes.");
                cascaded ? new CascadedShadowGenerator(1024, this.selectedObject, true) : new ShadowGenerator(1024, this.selectedObject, true);
            } else {
                new ShadowGenerator(1024, this.selectedObject as IShadowLight, true);
            }
        } else {
            this.selectedObject.getShadowGenerator()?.dispose();
        }

        if (this._shadowsFolder) {
            this._shadowsFolder.parent.removeFolder(this._shadowsFolder);
            this._shadowMapFolder?.parent.removeFolder(this._shadowMapFolder);
        }

        this.addShadows();
    }

    /**
     * Adds the cascaded shadow generator editable properties.
     */
    private _addCascadedShadowGenerator(folder: GUI, generator: CascadedShadowGenerator): void {
        this._shadowsDarkness = generator.getDarkness();
        folder.add(this, "_shadowsDarkness").min(0).max(1).step(0.01).name("Darkness").onChange(() => generator.setDarkness(this._shadowsDarkness));
        
        folder.add(generator, "bias").min(0).max(1).step(0.0000001).name("Bias");
        folder.add(generator, "normalBias").min(0).max(1).step(0.0000001).name("Normal Bias");
        folder.add(generator, "frustumEdgeFalloff").step(0.0000001).name("Frustum Edge Falloff");
        folder.add(generator, "stabilizeCascades").name("Stabilize Cascades");
        
        folder.add(generator, "usePercentageCloserFiltering").name("Use Percentage Closer Filtering");
        switch (generator.filter) {
            case CascadedShadowGenerator.FILTER_NONE: this._cascadeFilter = "FILTER_NONE"; break;
            case CascadedShadowGenerator.FILTER_PCF: this._cascadeFilter = "FILTER_PCF"; break;
            case CascadedShadowGenerator.FILTER_PCSS: this._cascadeFilter = "FILTER_PCSS"; break;
            default: this._cascadeFilter = "FILTER_NONE"; break;
        }
        folder.add(this, "_cascadeFilter", ["FILTER_NONE", "FILTER_PCF", "FILTER_PCSS"]).name("Filter").onChange(() => generator.filter = CascadedShadowGenerator[this._cascadeFilter]);
        switch (generator.filteringQuality) {
            case CascadedShadowGenerator.QUALITY_LOW: this._cascadedQuality = "QUALITY_LOW"; break;
            case CascadedShadowGenerator.QUALITY_MEDIUM: this._cascadedQuality = "QUALITY_MEDIUM"; break;
            case CascadedShadowGenerator.QUALITY_HIGH: this._cascadedQuality = "QUALITY_HIGH"; break;
            default: this._cascadedQuality = "QUALITY_LOW"; break;
        }
        folder.add(this, "_cascadedQuality", ["QUALITY_LOW", "QUALITY_MEDIUM", "QUALITY_HIGH"]).name("Filtering Quality").onChange(() => generator.filteringQuality = CascadedShadowGenerator[this._cascadedQuality]);

        folder.add(generator, "useContactHardeningShadow").name("Use Contact Hardening Shadow");
        folder.add(generator, "contactHardeningLightSizeUVRatio").step(0.0000001).name("Contact Hardening Light Size UV Ratio");

        // folder.add(generator, "numCascades", ["4", "5", "6", "7", "8"]).name("Cascades Count").onChange((r) => generator.numCascades = parseInt(r));
        folder.add(generator, "forceBackFacesOnly").name("Force Back Faces Only");
        folder.add(generator, "lambda").min(0).max(1).step(0.01).name("Lambda");
        folder.add(generator, "penumbraDarkness").min(0).max(1).step(0.01).name("Penumbra Darkness");
        folder.add(generator, "cascadeBlendPercentage").min(0).max(1).step(0.01).name("Cascade Blend Percentage");
        folder.add(generator, "depthClamp").name("Depth Clamp");

        folder.add(generator, "debug").name("debug");
    }

    /**
     * Adds the shadow generator properties.
     */
    private _addShadowGenerated(folder: GUI, generator: ShadowGenerator): void {
        this._shadowsDarkness = generator.getDarkness();

        folder.add(this, "_shadowsDarkness").min(0).max(1).step(0.01).name("Darkness").onChange(() => generator.setDarkness(this._shadowsDarkness));
        folder.add(generator, "bias").min(0).max(1).step(0.0000001).name("Bias");
        folder.add(generator, "blurBoxOffset").min(0).max(10).step(1).name("Blur Box Offset");
        folder.add(generator, "blurScale").min(0).max(16).step(1).name("Blur Scale");
        folder.add(generator, "useKernelBlur").name("Use Kernel Blur");
        folder.add(generator, "blurKernel").min(0).max(512).step(1).name("Blur Kernel");

        folder.add(generator, "usePoissonSampling").name("Use Poisson Sampling");
        folder.add(generator, "useExponentialShadowMap").name("Use Exponential Shadow Map");
        folder.add(generator, "useBlurExponentialShadowMap").name("Use Blur Exponential Shadow Map");
        folder.add(generator, "useCloseExponentialShadowMap").name("Use Close Exponential Shadow Map");
        folder.add(generator, "useBlurCloseExponentialShadowMap").name("Use Blur Close Exponential Shadow Map");
    }
}

Inspector.RegisterObjectInspector({
    ctor: ShadowsInspector,
    ctorNames: ["DirectionalLight", "SpotLight", "PointLight"],
    title: "Shadows",
    isSupported: (o) => (o instanceof DirectionalLight || o instanceof SpotLight || o instanceof PointLight),
});
