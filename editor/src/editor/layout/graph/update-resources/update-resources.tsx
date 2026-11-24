import { createRoot } from "react-dom/client";

import { toast } from "sonner";

import { Node } from "babylonjs";

import { openSingleFileDialog } from "../../../../tools/dialog";

import { Editor } from "../../../main";

import { UpdateResourcesDialog } from "./dialog";

/**
 * Asks the user for an asset file (glTF, glb or babylon) and opens the dialog to update the resources of the given node and
 * its descendants from that file. Used when the asset instantiated in the scene changed (a new version delivered by an
 * artist): the meshes (with their skeleton and morph targets), transforms and animation groups already in the scene are
 * updated in place, keeping everything set in the editor (materials, scripts, positions, etc.).
 * @param editor defines the reference to the editor.
 * @param node defines the reference to the node to update, with its descendants.
 */
export async function showUpdateResourcesFromAsset(editor: Editor, node: Node): Promise<void> {
	// While the game plays, the graph shows the nodes of the game, not the ones of the scene being edited.
	const play = editor.layout.preview.play;
	if (play.scene || play.state.playing) {
		toast.error("Stop the game before updating resources.");
		return;
	}

	const filename = openSingleFileDialog({
		title: "Select the asset to update the hierarchy from",
		filters: [
			{ name: "GLTF", extensions: ["gltf", "glb"] },
			{ name: "Babylon.js Scene File", extensions: ["babylon"] },
		],
		defaultPath: editor.layout.assets.state.browsedPath,
	});

	if (!filename) {
		return;
	}

	const div = document.createElement("div");
	div.style.width = "100%";
	div.style.height = "100%";
	document.body.appendChild(div);

	const root = createRoot(div);

	return new Promise<void>((resolve) => {
		root.render(
			<UpdateResourcesDialog
				editor={editor}
				node={node}
				filename={filename}
				onClose={() => {
					resolve();

					root.unmount();
					document.body.removeChild(div);
				}}
			/>
		);
	});
}
