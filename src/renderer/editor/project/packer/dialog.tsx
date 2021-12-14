import { extname } from "path";
import { shell } from "electron";

import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { Button, ButtonGroup, Callout, Divider } from "@blueprintjs/core";

import { Alert } from "../../gui/alert";

import { Tools } from "../../tools/tools";

import { Editor } from "../../editor";

import { WorkSpace } from "../workspace";

import { Packer } from "./packer";
import { PackerTreeStep } from "./steps/tree";
import { PackerPackStep } from "./steps/packer";
import { PackerBuilderStep } from "./steps/builder";

export interface IPackerProps {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
}

export interface IPackerState {
	/**
	 * Defines the current step of the dialog.
	 */
	currentStep: PackerDialogStep;
	/**
	 * Defines the list of all selected files.
	 */
	selectedFiles: string[];
}

export enum PackerDialogStep {
	Building = 0,
	SelectingFiles,
	Packing,
}

export class PackerDialog extends React.Component<IPackerProps, IPackerState> {
	private static _alert: Nullable<Alert> = null;

	/**
	 * Shows the packer.
	 * @param editor defines the reference to the editor.
	 */
	public static async Show(editor: Editor): Promise<void> {
		if (!WorkSpace.DirPath) {
			return;
		}

		// Show alert
		Alert.Show("Project Packer", "", undefined, <PackerDialog editor={editor} />, {
			noFooter: true,
			isCloseButtonShown: false,
			canOutsideClickClose: false,
			style: {
				width: "800px",
				height: "700px",
			},
		}, (r) => this._alert = r);
	}

	private _packer: Packer;
	private _steps: Record<PackerDialogStep, React.ReactNode>;

	private _packerStep: Nullable<PackerPackStep> = null;

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IPackerProps) {
		super(props);

		this._packer = new Packer(props.editor);

		this._steps = {
			[PackerDialogStep.Building]: <PackerBuilderStep packer={this._packer} onDone={() => this.setState({ currentStep: PackerDialogStep.SelectingFiles })} />,

			[PackerDialogStep.SelectingFiles]: <PackerTreeStep packer={this._packer} onDone={(f) => {
				this.setState({ currentStep: PackerDialogStep.Packing, selectedFiles: f }, () => this.pack());
			}} />,

			[PackerDialogStep.Packing]: <PackerPackStep ref={(r) => this._packerStep = r} packer={this._packer} />,
		}

		this.state = {
			selectedFiles: [],
			currentStep: PackerDialogStep.Building,
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<>
				<Callout
					icon="info-sign"
					title={this._getCalloutTitle()}
					style={{ width: "100%", height: "590px", marginTop: "-35px" }}
				>
					{this._steps[this.state.currentStep]}
				</Callout>
				<Divider />
				<ButtonGroup>
					<Button text="Close" style={{ width: "150px" }} onClick={() => PackerDialog._alert?.close()} />
				</ButtonGroup>
			</>
		);
	}

	/**
	 * Packs the project.
	 */
	public async pack(): Promise<void> {
		if (!WorkSpace.DirPath) {
			return;
		}

		// Check destination
		let destination = await Tools.ShowSaveFileDialog("Archive Save Path", WorkSpace.DirPath!);
		if (!destination) {
			return;
		}

		if (extname(destination).toLowerCase() !== ".zip") {
			destination += ".zip";
		}

		// Pack
		this.props.editor.revealPanel("console");
		this._packerStep?.setState({ destination });

		this._packer.onAddEntry.add((e) => this._packerStep?.setState({ currentEntry: e }));
		this._packer.onStatusChange.add((s) => this._packerStep?.setState({ status: s }));
		await this._packer.packToFile(destination, { files: this.state.selectedFiles, skipBuild: true });

		// Success
		shell.beep();
	}

	/**
	 * Returns the title of the callout according to the current state.
	 */
	private _getCalloutTitle(): string {
		switch (this.state.currentStep) {
			case PackerDialogStep.Building: return "Build";
			case PackerDialogStep.Packing: return "Project Package";
			case PackerDialogStep.SelectingFiles: return "Files Selection";
		}
	}
}
