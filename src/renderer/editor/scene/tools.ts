import { Mesh } from "babylonjs";

import { Editor } from "../editor";
import { Alert } from "../gui/alert";

export class SceneTools {
    /**
     * Merges the given meshes into a single one, by creating sub meshes and keeping materials.
     * @param editor the editor reference.
     * @param meshes the list of all meshes to merge into a single mesh.
     */
    public static MergeMeshes(editor: Editor, meshes: Mesh[]): void {
        const merged = Mesh.MergeMeshes(meshes, false, true, undefined, true, undefined);
        if (!merged) {
            Alert.Show("Can't merge meshes", "An error occured while merging meshes.");
            return;
        }

        // Refresh graph!
        editor.graph.refresh();
    }
}
