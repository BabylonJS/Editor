import { toast } from "sonner";

import { LuPipette } from "react-icons/lu";

import { Button } from "../../../../../ui/shadcn/ui/button";

import { updateTerrainSettings } from "../settings";
import { TerrainViewportController } from "../viewport/controller";

import { TerrainSettingsNumberField } from "../components/settings-fields";

export interface ITerrainHeightFieldProps {
	/** Options of the tool that hold the height (world cm). */
	object: { heightWorld: number };
	controller: TerrainViewportController;
}

/**
 * Height of a tool with a pipette that picks the height of the terrain under the cursor of the preview.
 */
export function TerrainHeightField(props: ITerrainHeightFieldProps) {
	function handlePick() {
		const height = props.controller.pickHeightUnderCursor();
		if (height === null) {
			toast.info("Hover the terrain in the preview first, or press I there.");
		} else {
			updateTerrainSettings(() => (props.object.heightWorld = Math.round(height * 10) / 10));
		}
	}

	return (
		<div className="flex items-center gap-1 w-full">
			<div className="flex-1 min-w-0">
				<TerrainSettingsNumberField object={props.object} property="heightWorld" label="Height" step={1} />
			</div>

			<Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" title="Pick height from terrain (I)" onClick={() => handlePick()}>
				<LuPipette className="w-4 h-4" />
			</Button>
		</div>
	);
}
