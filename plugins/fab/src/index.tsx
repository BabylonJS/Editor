import { ensureDir } from "fs-extra";
import { dirname, join } from "path/posix";

import { Editor } from "babylonjs-editor";

import { FabRoot } from "./ui/root";

export const title = "Fab Plugin";
export const description = "Fab Plugin integration for Babylon.js Editor";

const tabId = "babylonjs-editor-fab-plugin-tab";

const styles = document.createElement("link");
styles.rel = "stylesheet";
styles.href = `file://${__dirname}/index.css`;

export function main(editor: Editor): void {
	if (!editor.state.projectPath) {
		return;
	}

	document.head.appendChild(styles);

	const assetsFolder = join(dirname(editor.state.projectPath), "assets/fab");
	ensureDir(assetsFolder);

	editor.layout.addLayoutTab(<FabRoot editor={editor} />, {
		id: tabId,
		title: "Fab",
		enableClose: false,
	});
}

export function close(editor: Editor): void {
	document.head.removeChild(styles);
	editor.layout.removeLayoutTab(tabId);
}
