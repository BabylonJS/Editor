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

    /**
     * Adds the common editable properties.
     * @override
     */
    protected addCommon(): GUI {
        const common = super.addCommon();
        common.add(this.selectedObject, "intensity").step(0.01).name("Intensity");
        common.add(this.selectedObject, "range").step(0.01).name("Range");

        this.addColors();
        this.addExcludedMeshes();

        return common;
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
