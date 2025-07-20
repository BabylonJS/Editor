import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

export class LoadScenePrepareComponent extends Component {
	public render(): ReactNode {
		return (
			<div className="flex gap-5 items-center w-full">
				<Grid width={24} height={24} color="gray" />

				<div className="text-sm font-[500]">Installing dependencies...</div>
			</div>
		);
	}
}
