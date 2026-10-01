import { basename } from "path/posix";

import { useState } from "react";

import { toast } from "sonner";

import { LuFolderOpen, LuX } from "react-icons/lu";

import { Mesh } from "babylonjs";

import { Editor } from "../../../../main";

import { Button } from "../../../../../ui/shadcn/ui/button";

import { openSingleFileDialog } from "../../../../../tools/dialog";
import { importTerrainSplatMaps } from "../../../../../tools/terrain/io/masks";

import { EditorInspectorSwitchField } from "../../fields/switch";

import { showTerrainDialog } from "./show-dialog";

interface ITerrainSplatImportDialogProps {
	editor: Editor;
	mesh: Mesh;
	onClose: () => void;
}

function TerrainSplatImportDialog(props: ITerrainSplatImportDialogProps) {
	const [paths, setPaths] = useState<(string | null)[]>([null, null]);
	const [options] = useState({ flipY: false });

	function handleSetPath(index: number, path: string | null) {
		setPaths(paths.map((value, i) => (i === index ? path : value)));
	}

	function handleBrowse(index: number) {
		const path = openSingleFileDialog({
			title: "Select a splat map",
			filters: [{ name: "Splat maps", extensions: ["png", "tif", "tiff"] }],
		});

		if (path) {
			handleSetPath(index, path.replace(/\\/g, "/"));
		}
	}

	async function handleApply() {
		props.onClose();

		await importTerrainSplatMaps(props.editor, props.mesh, [paths[0]!, paths[1]], options);
		toast.success(`Splat map${paths[1] ? "s" : ""} imported`);
	}

	return (
		<div className="flex flex-col gap-2 w-[420px] max-w-[90vw] pt-2 text-foreground">
			<div className="px-2 text-xs text-center text-muted-foreground">
				Each channel (R, G, B, A) of an image is the weight of one layer: the first image drives layers 1–4, the second one layers 5–8. Image top = +Z.
			</div>

			{["Layers 1–4", "Layers 5–8 (optional)"].map((label, index) => (
				<div key={label} className="flex items-center gap-2 px-2">
					<div className="w-1/3">{label}</div>
					<div className="flex-1 min-w-0 text-sm truncate">{paths[index] ? basename(paths[index]!) : "None"}</div>

					{paths[index] && (
						<Button variant="ghost" size="icon" title="Clear" className="w-8 h-8 shrink-0" onClick={() => handleSetPath(index, null)}>
							<LuX className="w-4 h-4" />
						</Button>
					)}

					<Button variant="secondary" size="icon" title="Browse…" className="w-8 h-8 shrink-0" onClick={() => handleBrowse(index)}>
						<LuFolderOpen className="w-4 h-4" />
					</Button>
				</div>
			))}

			<EditorInspectorSwitchField noUndoRedo object={options} property="flipY" label="Flip vertically" />

			<div className="px-2 text-xs text-center text-muted-foreground">
				The painted weights of every layer are replaced, and the missing layers are added (named “Splat …”). This can be undone.
			</div>

			<div className="flex justify-end gap-2 pt-2">
				<Button variant="secondary" className="min-w-24" onClick={() => props.onClose()}>
					Cancel
				</Button>
				<Button className="min-w-24" disabled={!paths[0]} onClick={() => handleApply()}>
					Apply
				</Button>
			</div>
		</div>
	);
}

/**
 * Opens the dialog that imports splat maps: images whose channels are the weights of the layers of the terrain.
 */
export function openTerrainSplatImport(editor: Editor, mesh: Mesh): void {
	showTerrainDialog("Import splat map", (close) => <TerrainSplatImportDialog editor={editor} mesh={mesh} onClose={close} />);
}
