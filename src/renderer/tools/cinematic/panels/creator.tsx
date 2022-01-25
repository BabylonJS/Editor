import { Nullable } from "../../../../shared/types";

import * as React from "react";
import SplitPane from "react-split-pane";
import { Tree, TreeNodeInfo, Button, ContextMenu, Menu, MenuItem, FormGroup, InputGroup, NumericInput, NonIdealState, Switch } from "@blueprintjs/core";

import { Icon } from "../../../editor/gui/icon";

import { Project } from "../../../editor/project/project";

import { Cinematic } from "../../../editor/cinematic/cinematic";
import { undoRedo } from "../../../editor/tools/undo-redo";

export interface ICinematicCreatorProps {
	/**
	 * Defines the callback called on the user selected a cinematic to edit.
	 */
	onCinematicSelected: (cinematic: Cinematic) => void;
}

export interface ICinematicCreatorState {
	/**
	 * Defines the list of all nodes being drawn in the 
	 */
	nodes: TreeNodeInfo<Cinematic>[];
	/**
	 * Defines the reference to the selected node.
	 */
	selectedNode: Nullable<TreeNodeInfo<Cinematic>>;
}

export class CinematicCreator extends React.Component<ICinematicCreatorProps, ICinematicCreatorState> {
	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: ICinematicCreatorProps) {
		super(props);

		this.state = {
			selectedNode: null,
			nodes: this._getCinematicNodes(),
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<SplitPane
				size="75%"
				minSize={200}
				split="vertical"
				primary="second"
				style={{ height: "calc(100% - 30px)" }}
			>
				<div style={{ width: "100%", height: "100%" }}>

					<Tree
						contents={this.state.nodes}
						onNodeClick={(n) => this._handleCinematicNodeSelected(n)}
						onNodeDoubleClick={(n) => this._handleCinematicNodeDoubleClicked(n)}
						onNodeContextMenu={(n, _, e) => this._handleCinematicNodeContextMenu(n, e)}
					/>
				</div>
				{this._getCinematicProperties()}
			</SplitPane>
		);
	}

	private _getCinematicProperties(): React.ReactNode {
		const cinematic = this.state.selectedNode?.nodeData;
		if (!cinematic) {
			return (
				<NonIdealState
					icon="search"
					title="No Cinematic Selected"
				/>
			)
		}

		return (
			<div style={{ width: "75%", height: "75%", margin: "auto", paddingTop: "20px" }}>
				<FormGroup
					label="Cinematic Name"
					labelInfo="(required)"
				>
					<InputGroup id="cinematic-name" placeholder="Cinematic name" fill value={cinematic.name} onChange={(e) => {
						cinematic.name = e.currentTarget.value;
						this.setState({ nodes: this._getCinematicNodes() });
					}} />
				</FormGroup>

				<FormGroup
					label="Frames Per Second"
					labelInfo="(required)"
					style={{ width: "100%" }}
				>
					<NumericInput id="cinematic-fps" fill min={1} value={cinematic.framesPerSecond} onValueChange={(v) => {
						cinematic.framesPerSecond = v;
						this.forceUpdate();
					}} />
				</FormGroup>

				<FormGroup
					label="Embed In Scene File"
					labelInfo="(required)"
				>
					<Switch label="Embed In Scene File" style={{ width: "100%" }} checked={cinematic.embedInSceneFile} onChange={(v) => {
						cinematic.embedInSceneFile = v.currentTarget.checked;
						this.forceUpdate();
					}} />
				</FormGroup>
			</div>
		);
	}

	/**
	 * Returns the list of all available cinematics.
	 */
	private _getCinematicNodes(): TreeNodeInfo<Cinematic>[] {
		const nodes = Project.Cinematics.map((c, index) => ({
			id: `cinematic${index}`,
			nodeData: c,
			label: c.name,
		})) as TreeNodeInfo<Cinematic>[];

		nodes.push({
			id: "add-cinematic",
			label: <Button small fill icon={<Icon src="plus.svg" />} onClick={() => this._handleAddCinematic()} />,
		});

		return nodes;
	}

	/**
	 * Called on the user clicks on a cinematic node.
	 */
	private _handleCinematicNodeSelected(node: TreeNodeInfo<Cinematic>): void {
		this.state.nodes.forEach((n) => n.isSelected = false);
		node.isSelected = true;

		this.setState({ nodes: this.state.nodes, selectedNode: node });
	}

	/**
	 * Called on the user double-clicked on a cinematic node.
	 */
	private _handleCinematicNodeDoubleClicked(node: TreeNodeInfo<Cinematic>): void {
		this._handleCinematicNodeSelected(node);
		this.props.onCinematicSelected(node.nodeData!);
	}

	/**
	 * Called on the user right-clicks on a cinematic node.
	 */
	private _handleCinematicNodeContextMenu(node: TreeNodeInfo<Cinematic>, ev: React.MouseEvent<HTMLElement, MouseEvent>): void {
		if (!node.nodeData) {
			return;
		}

		this._handleCinematicNodeSelected(node);

		ContextMenu.show((
			<Menu>
				<MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._handleRemoveCinematic(node.nodeData!)} />
			</Menu>
		), {
			top: ev.clientY,
			left: ev.clientX,
		});
	}

	/**
	 * Called on the user wants to add a new cinematic.
	 */
	private _handleAddCinematic(): void {
		Project.Cinematics.push(new Cinematic());

		requestAnimationFrame(() => {
			this.setState({ nodes: this._getCinematicNodes(), selectedNode: null });
		});
	}

	/**
	 * Called on the user wants to remove the given cinematic.
	 */
	private _handleRemoveCinematic(cinematic: Cinematic): void {
		undoRedo.push({
			description: `Removed cinematic "${cinematic.name}"`,
			common: () => this.setState({ nodes: this._getCinematicNodes() }),
			undo: () => Project.Cinematics.push(cinematic),
			redo: () => {
				const index = Project.Cinematics.indexOf(cinematic);
				if (index !== -1) {
					Project.Cinematics.splice(index, 1);
				}
			}
		})
	}
}
