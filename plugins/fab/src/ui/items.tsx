import { join } from "path/posix";
import { ensureDir } from "fs-extra";

import { useState } from "react";

import { Editor, isCollisionInstancedMesh, isCollisionMesh, showConfirm, SpinnerUIComponent, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "babylonjs-editor";

import { IFabJson } from "../typings";

import { importFabJson } from "../import/import";

export interface IFabItemsProps {
	editor: Editor;
	assets: IFabJson[];
	fabAssetsFolder: string;
	selectedAsset: IFabJson | null;
	processingAssetIds: Map<string, number>;

	onClick: (selectedAsset: IFabJson) => void;
	onDoubleClick: (browsedAsset: IFabJson) => void;
}

export function FabItems(props: IFabItemsProps) {
	const [dropListener, setDropListener] = useState<((ev: DragEvent) => void) | null>(null);

	async function handleImportAsset(ev: DragEvent, draggedAsset: IFabJson) {
		if (draggedAsset.meshes.length > 1) {
			if (
				!(await showConfirm(
					`Import ${draggedAsset.meshes.length} meshes?`,
					"This product has a lot of files. Importing all could cause the Babylon.js Editor to crash due to potentially too much high-quality texture, so make sure your work is saved."
				))
			) {
				return;
			}
		}

		const scene = props.editor.layout.preview.scene;
		const pick = scene.pick(ev.offsetX, ev.offsetY, (m) => !m._masterMesh && !isCollisionMesh(m) && !isCollisionInstancedMesh(m), false);

		const finalAssetsFolder = join(props.fabAssetsFolder, draggedAsset.metadata.fab.listing.title);
		await ensureDir(finalAssetsFolder);

		props.editor.layout.graph.refresh();
		props.editor.layout.assets.refresh();

		await importFabJson(props.editor, {
			finalAssetsFolder,
			json: draggedAsset,
			importMeshes: true,
			importMaterials: true,
			position: pick?.pickedPoint ?? undefined,
		});

		props.editor.layout.graph.refresh();
		props.editor.layout.assets.refresh();
	}

	function handleDragStart(asset: IFabJson) {
		const dropListener = (ev: DragEvent) => {
			ev.preventDefault();
			handleImportAsset(ev, asset);
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

	function handleDoubleClick(draggedAsset: IFabJson) {
		if (draggedAsset.meshes.length > 0) {
			props.onDoubleClick(draggedAsset);
		}
	}

	return (
		<TooltipProvider delayDuration={0}>
			<div className="flex flex-1 w-full h-full">
				<div
					style={{
						gridTemplateRows: `repeat(auto-fill, ${360 * 1}px)`,
						gridTemplateColumns: `repeat(auto-fill, ${272 * 1}px)`,
					}}
					className="grid justify-center gap-4 w-full h-full p-5 overflow-y-auto pb-14"
				>
					{props.assets.map((asset) => (
						<Tooltip key={asset.id}>
							<TooltipTrigger>
								<div
									className={`
										group
										flex flex-col w-full rounded-lg select-none
										ring-muted-foreground
										${props.selectedAsset === asset ? "ring-4" : "hover:ring-2"}
										${props.processingAssetIds.has(asset.id) ? "pointer-events-none" : "cursor-pointer"}
										transition-all duration-300 ease-in-out
									`}
									onClick={() => props.onClick(asset)}
									onDoubleClick={() => handleDoubleClick(asset)}
									onDragStart={() => handleDragStart(asset)}
									onDragEnd={handleDragEnd}
								>
									<div
										className={`
											flex justify-center items-center w-full aspect-square bg-muted rounded-t-lg
											transition-all duration-300 ease-in-out
										`}
									>
										<img
											alt=""
											src={asset.metadata.fab.listing.thumbnail}
											className="w-full aspect-square object-cover rounded-t-lg"
											style={{
												maskImage: props.processingAssetIds.has(asset.id)
													? `linear-gradient(to right, white 0%, white ${props.processingAssetIds.get(asset.id)}%, #00000010 ${props.processingAssetIds.get(asset.id)}%, #00000010 100%)`
													: undefined,
											}}
										/>
									</div>

									<div className="flex flex-col gap-1 p-2 bg-secondary rounded-b-lg select-none">
										<div className="flex justify-between items-center gap-2">
											<div className="text-lg text-start flex-1 font-semibold text-ellipsis overflow-hidden whitespace-nowrap">
												{asset.metadata.fab.listing.title}
											</div>

											{props.processingAssetIds.has(asset.id) && <SpinnerUIComponent width="24px" height="24px" />}
										</div>
										<div className="text-muted-foreground text-xs text-start">
											Published {new Date(asset.metadata.fab.listing.publishedAt).toLocaleString("en-US", { day: "2-digit", month: "long", year: "numeric" })}
										</div>
										<div className="text-muted-foreground text-xs text-start">
											Updated {new Date(asset.metadata.fab.listing.lastUpdatedAt).toLocaleString("en-US", { day: "2-digit", month: "long", year: "numeric" })}
										</div>
									</div>
								</div>
							</TooltipTrigger>
							<TooltipContent align="center" className="flex flex-col gap-2 max-w-[50vw]">
								<div dangerouslySetInnerHTML={{ __html: asset.metadata.fab.listing.title }} className="fab-title font-semibold text-lg" />
								<div dangerouslySetInnerHTML={{ __html: asset.metadata.fab.listing.description }} className="fab-description" />
							</TooltipContent>
						</Tooltip>
					))}
				</div>
			</div>
		</TooltipProvider>
	);
}
