import { join } from "path/posix";

import { Editor } from "babylonjs-editor";

import { IFabJson } from "../../typings";

import { FabMeshesBrowserItem } from "./item";

export interface IFabMeshesBrowser {
	editor: Editor;
	json: IFabJson;
	fabAssetsFolder: string;
}

export function FabMeshesBrowser(props: IFabMeshesBrowser) {
	const finalAssetsFolder = join(props.fabAssetsFolder, props.json.metadata.fab.listing.title);

	return (
		<div
			style={{
				gridTemplateRows: `repeat(auto-fill, ${240 * 1}px)`,
				gridTemplateColumns: `repeat(auto-fill, ${206 * 1}px)`,
			}}
			className="grid gap-4 justify-between w-full h-full px-5 mt-2 pt-2 overflow-y-auto pb-5"
		>
			{props.json.meshes.map((mesh) => (
				<FabMeshesBrowserItem key={mesh.file} editor={props.editor} fabJson={props.json} meshJson={mesh} finalAssetsFolder={finalAssetsFolder} />
			))}
		</div>
	);
}
