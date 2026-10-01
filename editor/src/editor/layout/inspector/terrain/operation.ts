import { toast } from "sonner";

import { Mesh } from "babylonjs";

import { Editor } from "../../../main";

import { applyTerrainOperation, TERRAIN_OPERATION_LABELS } from "../../../../tools/terrain/engine/operations";
import { TerrainOperation } from "../../../../tools/terrain/engine/types";

/**
 * Runs an operation on the whole terrain (fill a layer, normalize the weights...). A toast shows the operation while it
 * runs, then its error when it failed.
 */
export function runTerrainOperation(editor: Editor, mesh: Mesh, operation: TerrainOperation): void {
	toast.promise(applyTerrainOperation(editor, mesh, operation), {
		loading: `${TERRAIN_OPERATION_LABELS[operation.type]}…`,
		error: (error) => error.message,
	});
}
