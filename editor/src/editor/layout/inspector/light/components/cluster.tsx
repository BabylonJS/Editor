import { Light, ClusteredLightContainer } from "babylonjs";

import { Editor } from "../../../../main";

import { registerUndoRedo } from "../../../../../tools/undoredo";
import { isClusteredLight } from "../../../../../tools/light/cluster";

import { EditorInspectorSwitchField } from "../../fields/switch";

export interface IEditorLightClusterInspectorProps {
	light: Light;
	editor: Editor;
}

export function EditorLightClusterInspector(props: IEditorLightClusterInspectorProps) {
	const o = {
		isClusteredLight: isClusteredLight(props.light, props.editor),
	};

	const isSupported = ClusteredLightContainer.IsLightSupported(props.light);

	return (
		<>
			<EditorInspectorSwitchField
				noUndoRedo
				object={o}
				property="isClusteredLight"
				label="Is Clustered Lighting Enabled"
				disabled={!isSupported}
				tooltip={!isSupported ? "Clustered lighting is not supported for this light. Please remove shadows and textures applied by this light" : undefined}
				onChange={(v) => {
					const oldValue = !v;

					registerUndoRedo({
						executeRedo: true,
						undo: () => {
							if (oldValue) {
								props.editor.layout.preview.clusteredLightContainer.addLight(props.light);
							} else {
								props.editor.layout.preview.clusteredLightContainer.removeLight(props.light);
							}
						},
						redo: () => {
							if (v) {
								props.editor.layout.preview.clusteredLightContainer.addLight(props.light);
							} else {
								props.editor.layout.preview.clusteredLightContainer.removeLight(props.light);
							}
						},
					});

					props.editor.layout.graph.refresh().then(() => {
						if (props.editor.layout.graph.isNodeSelected(props.light)) {
							props.editor.layout.graph.setSelectedNode(props.light);
						}
					});

					props.editor.layout.inspector.forceUpdate();
				}}
			/>
		</>
	);
}
