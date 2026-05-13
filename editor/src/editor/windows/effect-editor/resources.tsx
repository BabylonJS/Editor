import { Component, ReactNode } from "react";
import { Tree, TreeNodeInfo } from "@blueprintjs/core";

import { IoImageOutline, IoCubeOutline } from "react-icons/io5";

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../../../ui/shadcn/ui/context-menu";

export interface IEffectEditorResourcesProps {
	resources: any[];
}

export interface IEffectEditorResourcesState {
	nodes: TreeNodeInfo[];
}

export class EffectEditorResources extends Component<IEffectEditorResourcesProps, IEffectEditorResourcesState> {
	public constructor(props: IEffectEditorResourcesProps) {
		super(props);

		this.state = {
			nodes: this._convertToTreeNodeInfo(props.resources),
		};
	}

	public componentDidUpdate(prevProps: IEffectEditorResourcesProps): void {
		if (prevProps.resources !== this.props.resources) {
			this.setState({
				nodes: this._convertToTreeNodeInfo(this.props.resources),
			});
		}
	}

	private _convertToTreeNodeInfo(resources: any[]): TreeNodeInfo[] {
		return resources.map((resource) => {
			const icon = resource.type === "texture" ? <IoImageOutline className="w-4 h-4" /> : <IoCubeOutline className="w-4 h-4" />;

			const label = (
				<ContextMenu>
					<ContextMenuTrigger className="w-full h-full">
						<div className="ml-2 p-1 w-full">{resource.name}</div>
					</ContextMenuTrigger>
					<ContextMenuContent>
						<ContextMenuItem disabled>UUID: {resource.resourceData?.uuid || resource.id}</ContextMenuItem>
						{resource.resourceData?.path && <ContextMenuItem disabled>Path: {resource.resourceData.path}</ContextMenuItem>}
					</ContextMenuContent>
				</ContextMenu>
			);

			return {
				id: resource.id,
				label,
				icon,
				isExpanded: false,
				childNodes: undefined,
				isSelected: false,
				hasCaret: false,
			};
		});
	}

	public render(): ReactNode {
		if (this.state.nodes.length === 0) {
			return (
				<div className="flex items-center justify-center w-full h-full bg-tertiary">
					<p className="text-tertiary-foreground">No resources</p>
				</div>
			);
		}

		return (
			<div className="flex flex-col w-full h-full text-foreground">
				<div className="overflow-auto">
					<Tree contents={this.state.nodes} />
				</div>
			</div>
		);
	}
}
