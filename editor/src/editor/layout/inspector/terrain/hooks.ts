import { useEffect, useState } from "react";

import { onRedoObservable, onUndoObservable } from "../../../../tools/undoredo";
import { onTerrainChangedObservable } from "../../../../tools/terrain/engine/events";
import { getTerrainImageThumbnail } from "../../../../tools/terrain/io/sources";
import { resolveRenamedAssetPath, toTerrainAbsolutePath } from "../../../../tools/terrain/io/paths";

import { onTerrainSettingsChangedObservable } from "./settings";

/**
 * Re-renders the calling component each time the terrain settings change.
 */
export function useTerrainSettings(): void {
	const [, setRevision] = useState(0);

	useEffect(() => {
		const observer = onTerrainSettingsChangedObservable.add(() => setRevision((revision) => revision + 1));

		return () => {
			onTerrainSettingsChangedObservable.remove(observer);
		};
	}, []);
}

/**
 * Returns a number that changes each time a terrain is modified outside of the fields of the inspector: strokes, operations, dropped
 * files, undo, redo... The fields bound to the data of a terrain use it to show the new values.
 */
export function useTerrainRevision(): number {
	const [revision, setRevision] = useState(0);

	useEffect(() => {
		const update = () => setRevision((revision) => revision + 1);

		// "layer-edit" is the reason of the values written by the fields of a layer while they are edited.
		const terrainObserver = onTerrainChangedObservable.add((event) => event.reason !== "layer-edit" && update());
		const undoObserver = onUndoObservable.add(update);
		const redoObserver = onRedoObservable.add(update);

		return () => {
			onTerrainChangedObservable.remove(terrainObserver);
			onUndoObservable.remove(undoObserver);
			onRedoObservable.remove(redoObserver);
		};
	}, []);

	return revision;
}

/**
 * Returns the thumbnail of a texture of a layer: undefined while it loads, null when its file can't be read.
 * @param path defines the path of the texture in the data of the layer, relative to the project.
 */
export function useTerrainLayerThumbnail(path: string | null): string | null | undefined {
	const [thumbnail, setThumbnail] = useState<string | null | undefined>(undefined);

	useEffect(() => {
		let canceled = false;
		setThumbnail(path ? undefined : null);

		// The assets renamed since the last save are found with their new path.
		if (path) {
			getTerrainImageThumbnail(toTerrainAbsolutePath(resolveRenamedAssetPath(path)), 64).then((url) => !canceled && setThumbnail(url));
		}

		return () => {
			canceled = true;
		};
	}, [path]);

	return thumbnail;
}
