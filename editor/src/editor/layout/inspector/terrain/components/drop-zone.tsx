import { DragEvent, PropsWithChildren, useState } from "react";

import { Mesh } from "babylonjs";

import { Editor } from "../../../../main";

import { expandTerrainDroppedPaths, isTerrainDragAccepted } from "../../../../../tools/terrain/io/sources";

import { dropTerrainFiles, ITerrainDropTarget, readTerrainDropPaths } from "../drop";

export interface ITerrainDropZoneProps extends PropsWithChildren, ITerrainDropTarget {
	editor: Editor;
	mesh: Mesh;

	disabled?: boolean;
	className?: string;
	/** Classes of the zone while files are dragged over it: an outline by default. */
	dragOverClassName?: string;
}

/**
 * Zone where assets of the assets browser and files of the system can be dropped: images, folders of textures, ".material" files...
 * The zone is highlighted during the drag. What the drop does depends on the zone (see ITerrainDropTarget).
 */
export function TerrainDropZone(props: ITerrainDropZoneProps) {
	const [dragOver, setDragOver] = useState(false);

	function handleDragOver(ev: DragEvent<HTMLDivElement>) {
		if (!props.disabled && isTerrainDragAccepted(ev.dataTransfer)) {
			ev.preventDefault();
			setDragOver(true);
		}
	}

	async function handleDrop(ev: DragEvent<HTMLDivElement>) {
		if (props.disabled || !isTerrainDragAccepted(ev.dataTransfer)) {
			return;
		}

		ev.preventDefault();
		ev.stopPropagation();

		setDragOver(false);

		// The folders are replaced by the files they contain.
		const paths = await expandTerrainDroppedPaths(readTerrainDropPaths(props.editor, ev.dataTransfer));
		dropTerrainFiles(props.editor, props.mesh, props, paths);
	}

	return (
		<div
			onDrop={(ev) => handleDrop(ev)}
			onDragOver={(ev) => handleDragOver(ev)}
			onDragLeave={(ev) => !ev.currentTarget.contains(ev.relatedTarget as Node) && setDragOver(false)}
			className={`${props.className ?? ""} ${dragOver ? (props.dragOverClassName ?? "outline outline-2 -outline-offset-2 outline-primary/60") : ""}`}
		>
			{props.children}
		</div>
	);
}
