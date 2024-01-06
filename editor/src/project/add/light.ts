import { DirectionalLight, PointLight, Tools, Vector3 } from "babylonjs";
import { Editor } from "../../editor/main";

export function addPointLight(editor: Editor) {
    const light = new PointLight("New Point Light", Vector3.Zero(), editor.layout.preview.scene);
    light.id = Tools.RandomId();

    editor.layout.graph.refresh();
    editor.layout.inspector.setEditedObject(light);
    editor.layout.preview.gizmo.setAttachedNode(light);
}

export function addDirectionalLight(editor: Editor) {
    const light = new DirectionalLight("New Directional Light", new Vector3(0, -1, 0), editor.layout.preview.scene);
    light.id = Tools.RandomId();

    editor.layout.graph.refresh();
    editor.layout.inspector.setEditedObject(light);
    editor.layout.preview.gizmo.setAttachedNode(light);
}
