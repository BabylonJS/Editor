import { Nullable } from "../../../../../shared/types";

import * as React from "react";
import Result from "antd/lib/result/index";
import { Button, ProgressBar } from "@blueprintjs/core";

import { Observer } from "babylonjs";

import { WebpackProgressExtension } from "../../../extensions/webpack-progress";

import { Packer } from "../packer";

export interface IPackerBuilderStepProps {
	/**
	 * Defines the reference to the packer.
	 */
	packer: Packer;
	/**
	 * Defines the callback called on the build process has finished.
	 */
	onDone: () => void;
}

export interface IPackerBuilderStepState {
	/**
	 * Defines the current progress of the build process.
	 */
	progress: number;
	/**
	 * Defines wether or not the project is being built.
	 */
	building: boolean;
}

export class PackerBuilderStep extends React.Component<IPackerBuilderStepProps, IPackerBuilderStepState> {
	private _progressObserver: Nullable<Observer<number>> = null;

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IPackerBuilderStepProps) {
		super(props);

		this.state = {
			progress: 0,
			building: false,
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<Result
				title={this.state.building ? "Building..." : "Ready"}
				status={this.state.building ? "info" : "info"}
				subTitle={
					<span style={{ marginBottom: "0px", whiteSpace: "nowrap" }}>
						<ProgressBar animate value={this.state.progress} />
						<span style={{ color: "grey" }}>{this.state.building ? "Building project dist files..." : "Ready to build."}</span>
					</span>
				}
				extra={[
					<Button text="Build" style={{ width: "150px" }} disabled={this.state.building} intent="success" onClick={() => this._handleBuild()} />,
					<Button text="Skip" style={{ width: "150px" }} disabled={this.state.building} intent="primary" onClick={() => this.props.onDone()} />,
				]}
			/>
		);
	}

	/**
	 * Called on the component did mount.
	 */
	public componentDidMount(): void {
		this._progressObserver = WebpackProgressExtension.OnProgressChanged.add((v) => {
			this.setState({ progress: v / 100 });
		});
	}

	/**
	 * Called on the component will unmount.
	 */
	public componentWillUnmount(): void {
		WebpackProgressExtension.OnProgressChanged.remove(this._progressObserver);
	}

	/**
	 * Called on the user wants to trigger the build process.
	 */
	private async _handleBuild(): Promise<void> {
		this.setState({ building: true });
		await this.props.packer.build();
		this.props.onDone();
	}
}
