import { copyFile, ensureDir, pathExists } from "fs-extra";
import { basename, join } from "path/posix";

import { useEffect, useState } from "react";

import { computeOrGetThumbnail, Editor, isCollisionInstancedMesh, isCollisionMesh, openModelViewer, SpinnerUIComponent } from "babylonjs-editor";

import { importFabJson } from "../../import/import";

import { IFabJson, IFabMeshJson } from "../../typings";

export interface IFabMeshesBrowserItemProps {
	editor: Editor;
	fabJson: IFabJson;
	meshJson: IFabMeshJson;
	finalAssetsFolder: string;
}

export function FabMeshesBrowserItem(props: IFabMeshesBrowserItemProps) {
	const [thumbnail, setThumbnail] = useState<string | null>(null);
	const [dropListener, setDropListener] = useState<((ev: DragEvent) => void) | null>(null);

	const dest = join(props.finalAssetsFolder, basename(props.meshJson.file));

	let overrideMaterialAbsolutePath: string | undefined;
	const material = props.fabJson.materials[props.meshJson.material_index];
	if (material) {
		overrideMaterialAbsolutePath = join(props.finalAssetsFolder, `${material.name}.material`);
	}

	useEffect(() => {
		handleComputeThumbnail();
	}, [props.meshJson]);

	async function handleComputeThumbnail() {
		await ensureDir(props.finalAssetsFolder);

		if (!(await pathExists(dest))) {
			await copyFile(props.meshJson.file, dest);
		}

		const thumbnail = await computeOrGetThumbnail(props.editor, {
			type: "mesh",
			absolutePath: dest,
			overrideMaterialAbsolutePath,
		});

		setThumbnail(thumbnail);
	}

	async function handleImportAsset(ev: DragEvent) {
		const scene = props.editor.layout.preview.scene;
		const pick = scene.pick(ev.offsetX, ev.offsetY, (m) => !m._masterMesh && !isCollisionMesh(m) && !isCollisionInstancedMesh(m), false);

		await ensureDir(props.finalAssetsFolder);

		props.editor.layout.graph.refresh();
		props.editor.layout.assets.refresh();

		await importFabJson(props.editor, {
			json: props.fabJson,
			importMeshes: true,
			importMaterials: true,
			finalAssetsFolder: props.finalAssetsFolder,
			position: pick?.pickedPoint ?? undefined,
			pickedMesh: pick?.pickedMesh ?? undefined,
			meshesPredicate: (meshFile: string) => meshFile === props.meshJson.file,
		});

		props.editor.layout.graph.refresh();
		props.editor.layout.assets.refresh();
	}

	function handleDragStart() {
		const dropListener = (ev: DragEvent) => {
			ev.preventDefault();
			handleImportAsset(ev);
		};

		setDropListener(() => dropListener);

		props.editor.layout.preview.canvas?.addEventListener("drop", dropListener);
	}

	function handleDragEnd() {
		if (dropListener) {
			setDropListener(null);
			props.editor.layout.preview.canvas?.removeEventListener("drop", dropListener);
		}
	}

	function handleDoubleClick() {
		openModelViewer(props.editor, dest, {
			overrideMaterialAbsolutePath,
		});
	}

	return (
		<div
			className={`
				group
				flex flex-col w-full rounded-lg cursor-pointer select-none
				ring-muted-foreground hover:ring-2
				transition-all duration-300 ease-in-out
			`}
			onDragEnd={handleDragEnd}
			onDragStart={handleDragStart}
			onDoubleClick={handleDoubleClick}
		>
			<div className="flex justify-center items-center w-full aspect-square bg-muted rounded-t-lg">
				{!thumbnail && <SpinnerUIComponent />}
				{thumbnail && <img alt="" src={thumbnail} className="w-full aspect-square object-cover rounded-t-lg" />}
			</div>

			<div className="flex flex-col gap-1 p-2 bg-secondary rounded-b-lg select-none">
				<div className="flex-1 font-semibold text-ellipsis overflow-hidden whitespace-nowrap">{basename(props.meshJson.file)}</div>
			</div>
		</div>
	);
}
