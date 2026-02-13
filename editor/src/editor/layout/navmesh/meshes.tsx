import { useState } from "react";

import { AbstractMesh } from "babylonjs";

import { Editor } from "../../main";

import { NavMeshEditorListComponent } from "./components/list";
import { NavMeshEditorSearchComponent } from "./components/search";

import { NavMeshEditor } from "./editor";
import { INavMeshStaticMeshConfiguration } from "./types";

export interface INavMeshEditorMeshesListProps {
	editor: Editor;
	navMeshEditor: NavMeshEditor;
}

export function NavMeshEditorMeshesList(props: INavMeshEditorMeshesListProps) {
	const [search, setSearch] = useState("");

	return (
		<div className="flex flex-col gap-2 w-80 h-full p-2">
			<div className="flex justify-between items-center h-10">
				<div>Static meshes</div>

				<NavMeshEditorSearchComponent search={search} setSearch={setSearch} />
			</div>

			<NavMeshEditorListComponent<INavMeshStaticMeshConfiguration>
				search={search}
				scene={props.editor.layout.preview.scene}
				items={props.navMeshEditor.configuration.staticMeshes}
				onCreateItem={(mesh: AbstractMesh) => ({
					id: mesh.id,
					enabled: true,
				})}
				onItemsChange={(items, updateNavMesh) => {
					props.navMeshEditor.configuration.staticMeshes = items;

					if (updateNavMesh) {
						props.navMeshEditor.updateNavMesh();
					} else {
						props.navMeshEditor.forceUpdate();
					}
				}}
			/>
		</div>
	);
}
