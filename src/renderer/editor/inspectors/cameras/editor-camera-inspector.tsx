import { ArcRotateCamera } from "babylonjs";

import { SceneSettings } from "../../scene/settings";

import { Inspector } from "../../components/inspector";
import { AbstractInspector } from "../abstract-inspector";

export class EditorCameraInspector extends AbstractInspector<ArcRotateCamera> {
    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        this.addCommon();
    }

    /**
     * Adds the common editable properties.
     */
    protected addCommon(): void {
        const common = this.tool!.addFolder("Common");
        common.open();
        
        common.add(this.selectedObject, "fov").step(0.01).name("FOV");
        common.add(this.selectedObject, "minZ").min(0).name("Min Z");
        common.add(this.selectedObject, "maxZ").min(0).name("Max Z");
        common.add(this.selectedObject, "panningSensibility").name("Panning Sensibility");
    }
}

Inspector.registerObjectInspector({
    ctor: EditorCameraInspector,
    ctorNames: [],
    title: "Editor Camera",
    isSupported: (c) => c === SceneSettings.Camera,
});
