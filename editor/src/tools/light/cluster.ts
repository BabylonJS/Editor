import { Light } from "babylonjs";

import { Editor } from "../../editor/main";

export function isClusteredLight(light: Light, editor: Editor) {
	return editor.layout.preview.clusteredLightContainer.lights.includes(light);
}
