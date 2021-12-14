import * as React from "react";
import Steps from "antd/lib/steps/index";
import { Divider, Spinner } from "@blueprintjs/core";
import Result, { ResultStatusType } from "antd/lib/result/index";

import { Packer, PackerStatus } from "../packer";
import { shell } from "electron";

export interface PackerPackStepProps {
	/**
	 * Defines the reference to the packer.
	 */
	packer: Packer;
}

export interface IPackerPackStepState {
	/**
	 * Defines the current status of the packer.
	 */
	status: PackerStatus;
	/**
	 * Defines the name of the current entry.
	 */
	currentEntry: string;

	/**
	 * Defines the path where the zip file will be written.
	 */
	destination: string;
}

export class PackerPackStep extends React.Component<PackerPackStepProps, IPackerPackStepState> {
	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: PackerPackStepProps) {
		super(props);

		this.state = {
			destination: "",
			currentEntry: "",
			status: PackerStatus.Packing,
		};
	}
	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<>
				<Divider />
				<Steps direction="vertical" size="default" current={this._getActiveStep()} style={{ marginTop: "25px" }}>
					<Steps.Step title="Packing" description="Pack all files to the zip archive." />
					<Steps.Step title="Writing Zip" description="Writes the zip file to the given destination." />
					<Steps.Step title="Done" description="Zip file is available." />
				</Steps>
				<Divider />
				<Result
					title={this._getResultTitle()}
					status={this._getResultStatus()}
					subTitle={this._getResultSubTitle()}
				/>
			</>
		);
	}

	/**
	 * Returns the currently active step.
	 */
	private _getActiveStep(): number {
		switch (this.state.status) {
			case PackerStatus.Packing: return 0;
			case PackerStatus.GeneratingBuffer: return 1;

			case PackerStatus.Done:
			case PackerStatus.Error:
				return 2;

			default: return 0;
		}
	}

	/**
	 * Returns the result status type according to the current packer status.
	 */
	private _getResultStatus(): ResultStatusType {
		switch (this.state.status) {
			case PackerStatus.Error: return "error";
			case PackerStatus.Done: return "success";

			default: return "info";
		}
	}

	/**
	 * Returns the result title according to the current packer status.
	 */
	private _getResultTitle(): string {
		switch (this.state.status) {
			case PackerStatus.Packing: return "Packing files";
			case PackerStatus.GeneratingBuffer: return "Generating File";
			case PackerStatus.Done: return "Success";
			case PackerStatus.Error: return "Error";

			default: return "";
		}
	}

	/**
	 * Returns the result sub title according to the current packer status.
	 */
	private _getResultSubTitle(): string | React.ReactNode {
		switch (this.state.status) {
			case PackerStatus.Packing: return `Packing ${this.state.currentEntry}...`;
			case PackerStatus.GeneratingBuffer:
				return (
					<span style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
						<Spinner size={16} />
						<a style={{ color: "grey" }}>Generating archive file...</a>
					</span>
				);

			case PackerStatus.Done:
				return <span>Package available at <a onClick={() => shell.showItemInFolder(this.state.destination)}>{this.state.destination}</a></span>;

			case PackerStatus.Error: return "An error happened.";
		}
	}
}
