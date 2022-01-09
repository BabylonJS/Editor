import { readFile } from "fs-extra";

import * as React from "react";
import MarkdownToJSX from "markdown-to-jsx";

import { AbstractInspector, InspectorSection, IObjectInspectorProps } from "babylonjs-editor";

export class MarkdownEditableObject {
	/**
	 * Constructor.
	 * @param absolutePath defines the absolute path to the markdown file.
	 */
	public constructor(public absolutePath: string) {
		// Empty at the moment.
	}
}

export interface IMarkdownInspectorState {
	/**
	 * Defines the content of the markdown file.
	 */
	markdownContent?: string;
}

export class MarkdownInspector extends AbstractInspector<MarkdownEditableObject, IMarkdownInspectorState> {
	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IObjectInspectorProps) {
		super(props);

		this.state = { ...this.state };
	}

	/**
	 * Renders the content of the inspector.
	 */
	public renderContent(): React.ReactNode {
		return (
			<InspectorSection title="Markdown">
				<MarkdownToJSX>
					{this.state.markdownContent ?? "No Content."}
				</MarkdownToJSX>
			</InspectorSection>
		);
	}

	/**
	 * Called on the component did mount.
	 */
	public async componentDidMount(): Promise<void> {
		const markdownContent = await readFile(this.selectedObject.absolutePath, { encoding: "utf-8" });
		this.setState({ markdownContent });
	}
}
