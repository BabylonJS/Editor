import { Button, Editor, Separator } from "babylonjs-editor";
import { IoArrowBackCircleSharp } from "react-icons/io5";
import { FabMeshesBrowser } from "./meshes";
import { IFabJson } from "../../typings";

export interface IFabCollectionRootComponentProps {
	editor: Editor;
	filter: string;
	fabAssetsFolder: string;
	browsedAsset: IFabJson;

	onClose: () => void;
}

export function FabCollectionComponent(props: IFabCollectionRootComponentProps) {
	return (
		<>
			<div className="flex justify-between items-center px-5">
				<div className="flex flex-col gap-1 justify-start py-5">
					<div className="flex items-center gap-2">
						<Button variant="ghost" className="w-10 h-10 p-1" onClick={props.onClose}>
							<IoArrowBackCircleSharp className="w-8 h-8 dark:text-white" />
						</Button>

						<div className="text-3xl font-semibold text-center">{props.browsedAsset.metadata.fab.listing.title}</div>
					</div>
					<div className="flex flex-col justify-end">
						<div className="text-muted-foreground">Meshes: {props.browsedAsset.meshes.length}</div>
						<div className="text-muted-foreground">Materials: {props.browsedAsset.materials.length}</div>
					</div>
				</div>
				<div className="flex flex-col gap-1 justify-end">
					<div className="flex flex-col justify-end">
						<div className="text-end text-muted-foreground">
							Published{" "}
							{new Date(props.browsedAsset.metadata.fab.listing.publishedAt).toLocaleString("en-US", {
								day: "2-digit",
								month: "long",
								year: "numeric",
							})}
						</div>
						<div className="text-end text-muted-foreground">
							Updated{" "}
							{new Date(props.browsedAsset.metadata.fab.listing.lastUpdatedAt).toLocaleString("en-US", {
								day: "2-digit",
								month: "long",
								year: "numeric",
							})}
						</div>
					</div>
					<div className="flex flex-col justify-end">
						{props.browsedAsset.metadata.fab.listing.isAiGenerated && <div className="flex justify-end items-center gap-2 text-green-500">AI Generated</div>}
						<div className={`flex justify-end items-center gap-2 ${props.browsedAsset.metadata.fab.listing.isAiForbidden ? "text-red-500" : "text-muted-foreground"}`}>
							{props.browsedAsset.metadata.fab.listing.isAiForbidden && "AI Forbidden"}
							{!props.browsedAsset.metadata.fab.listing.isAiForbidden && "AI Authorized"}
						</div>
					</div>
				</div>
			</div>

			<div className="px-5 py-1">
				<Separator />
			</div>

			<FabMeshesBrowser editor={props.editor} json={props.browsedAsset} fabAssetsFolder={props.fabAssetsFolder} filter={props.filter} />
		</>
	);
}
