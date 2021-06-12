import { Nullable } from "../../../../../shared/types";

import * as React from "react";

import { Editor } from "../../../editor";

import { IWorkerConfiguration, Workers } from "../../../workers/workers";

export interface IItemHandlerProps {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
	/**
	 * Defines the absolute path to the item.
	 */
	absolutePath: string;
}

export interface IItemHandlerState {
	/**
	 * Defines the reference to the preview image to be drawn in the item.
	 */
	previewImage: Nullable<React.ReactNode>;
}

export interface IItemHandler {
	/**
	 * Defines the extension supported by the handler.
	 */
	extension: string;
	/**
	 * Defines the function called each time an asset that matches the extension
	 * is being added to the items list of the assets component.
	 */
	ctor: (new (props: IItemHandlerProps) => AssetsBrowserItemHandler);
}

export abstract class AssetsBrowserItemHandler extends React.Component<IItemHandlerProps, IItemHandlerState> {
	/**
	 * Defines the reference to the assets worker.
	 */
	public static AssetWorker: IWorkerConfiguration;

	/**
	 * Initialzes the item handler.
	 */
	public static async Init(): Promise<void> {
		const canvas = document.createElement("canvas");
		canvas.width = 100;
		canvas.height = 100;

		const offscreen = canvas.transferControlToOffscreen();

		this.AssetWorker = await Workers.LoadWorker("assets.js", offscreen);
	}

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IItemHandlerProps) {
		super(props);

		this.state = {
			previewImage: null,
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<div
				onDoubleClick={(ev) => this.onDoubleClick(ev)}
				onContextMenu={(ev) => this.onContextMenu(ev)}
				style={{
					width: "100%",
					height: "100%",
				}}
			>
				{this.state.previewImage}
			</div>
		);
	}

	/**
	 * Called on the component did mount.
	 */
	public async componentDidMount(): Promise<void> {
		const previewImage = await this.computePreview();
		if (previewImage) {
			this.setState({ previewImage });
		}
	}

	/**
	 * Computes the image to render as a preview.
	 */
	public abstract computePreview(): React.ReactNode | Promise<React.ReactNode>;

	/**
	 * Called on the user double clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onDoubleClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		// Empty by default...
	}

	/**
	 * Called on the user right clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onContextMenu(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		// Empty by default...
	}
}
