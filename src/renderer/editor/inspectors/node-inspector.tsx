import { Node } from "babylonjs";
import { GUI } from "dat.gui";

import { Inspector } from "../components/inspector";
import { ScriptInspector } from "./script-inspector";

export class NodeInspector extends ScriptInspector<Node> {
    private _enabled: boolean = false;

    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        this.addCommon();
        this.addScript();
    }

    /**
     * Adds the common editable properties.
     */
    protected addCommon(): GUI {
        const common = this.tool!.addFolder("Common");
        common.open();
        common.add(this.selectedObject, 'name').name('Name');

        this._enabled = this.selectedObject.isEnabled(false);
        common.add(this, "_enabled").name("Enabled").onChange(() => {
            this.selectedObject.setEnabled(this._enabled);
        });

        return common;
    }
}

Inspector.RegisterObjectInspector({
    ctor: NodeInspector,
    ctorNames: ["Node"],
    title: "Node",
});
