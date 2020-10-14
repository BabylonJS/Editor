import * as React from "react";

import { Light } from "babylonjs";
import { GUI } from "dat.gui";

import { Inspector } from "../../components/inspector";
import { NodeInspector } from "../node-inspector";

import { ExcludedMeshesList } from "./components/excluded-meshes-list";

export class LightInspector extends NodeInspector {
    /**
     * The selected object reference.
     */
    protected selectedObject: Light;

    private _intensityMode: string = "";

    /**
     * Adds the common editable properties.
     * @override
     */
    protected addCommon(): GUI {
        const common = super.addCommon();
        common.add(this.selectedObject, "range").step(0.01).name("Range");
        common.add(this.selectedObject, "radius").step(0.00001).min(0).name("Radius");

        this.addIntensity();
        this.addColors();
        this.addExcludedMeshes();

        return common;
    }

    /**
     * Adds the intensity editable properties.
     */
    protected addIntensity(): GUI {
        const intensity = this.tool!.addFolder("Intensity");
        intensity.open();

        intensity.add(this.selectedObject, "intensity").step(0.01).name("Intensity");

        const modes: string[] = [
            "INTENSITYMODE_AUTOMATIC",
            "INTENSITYMODE_LUMINOUSPOWER",
            "INTENSITYMODE_LUMINOUSINTENSITY",
            "INTENSITYMODE_ILLUMINANCE",
            "INTENSITYMODE_LUMINANCE",
        ];
        this._intensityMode = modes.find((m) => Light[m] === this.selectedObject.intensityMode) ?? modes[0];
        intensity.addSuggest(this, "_intensityMode", modes).name("Mode").onChange(() => this.selectedObject.intensityMode = Light[this._intensityMode]);

        return intensity;
    }

    /**
     * Adds the colors editable properties
     */
    protected addColors(): GUI {
        this.addColor(this.tool!, "Diffuse", this.selectedObject, "diffuse");
        return this.addColor(this.tool!, "Specular", this.selectedObject, "specular");
    }

    /**
     * Adds all the excluded meshes editable properties.
     */
    protected addExcludedMeshes(): void {
        const excludedMeshes = this.tool!.addFolder("Excuded Meshes");
        excludedMeshes.open();

        excludedMeshes.addCustom("500px", <ExcludedMeshesList editor={this.editor} light={this.selectedObject} />);
    }
}

Inspector.RegisterObjectInspector({
    ctor: LightInspector,
    ctorNames: ["Light"],
    title: "Light",
});
