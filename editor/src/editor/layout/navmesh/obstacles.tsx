import { useState } from "react";

import { Editor } from "../../main";

import { NavMeshEditorListComponent } from "./components/list";
import { NavMeshEditorSearchComponent } from "./components/search";

import { NavMeshEditor } from "./editor";
import { INavMeshObstacleConfiguration } from "./types";

export interface INavMeshEditorObstaclesProps {
	editor: Editor;
	navMeshEditor: NavMeshEditor;
}

export function NavMeshEditorObstacles(props: INavMeshEditorObstaclesProps) {
	const [search, setSearch] = useState("");

	return (
		<div className="flex flex-col gap-2 w-80 h-full p-2">
			<div className="flex justify-between items-center h-10">
				<div>Obstacle meshes</div>
				<NavMeshEditorSearchComponent search={search} setSearch={setSearch} />
			</div>

			<NavMeshEditorListComponent<INavMeshObstacleConfiguration>
				search={search}
				scene={props.editor.layout.preview.scene}
				items={props.navMeshEditor.configuration.obstacleMeshes}
				onCreateItem={(mesh) => ({
					id: mesh.id,
					enabled: true,
					type: "box",
				})}
				onItemsChange={(items) => {
					props.navMeshEditor.configuration.obstacleMeshes = items;
					props.navMeshEditor.createDebugObstacles();
				}}
			/>
		</div>
	);
}
