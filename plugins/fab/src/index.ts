import { Editor } from "babylonjs-editor";

export const title = "Fab Plugin";
export const description = "Fab Plugin integration for Babylon.js Editor";

export function main(editor: Editor): void {
	console.log(editor);
}

export function close(): void {}
