import { Component, ReactNode } from "react";
import { Constants } from "babylonjs";
import { EditorInspectorListField } from "../../fields/list";

export interface IEditorAlphaModeFieldProps {
	object: any;
	onChange?: () => void;
}

export class EditorAlphaModeField extends Component<IEditorAlphaModeFieldProps> {
	public constructor(props: IEditorAlphaModeFieldProps) {
		super(props);
	}

	public render(): ReactNode {
		return (
			<EditorInspectorListField
				label="Alpha Mode"
				object={this.props.object}
				property="alphaMode"
				onChange={this.props.onChange}
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
}
