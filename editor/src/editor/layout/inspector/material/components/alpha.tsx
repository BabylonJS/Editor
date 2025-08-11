import { ReactNode } from "react";
import { Constants } from "babylonjs";
import { EditorInspectorListField } from "../../fields/list";

export interface IEditorAlphaModeFieldProps {
	object: any;
	onChange?: () => void;
}

export function EditorAlphaModeField(props: IEditorAlphaModeFieldProps): ReactNode {
	return (
		<EditorInspectorListField
			label="Alpha Mode"
			object={props.object}
			property="alphaMode"
			onChange={props.onChange}
			items={[
				{ text: "Disable", value: Constants.ALPHA_DISABLE },
				{ text: "Add", value: Constants.ALPHA_ADD },
				{ text: "Combine", value: Constants.ALPHA_COMBINE },
				{ text: "Subtract", value: Constants.ALPHA_SUBTRACT },
				{ text: "Multiply", value: Constants.ALPHA_MULTIPLY },
				{ text: "Maximized", value: Constants.ALPHA_MAXIMIZED },
				{ text: "One-one", value: Constants.ALPHA_ONEONE },
				{ text: "Premultiplied", value: Constants.ALPHA_PREMULTIPLIED },
				{ text: "Premultiplied Porterduff", value: Constants.ALPHA_PREMULTIPLIED_PORTERDUFF },
				{ text: "Interpolate", value: Constants.ALPHA_INTERPOLATE },
				{ text: "Screen Mode", value: Constants.ALPHA_SCREENMODE },
			]}
		/>
	);
}
