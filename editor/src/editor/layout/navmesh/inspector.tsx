import { Grid } from "react-loader-spinner";

import { Button } from "../../../ui/shadcn/ui/button";

import { Editor } from "../../main";

import { EditorInspectorSwitchField } from "../inspector/fields/switch";
import { EditorInspectorNumberField } from "../inspector/fields/number";
import { EditorInspectorSectionField } from "../inspector/fields/section";
import { EditorInspectorSceneEntityField } from "../inspector/fields/entity";

import { NavMeshEditor } from "./editor";
import { INavMeshGenerationProgress } from "./generate/islands";

export interface INavMeshEditorInspectorProps {
	editor: Editor;
	navMeshEditor: NavMeshEditor;
	generationProgress: INavMeshGenerationProgress | null;
}

export function NavMeshEditorInspector(props: INavMeshEditorInspectorProps) {
	const parameters = props.navMeshEditor.configuration.navMeshParameters;
	const isolatedAreas = props.navMeshEditor.configuration.isolatedAreas!;

	return (
		<div className="flex flex-col gap-2 w-full p-2">
			{/* <div className="flex justify-center items-center">Inspector</div> */}

			<EditorInspectorSectionField title="Parameters">
				<EditorInspectorNumberField object={parameters} property="cs" label="Cell Size" min={10} step={0.1} />
				<EditorInspectorNumberField object={parameters} property="ch" label="Cell Height" min={0.1} step={0.1} />

				<EditorInspectorNumberField object={parameters} property="walkableHeight" label="Walkable Height" min={0.1} step={0.1} />
				<EditorInspectorNumberField object={parameters} property="walkableRadius" label="Walkable Radius" min={0.1} step={0.1} />
				<EditorInspectorNumberField object={parameters} property="walkableSlopeAngle" label="Walkable Slope Angle" min={0.1} max={90} step={0.1} />
				<EditorInspectorNumberField object={parameters} property="walkableClimb" label="Walkable Climb" min={0.1} step={0.1} />

				<EditorInspectorSwitchField object={props.navMeshEditor.configuration} property="useLowestLods" label="Use Lowest LODs" />

				<EditorInspectorSwitchField object={isolatedAreas} property="remove" label="Remove Isolated Areas" />
				<EditorInspectorNumberField
					object={isolatedAreas}
					property="minimumArea"
					label="Minimum Area"
					min={0}
					step={1000}
					tooltip="Isolated areas with a smaller surface are removed, the largest one is always kept. In squared scene units: 200000 is 20 m² in centimeters."
				/>

				<EditorInspectorSceneEntityField
					noUndoRedo
					type="node"
					object={isolatedAreas}
					property="referenceNodeId"
					scene={props.editor.layout.preview.scene}
					label="Reference Node"
					tooltip="When set, only the walkable area found under this node is kept, whatever the minimum area."
					onChange={(node) => (isolatedAreas.referenceNodeId = node?.id)}
				/>

				<Button
					className="relative flex items-center gap-2 overflow-hidden"
					disabled={props.generationProgress !== null}
					onClick={() => props.navMeshEditor.updateNavMesh()}
				>
					{props.generationProgress && <Grid width={16} height={16} color="gray" />}
					{props.generationProgress ? `${props.generationProgress.label}... ${Math.round(props.generationProgress.progress * 100)}%` : "Rebuild NavMesh"}
					{props.generationProgress && (
						<div
							className="absolute bottom-0 left-0 h-1 bg-primary-foreground/60 transition-[width]"
							style={{ width: `${props.generationProgress.progress * 100}%` }}
						/>
					)}
				</Button>
			</EditorInspectorSectionField>
		</div>
	);
}
