import { Camera } from "babylonjs";
import { EditorInspectorSectionField } from "../../fields/section";
import { EditorInspectorListField } from "../../fields/list";
import { EditorInspectorNumberField } from "../../fields/number";

export interface ICameraModeInspectorProps {
	camera: Camera;
	onUpdate: () => void;
}

export function CameraModeInspector(props: ICameraModeInspectorProps) {
	return (
		<EditorInspectorSectionField title="Mode">
			<EditorInspectorListField
				object={props.camera}
				property="mode"
				label="Mode"
				items={[
					{ text: "Perspective", value: Camera.PERSPECTIVE_CAMERA },
					{ text: "Orthographic", value: Camera.ORTHOGRAPHIC_CAMERA },
				]}
				onChange={(mode) => {
					if (mode === Camera.ORTHOGRAPHIC_CAMERA) {
						const width = props.camera.getEngine().getRenderWidth();
						const height = props.camera.getEngine().getRenderHeight();

						if (props.camera.orthoLeft === null) {
							props.camera.orthoLeft = width / -2;
						}
						if (props.camera.orthoRight === null) {
							props.camera.orthoRight = width / 2;
						}
						if (props.camera.orthoTop === null) {
							props.camera.orthoTop = height / 2;
						}
						if (props.camera.orthoBottom === null) {
							props.camera.orthoBottom = height / -2;
						}
					}

					props.onUpdate();
				}}
			/>

			{props.camera.mode === Camera.ORTHOGRAPHIC_CAMERA && (
				<>
					<EditorInspectorNumberField object={props.camera} property="orthoLeft" label="Ortho Left" step={0.1} />
					<EditorInspectorNumberField object={props.camera} property="orthoRight" label="Ortho Right" step={0.1} />
					<EditorInspectorNumberField object={props.camera} property="orthoTop" label="Ortho Top" step={0.1} />
					<EditorInspectorNumberField object={props.camera} property="orthoBottom" label="Ortho Bottom" step={0.1} />
				</>
			)}
		</EditorInspectorSectionField>
	);
}
