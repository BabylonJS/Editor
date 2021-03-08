import { Mesh, Material, SubMesh, Constants } from "babylonjs";
import { GUI } from "dat.gui";

import { MaterialAssets } from "../../assets/materials";

import { AbstractInspectorLegacy } from "../abstract-inspector-legacy";

export class MaterialInspector<T extends Material> extends AbstractInspectorLegacy<Mesh | SubMesh | Material> {
    /**
     * Defines the material reference.
     */
    protected material: T;

    private _sideOrientation: string = "";
    private _alphaMode: string = "";

    /**
     * Returns wether or not the selected object in the editor is supported to edit material.
     * @param o the object being selected in the editor.
     */
    public static IsObjectSupported(o: any, materialCtor: (new (...args: any[]) => Material)): boolean {
        // Selected a mterial.
        if (o instanceof materialCtor) { return true; }
        // Selected a mesh
        if (o instanceof Mesh && o.material instanceof materialCtor) { return true; }
        // Selected a submesh
        if (o instanceof SubMesh && o.getMaterial() instanceof materialCtor) { return true; }

        return false;
    }

    /**
     * Called on a controller finished changes.
     * @override
     */
    public onControllerFinishChange(): void {
        super.onControllerFinishChange();
        this.editor.assets.refresh(MaterialAssets, this.material);
    }

    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        if (this.selectedObject instanceof Material) {
            this.material = this.selectedObject as T;
        } else if (this.selectedObject instanceof Mesh) {
            this.material = this.selectedObject.material as T;
        } else if (this.selectedObject instanceof SubMesh) {
            this.material = this.selectedObject.getMaterial() as T;
        }

        this.addCommon();
    }

    /**
     * Adds the common editable properties.
     */
    protected addCommon(): GUI {
        const common = this.tool!.addFolder("Common");
        common.open();
        common.add(this.material, "name").name("Name");
        common.add(this.material, "alpha").min(0).max(1).name("Alpha");
        common.add(this.material, "zOffset").step(0.01).name("Z Offset");
        common.add(this.material, "wireframe").name("Wire Frame");
        common.add(this.material, "fogEnabled").name("Fog Enabled");
        common.add(this.material, "backFaceCulling").name("Back Face Culling");
        common.add(this.material, "checkReadyOnEveryCall").name("Check Ready On Every Call");
        common.add(this.material, "checkReadyOnlyOnce").name("Check Ready Only Once");
        common.add(this.material, "disableDepthWrite").name("Disable Depth Write");
        common.add(this.material, "needDepthPrePass").name("Need Depth Pre Pass");

        if ((this.material["disableLighting"] ?? null) !== null) {
            common.add(this.material, "disableLighting").name("Disable Lighting");
        }

        const maxSimultaneousLights = this.material["maxSimultaneousLights"] ?? null;
        if (maxSimultaneousLights !== null) {
            common.add(this.material, "maxSimultaneousLights").step(1).min(0).max(32).name("Max Simultaneous Lights");
        }

        const sideOrientations: string[] = ["ClockWiseSideOrientation", "CounterClockWiseSideOrientation"];
        this._sideOrientation = sideOrientations.find((so) => this.material.sideOrientation === Material[so]) ?? sideOrientations[0];
        common.addSuggest(this, "_sideOrientation", sideOrientations).name("Side Orientation").onChange(() => {
            this.material.sideOrientation = Material[this._sideOrientation];
        });

        const alphaModes: string[] = [
            "ALPHA_DISABLE", "ALPHA_ADD", "ALPHA_COMBINE", "ALPHA_SUBTRACT",
            "ALPHA_MULTIPLY", "ALPHA_MAXIMIZED", "ALPHA_ONEONE", "ALPHA_PREMULTIPLIED",
            "ALPHA_PREMULTIPLIED_PORTERDUFF", "ALPHA_INTERPOLATE", "ALPHA_SCREENMODE",
        ];
        this._alphaMode = alphaModes.find((am) => this.material.alphaMode === Constants[am]) ?? alphaModes[0];
        common.addSuggest(this, "_alphaMode", alphaModes).name("Alpha Mode").onChange(() => {
            this.material.alphaMode = Constants[this._alphaMode];
        })

        return common;
    }
}
