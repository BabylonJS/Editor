import { LuEllipsis, LuFocus, LuHand, LuListTree, LuRotateCcw } from "react-icons/lu";

import { Mesh } from "babylonjs";

import { Editor } from "../../../../main";

import { Badge } from "../../../../../ui/shadcn/ui/badge";
import { Toggle } from "../../../../../ui/shadcn/ui/toggle";
import { Button } from "../../../../../ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../../../../../ui/shadcn/ui/dropdown-menu";

import { showConfirm } from "../../../../../ui/dialog";

import { ITerrainInfo } from "../../../../../tools/terrain/engine/types";

import { resetTerrainSettings } from "../settings";
import { TerrainViewportController } from "../viewport/controller";
import { formatTerrainResolution, formatTerrainSize } from "../format";

import { TerrainOverlayOptions, TerrainOverlays } from "./overlays";

export interface ITerrainHeaderProps {
	editor: Editor;
	mesh: Mesh;
	info: ITerrainInfo;
	controller: TerrainViewportController;
}

/**
 * Line of the terrain being edited, the one selected in the graph: the debug overlays, its resolution and its size, the "Navigate"
 * toggle that gives the left button of the mouse back to the camera, and the menu of the terrain. When the inspector is too narrow, the
 * resolution, the size and the buttons move to a second line. The options of the selected overlay follow.
 */
export function TerrainHeader(props: ITerrainHeaderProps) {
	const { editor, mesh, info, controller } = props;

	async function handleResetSettings() {
		const confirmed = await showConfirm(
			"Reset brush and tool settings?",
			"Every tool, brush, filter and view setting goes back to its default. Your brushes and terrains are not changed.",
			{ confirmText: "Reset" }
		);

		if (confirmed) {
			resetTerrainSettings();
		}
	}

	return (
		<div className="flex flex-col gap-2 rounded-lg p-2">
			<div className="flex flex-wrap items-center gap-2 w-full px-2">
				<TerrainOverlays mesh={mesh} info={info} />

				<div className="flex flex-wrap justify-end items-center gap-2 ml-auto">
					<Badge variant="secondary">{formatTerrainResolution(info.subdivisions)}</Badge>
					<Badge variant="secondary">{formatTerrainSize(info.width, info.height)}</Badge>

					<div className="flex items-center gap-1">
						<Toggle
							size="sm"
							aria-label="Navigate (N)"
							title="Navigate (N): the left button of the mouse moves the camera instead of editing the terrain"
							pressed={controller.navigateMode}
							onPressedChange={(pressed) => controller.setNavigateMode(pressed)}
						>
							<LuHand />
						</Toggle>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="w-8 h-8" aria-label="Terrain menu">
									<LuEllipsis className="w-4 h-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem className="gap-2" onClick={() => editor.layout.preview.focusObject(mesh)}>
									<LuFocus className="w-4 h-4" /> Focus terrain
								</DropdownMenuItem>
								<DropdownMenuItem className="gap-2" onClick={() => editor.layout.graph.setSelectedNode(mesh)}>
									<LuListTree className="w-4 h-4" /> Select in graph
								</DropdownMenuItem>

								<DropdownMenuSeparator />

								<DropdownMenuItem className="gap-2" onClick={() => handleResetSettings()}>
									<LuRotateCcw className="w-4 h-4" /> Reset brush & tool settings…
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</div>

			<TerrainOverlayOptions info={info} />
		</div>
	);
}
