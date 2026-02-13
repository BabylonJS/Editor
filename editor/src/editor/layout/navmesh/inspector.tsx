import { Editor } from "../../main";
import { EditorInspectorNumberField } from "../inspector/fields/number";
import { EditorInspectorSectionField } from "../inspector/fields/section";

import { NavMeshEditor } from "./editor";

export interface INavMeshEditorInspectorProps {
	editor: Editor;
	navMeshEditor: NavMeshEditor;
}

export function NavMeshEditorInspector(props: INavMeshEditorInspectorProps) {
	const parameters = props.navMeshEditor.configuration.navMeshParameters;

	return (
		<div className="flex flex-col gap-2 w-80 h-full p-2">
			<div className="flex justify-center items-center">Inspector</div>

			<EditorInspectorSectionField title="Parameters">
				<EditorInspectorNumberField object={parameters} property="cs" label="Cell Size" min={10} step={0.1} onFinishChange={() => props.navMeshEditor.updateNavMesh()} />
				<EditorInspectorNumberField object={parameters} property="ch" label="Cell Height" min={0.1} step={0.1} onFinishChange={() => props.navMeshEditor.updateNavMesh()} />

				<EditorInspectorNumberField
					object={parameters}
					property="walkableHeight"
					label="Walkable Height"
					min={0.1}
					step={0.1}
					onFinishChange={() => props.navMeshEditor.updateNavMesh()}
				/>
				<EditorInspectorNumberField
					object={parameters}
					property="walkableRadius"
					label="Walkable Radius"
					min={0.1}
					step={0.1}
					onFinishChange={() => props.navMeshEditor.updateNavMesh()}
				/>
				<EditorInspectorNumberField
					object={parameters}
					property="walkableSlopeAngle"
					label="Walkable Slope Angle"
					min={0.1}
					max={90}
					step={0.1}
					onFinishChange={() => props.navMeshEditor.updateNavMesh()}
				/>
				<EditorInspectorNumberField
					object={parameters}
					property="walkableClimb"
					label="Walkable Climb"
					min={0.1}
					step={0.1}
					onFinishChange={() => props.navMeshEditor.updateNavMesh()}
				/>
			</EditorInspectorSectionField>
		</div>
	);
}
