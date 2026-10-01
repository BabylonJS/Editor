import { LuArrowDown, LuArrowUp, LuCopy, LuEllipsis, LuPaintBucket, LuTrash2 } from "react-icons/lu";

import { Mesh } from "babylonjs";
import { ITerrainLayerData } from "babylonjs-editor-tools";

import { Editor } from "../../../../../main";

import { showConfirm } from "../../../../../../ui/dialog";
import { Badge } from "../../../../../../ui/shadcn/ui/badge";
import { Button } from "../../../../../../ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../../../../../../ui/shadcn/ui/dropdown-menu";

import { duplicateTerrainMaterialLayer, moveTerrainMaterialLayer, removeTerrainMaterialLayer } from "../../../../../../tools/terrain/engine/layers";

import { runTerrainOperation } from "../../operation";
import { useTerrainLayerThumbnail } from "../../hooks";
import { setActiveTerrainLayerId } from "../../settings";

import { TerrainDropZone } from "../../components/drop-zone";

export interface ITerrainLayerRowProps {
	editor: Editor;
	mesh: Mesh;
	layer: ITerrainLayerData;

	index: number;
	/** Number of layers of the terrain. */
	count: number;
	/** Part of the terrain covered by the layer (0..1), null while the painted layers are not loaded. */
	coverage: number | null;

	active: boolean;
	disabled: boolean;
}

/**
 * Row of a layer in the list of layers: click it to make the layer active, drop textures or a ".material" file on it to replace its
 * textures, and open its menu for the other actions.
 */
export function TerrainLayerRow(props: ITerrainLayerRowProps) {
	const { editor, mesh, layer, index, count, disabled } = props;

	const thumbnail = useTerrainLayerThumbnail(layer.albedo);

	async function handleDuplicate() {
		const layerId = await duplicateTerrainMaterialLayer(editor, mesh, layer.id);
		setActiveTerrainLayerId(mesh.material!, layerId);
	}

	async function handleFill() {
		const confirmed = await showConfirm(
			`Fill the terrain with “${layer.name}”?`,
			`“${layer.name}” covers the whole terrain and the other layers are cleared. This can be undone.`,
			{ confirmText: "Fill" }
		);

		if (confirmed) {
			runTerrainOperation(editor, mesh, { type: "fill-layer", layerId: layer.id });
		}
	}

	async function handleRemove() {
		const confirmed = await showConfirm(`Remove layer “${layer.name}”?`, "Its painted areas go to the other layers. This can be undone.", { confirmText: "Remove" });
		if (confirmed) {
			removeTerrainMaterialLayer(editor, mesh, layer.id);
		}
	}

	return (
		<TerrainDropZone editor={editor} mesh={mesh} zone="layer-row" layerId={layer.id} disabled={disabled} className="rounded-lg">
			<div
				onClick={() => setActiveTerrainLayerId(mesh.material!, layer.id)}
				className={`
					flex items-center gap-2 h-12 px-2 rounded-lg cursor-pointer select-none
					${props.active ? "bg-primary/20 ring-1 ring-primary/40" : "hover:bg-muted-foreground/10"}
					transition-colors duration-200 ease-in-out
				`}
			>
				{/* The tint of the layer is shown while it has no albedo texture. */}
				<div
					style={{ backgroundColor: `rgb(${layer.tint.map((value) => Math.round(value * 255)).join()})` }}
					className="w-10 h-10 shrink-0 rounded-md overflow-hidden border border-border/50"
				>
					{thumbnail && <img src={thumbnail} draggable={false} className="w-full h-full object-cover" />}
				</div>

				<div className="flex-1 min-w-0 truncate text-sm">{layer.name}</div>

				<Badge variant="secondary" className="shrink-0 px-1.5 font-normal" title="Coverage of the terrain">
					{props.coverage === null ? "–" : `${Math.round(props.coverage * 100)} %`}
				</Badge>

				{/* The clicks in the menu must not select the layer. */}
				<div onClick={(ev) => ev.stopPropagation()}>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="w-7 h-7" title="Layer menu">
								<LuEllipsis className="w-4 h-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem className="gap-2" disabled={disabled || count >= 8} onClick={() => handleDuplicate()}>
								<LuCopy className="w-4 h-4" /> Duplicate
							</DropdownMenuItem>
							<DropdownMenuItem className="gap-2" disabled={disabled || index === 0} onClick={() => moveTerrainMaterialLayer(editor, mesh, layer.id, index - 1)}>
								<LuArrowUp className="w-4 h-4" /> Move up
							</DropdownMenuItem>
							<DropdownMenuItem
								className="gap-2"
								disabled={disabled || index === count - 1}
								onClick={() => moveTerrainMaterialLayer(editor, mesh, layer.id, index + 1)}
							>
								<LuArrowDown className="w-4 h-4" /> Move down
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							<DropdownMenuItem className="gap-2" disabled={disabled} onClick={() => handleFill()}>
								<LuPaintBucket className="w-4 h-4" /> Fill terrain with this layer…
							</DropdownMenuItem>

							{/* A terrain keeps at least one layer: disable the texture painting to remove them all. */}
							<DropdownMenuItem className="gap-2" disabled={disabled || count === 1} onClick={() => handleRemove()}>
								<LuTrash2 className="w-4 h-4" /> Remove…
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</TerrainDropZone>
	);
}
