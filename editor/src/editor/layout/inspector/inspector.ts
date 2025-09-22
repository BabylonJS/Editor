import { Editor } from "../../main";

export interface IEditorInspectorImplementationProps<T = unknown> {
	object: T;
	editor: Editor;
}
