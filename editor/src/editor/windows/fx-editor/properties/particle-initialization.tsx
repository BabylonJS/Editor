import { ReactNode } from "react";
import { Color4 } from "babylonjs";

import { IFXParticleData } from "./types";
import { FunctionEditor } from "./behaviors/function-editor";
import { ColorFunctionEditor } from "./behaviors/color-function-editor";

export interface IFXEditorParticleInitializationPropertiesProps {
	particleData: IFXParticleData;
	onChange?: () => void;
}

export function FXEditorParticleInitializationProperties(props: IFXEditorParticleInitializationPropertiesProps): ReactNode {
	const { particleData } = props;
	const onChange = props.onChange || (() => {});

	// Initialize function values if not set
	const init = particleData.particleInitialization;

	if (!init.startLife || !init.startLife.functionType) {
		init.startLife = {
			functionType: "IntervalValue",
			data: { min: 1.0, max: 2.0 },
		};
	}

	if (!init.startSize || !init.startSize.functionType) {
		init.startSize = {
			functionType: "IntervalValue",
			data: { min: 0.1, max: 0.2 },
		};
	}

	if (!init.startSpeed || !init.startSpeed.functionType) {
		init.startSpeed = {
			functionType: "IntervalValue",
			data: { min: 1.0, max: 2.0 },
		};
	}

	if (!init.startColor || !init.startColor.colorFunctionType) {
		init.startColor = {
			colorFunctionType: "ConstantColor",
			data: { color: new Color4(1, 1, 1, 1) },
		};
	}

	if (!init.startRotation || !init.startRotation.functionType) {
		init.startRotation = {
			functionType: "IntervalValue",
			data: { min: 0, max: 360 },
		};
	}

	return (
		<>
			<FunctionEditor
				value={init.startLife}
				onChange={onChange}
				availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
				label="Start Life"
			/>
			<FunctionEditor
				value={init.startSize}
				onChange={onChange}
				availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
				label="Start Size"
			/>
			<FunctionEditor
				value={init.startSpeed}
				onChange={onChange}
				availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
				label="Start Speed"
			/>
			<ColorFunctionEditor
				value={init.startColor}
				onChange={onChange}
				label="Start Color"
			/>
			<FunctionEditor
				value={init.startRotation}
				onChange={onChange}
				availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
				label="Start Rotation"
			/>
		</>
	);
}
