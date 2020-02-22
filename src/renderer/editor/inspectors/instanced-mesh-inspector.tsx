import { Inspector } from "../components/inspector";
import { MeshInspector } from "./mesh-inspector";

export class InstancedMeshInspector extends MeshInspector {
    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        this.addCommon();
        this.addTransforms();
    }
}

Inspector.registerObjectInspector({
    ctor: MeshInspector,
    ctorNames: ["InstancedMesh"],
    title: "Instanced Mesh",
});
