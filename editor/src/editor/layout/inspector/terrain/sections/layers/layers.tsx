import { LuEllipsis, LuImport, LuPaintbrush, LuPlus } from "react-icons/lu";

import { Mesh } from "babylonjs";

import { Editor } from "../../../../../main";

import { showConfirm } from "../../../../../../ui/dialog";
import { Button } from "../../../../../../ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../../../../ui/shadcn/ui/dropdown-menu";

import { getTerrainPlugin } from "../../../../../../tools/terrain/engine/info";
import { addTerrainMaterialLayers } from "../../../../../../tools/terrain/engine/layers";
import { disableTerrainTexturePainting, enableTerrainTexturePainting } from "../../../../../../tools/terrain/engine/material";
import { ITerrainInfo } from "../../../../../../tools/terrain/engine/types";
import { isTerrainBusy } from "../../../../../../tools/terrain/engine/yield";

import { EditorInspectorSectionField } from "../../../fields/section";

import { getActiveTerrainLayerId, setActiveTerrainLayerId } from "../../settings";

import { TerrainDropZone } from "../../components/drop-zone";

import { openTerrainSplatImport } from "../../dialogs/import-splat";

import { TerrainLayerRow } from "./row";

const maxLayers = 8;

export interface ITerrainLayersSectionProps {
	editor: Editor;
	mesh: Mesh;
	info: ITerrainInfo;
}

/**
 * "Layers" section of the paint mode: the layers painted on the terrain and the field that adds layers. The options of the active layer
 * are in the "Layer options" section. A terrain is painted once the texture painting is enabled: it replaces the material of the terrain
 * by a terrain material. Textures, folders of textures and ".material" files can be dropped on the section to create layers.
 */
export function TerrainLayersSection(props: ITerrainLayersSectionProps) {
	const { editor, mesh, info } = props;

	const plugin = getTerrainPlugin(mesh);
	const layers = plugin?.data.layers ?? [];
	const activeLayer = layers.find((layer) => layer.id === getActiveTerrainLayerId(mesh.material));

	const disabled = isTerrainBusy() || info.readOnly;

	async function handleAddLayer() {
		// "Layer 3", or the next number when a layer already has this name.
		let index = layers.length + 1;
		while (layers.some((layer) => layer.name === `Layer ${index}`)) {
			++index;
		}

		const [layerId] = await addTerrainMaterialLayers(editor, mesh, [{ name: `Layer ${index}` }]);
		setActiveTerrainLayerId(mesh.material!, layerId);
	}

	async function handleDisableTexturePainting() {
		const confirmed = await showConfirm(
			"Disable texture painting?",
			"The terrain gets back the material it had before texture painting was enabled (or a PBR material using the first layer's albedo and normal maps). Painted layers are kept in the terrain material while this can be undone.",
			{ confirmText: "Disable" }
		);

		if (confirmed) {
			disableTerrainTexturePainting(editor, mesh);
		}
	}

	// The header of the section toggles the section when it is clicked: not the menu.
	const label = (
		<div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
			{layers.length}/{maxLayers}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="w-6 h-6" title="Layers menu">
						<LuEllipsis className="w-4 h-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem className="gap-2" disabled={disabled} onClick={() => openTerrainSplatImport(editor, mesh)}>
						<LuImport className="w-4 h-4" /> Import splat map…
					</DropdownMenuItem>
					<DropdownMenuItem className="gap-2" disabled={disabled || !plugin} onClick={() => handleDisableTexturePainting()}>
						<LuPaintbrush className="w-4 h-4" /> Disable texture painting…
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);

	if (!plugin) {
		const material = mesh.material;
		const convertible = material?.getClassName() === "PBRMaterial" || material?.getClassName() === "StandardMaterial";

		return (
			<EditorInspectorSectionField title="Layers" label={label}>
				<TerrainDropZone editor={editor} mesh={mesh} zone="layers-list" disabled={disabled} className="rounded-lg">
					<div className="flex flex-col items-center gap-2 w-full p-3 rounded-lg bg-muted-foreground/10 text-center">
						<div>Texture painting is not enabled for this terrain.</div>

						<Button className="flex items-center gap-2" disabled={disabled} onClick={() => enableTerrainTexturePainting(editor, mesh, { from: "create" })}>
							<LuPaintbrush className="w-4 h-4 stroke-primary-foreground" /> Enable texture painting
						</Button>

						{convertible && (
							<Button
								variant="secondary"
								className="max-w-full h-auto py-2 whitespace-normal"
								disabled={disabled}
								onClick={() => enableTerrainTexturePainting(editor, mesh, { from: "convert" })}
							>
								Use “{material!.name}” as layer 1
							</Button>
						)}

						<div className="text-xs text-muted-foreground">Or drop images, a texture folder or a .material here to create layers.</div>
					</div>
				</TerrainDropZone>
			</EditorInspectorSectionField>
		);
	}

	return (
		<EditorInspectorSectionField title="Layers" label={label}>
			<div className="flex flex-col gap-1 w-full">
				{layers.map((layer, index) => (
					<TerrainLayerRow
						key={layer.id}
						editor={editor}
						mesh={mesh}
						layer={layer}
						index={index}
						count={layers.length}
						coverage={info.layers[index]?.coverage ?? null}
						active={layer === activeLayer}
						disabled={disabled}
					/>
				))}
			</div>

			<TerrainDropZone editor={editor} mesh={mesh} zone="layers-list" disabled={disabled} className="rounded-lg">
				<div
					title={layers.length >= maxLayers ? "8 layers maximum (2 weight maps)" : undefined}
					className="flex flex-col items-center gap-2 w-full p-2 rounded-lg border border-dashed border-muted-foreground/30 text-center"
				>
					<Button variant="secondary" className="flex items-center gap-2" disabled={disabled || layers.length >= maxLayers} onClick={() => handleAddLayer()}>
						<LuPlus className="w-4 h-4" /> Add layer
					</Button>

					<div className="text-xs text-muted-foreground">Drop images, a texture folder or a .material to add layers.</div>
				</div>
			</TerrainDropZone>
		</EditorInspectorSectionField>
	);
}
