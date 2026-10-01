import { basename } from "path/posix";

import { Mesh } from "babylonjs";

import { Editor } from "../../../../main";

import { TERRAIN_BRUSHES } from "../../../../../tools/terrain/io/brushes";

import { terrainCustomBrushes, terrainSettings, updateTerrainSettings } from "../settings";

import { TerrainDropZone } from "../components/drop-zone";

export interface ITerrainBrushPaletteProps {
	editor: Editor;
	mesh: Mesh;
}

/**
 * Brushes of the terrain tool, then the custom brushes: their image, highlighted when the brush is selected. Click a brush to select it.
 * The textures dropped on the palette, from the assets browser for example, become custom brushes: the background of the palette changes
 * while they are dragged over it.
 */
export function TerrainBrushPalette(props: ITerrainBrushPaletteProps) {
	// The id of a custom brush is the path of its texture.
	const brushes = [...TERRAIN_BRUSHES, ...terrainCustomBrushes.map((path) => ({ id: path, name: basename(path), image: path }))];

	return (
		<TerrainDropZone
			editor={props.editor}
			mesh={props.mesh}
			zone="brush-palette"
			className="grid grid-cols-[repeat(auto-fill,56px)] justify-center gap-2 p-2 rounded-lg w-full max-h-64 overflow-y-auto bg-black/30 transition-all duration-300 ease-in-out"
			dragOverClassName="!bg-muted-foreground/75 dark:!bg-muted-foreground/20"
		>
			{brushes.map((brush) => (
				<div
					key={brush.id}
					title={brush.name}
					onClick={() => updateTerrainSettings((settings) => (settings.brush.brushId = brush.id))}
					className={`
						w-14 h-14 p-1 rounded-lg cursor-pointer select-none
						${brush.id === terrainSettings.brush.brushId ? "bg-primary/20 ring-2 ring-primary/60" : "bg-secondary hover:bg-background"}
						transition-all duration-300 ease-in-out
					`}
				>
					<img src={brush.image} draggable={false} className="w-full h-full object-contain" />
				</div>
			))}
		</TerrainDropZone>
	);
}
