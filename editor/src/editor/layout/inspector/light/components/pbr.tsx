import { Light } from "babylonjs";

import { EditorInspectorListField } from "../../fields/list";
import { EditorInspectorNumberField } from "../../fields/number";

export interface IEditorLightPBRInspectorProps {
	object: Light;
}

export function EditorLightPBRInspector(props: IEditorLightPBRInspectorProps) {
	return (
		<>
			<EditorInspectorListField
				object={props.object}
				property="intensityMode"
				label="Intensity Mode"
				items={[
					{ text: "Automatic", value: Light.INTENSITYMODE_AUTOMATIC },
					{ text: "Luminous Power", value: Light.INTENSITYMODE_LUMINOUSPOWER, label: "Lumen (lm)" },
					{ text: "Luminous Intensity", value: Light.INTENSITYMODE_LUMINOUSINTENSITY, label: "Candela (lm/sr)" },
					{ text: "Illuminance", value: Light.INTENSITYMODE_ILLUMINANCE, label: "Lux (lm/m^2)" },
					{ text: "Luminance", value: Light.INTENSITYMODE_LUMINANCE, label: "Nit (cd/m^2)" },
				]}
			/>

			<EditorInspectorNumberField label="Radius" object={props.object} property="radius" />
		</>
	);
}
