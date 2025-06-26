import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";
import { TbPackageExport } from "react-icons/tb";

import { Progress } from "../../ui/shadcn/ui/progress";

export interface IEditorExportProjectProgressComponentState {
    progress: number;
}

export class EditorExportProjectProgressComponent extends Component<{}, IEditorExportProjectProgressComponentState> {
	private _step: number = 0;

	public constructor(props: {}) {
		super(props);

		this.state = {
			progress: 0,
		};
	}

	public render(): ReactNode {
		return (
			<div className="flex gap-5 items-center w-full">
				<Grid width={24} height={24} color="gray" />

				<div className="flex flex-col gap-2 w-full">
					<div className="flex gap-5 items-center justify-between text-lg font-[400]">
                        Exporting...
						<TbPackageExport className="w-8 h-8" />
					</div>
					<Progress value={this.state.progress} />
				</div>
			</div>
		);
	}

	public step(step: number): void {
		this._step += step;
		this.setState({ progress: this._step });
	}
}
