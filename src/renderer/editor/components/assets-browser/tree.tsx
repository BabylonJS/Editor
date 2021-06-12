import * as React from "react";
import { Classes, InputGroup, Tree } from "@blueprintjs/core";

export interface IAssetsBrowserTreeProps {

}

export interface IAssetsBrowserTreeState {

}

export class AssetsBrowserTree extends React.Component<IAssetsBrowserTreeProps, IAssetsBrowserTreeState> {
	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IAssetsBrowserTreeProps) {
		super(props);

		this.state = {

		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
				<div style={{ width: "100%", height: "35px", marginTop: "5px" }}>
					<InputGroup className={Classes.FILL} leftIcon={"search"} type="search" placeholder="Filter..." onChange={(e) => {
						this._handleFilterChanged(e.target.value);
					}} />
				</div>

				<div style={{ width: "100%", height: "calc(100% - 45px)", overflow: "auto" }}>
					<Tree
						contents={[{
							id: "assets",
							label: "assets",
							isExpanded: true,
							icon: "folder-open",
							childNodes: [{
								id: "assets/scene",
								label: "scene",
								isSelected: true,
								icon: "folder-close",
							}],
						}]}
					/>
				</div>
			</div>
		);
	}

	/**
	 * Called on the user changes the filter.
	 */
	private _handleFilterChanged(filter: string): void {
		console.log(filter);
	}
}
