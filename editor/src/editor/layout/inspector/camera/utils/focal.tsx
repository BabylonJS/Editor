import { useEffect, useState } from "react";

import { Camera } from "babylonjs";

import { registerUndoRedo } from "../../../../../tools/undoredo";

import { EditorInspectorNumberField } from "../../fields/number";

export interface IFocalLengthInspectorProps {
	camera: Camera;
}

export function FocalLengthInspector(props: IFocalLengthInspectorProps) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		props.camera.metadata ??= {};
		props.camera.metadata.sensorSize ??= 36;
		props.camera.metadata.focalLength = convertFovToFocalLength(props.camera.fov, props.camera.metadata.sensorSize);

		setReady(true);
	}, [props.camera]);

	function convertFovToFocalLength(fov: number, sensorSize: number): number {
		return (sensorSize / 2) / Math.tan(fov / 2);
	}

	return ready && (
		<>
			<EditorInspectorNumberField
				noUndoRedo
				object={props.camera.metadata}
				property="focalLength"
				label={
					<div className="flex gap-1 items-center">
						Focal Length <div className="text-muted-foreground">(mm)</div>
					</div>
				}
				min={1}
				max={3600}
				step={1}
				onChange={(value) => {
					props.camera.metadata.focalLength = value;
					props.camera.setFocalLength(value, props.camera.metadata.sensorSize);
				}}
				onFinishChange={(value, oldValue) => {
					if (value !== oldValue) {
						registerUndoRedo({
							undo: () => {
								props.camera.metadata.focalLength = oldValue;
								props.camera.setFocalLength(oldValue, props.camera.metadata.sensorSize);
							},
							redo: () => {
								props.camera.metadata.focalLength = value;
								props.camera.setFocalLength(value, props.camera.metadata.sensorSize);
							},
						});
					}
				}}
			/>

			<EditorInspectorNumberField
				noUndoRedo
				object={props.camera.metadata}
				property="sensorSize"
				label={
					<div className="flex gap-1 items-center">
						Sensor Size <div className="text-muted-foreground">(mm)</div>
					</div>
				}
				min={1}
				max={36}
				step={0.01}
				onChange={(value) => {
					props.camera.metadata.sensorSize = value;
					props.camera.setFocalLength(props.camera.metadata.focalLength, value);
				}}
				onFinishChange={(value, oldValue) => {
					if (value !== oldValue) {
						registerUndoRedo({
							undo: () => {
								props.camera.metadata.sensorSize = oldValue;
								props.camera.setFocalLength(props.camera.metadata.focalLength, oldValue);
							},
							redo: () => {
								props.camera.metadata.sensorSize = value;
								props.camera.setFocalLength(props.camera.metadata.focalLength, value);
							},
						});
					}
				}}
			/>
		</>
	);
}
