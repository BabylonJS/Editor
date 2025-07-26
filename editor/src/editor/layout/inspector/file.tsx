import { extname } from "path/posix";

import { Component, ReactNode } from "react";

import { EditorInspectorSoundComponent } from "./file/sound";
import { EditorInspectorImageComponent } from "./file/image";
import { EditorInspectorMarkdownComponent } from "./file/markdown";

import { IEditorInspectorImplementationProps } from "./inspector";

export class FileInspectorObject {
	public readonly isFileInspectorObject = true;

	public constructor(
		public readonly absolutePath: string,
	) { }
}

export class EditorFileInspector extends Component<IEditorInspectorImplementationProps<FileInspectorObject>> {
	private _extension: string;

	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: any): object is FileInspectorObject {
		return object?.isFileInspectorObject;
	}

	public constructor(props: IEditorInspectorImplementationProps<FileInspectorObject>) {
		super(props);

		this._extension = extname(props.object.absolutePath).toLowerCase();
	}

	public render(): ReactNode {
		switch (this._extension) {
			case ".png":
			case ".webp":
			case ".jpg":
			case ".bmp":
			case ".jpeg":
				return <EditorInspectorImageComponent object={this.props.object} />;

			case ".md":
				return <EditorInspectorMarkdownComponent object={this.props.object} />;

			case ".mp3":
			case ".wav":
			case ".wave":
				return <EditorInspectorSoundComponent object={this.props.object} />;

			default: return null;
		}
	}
}
