import { Nullable, Undefinable } from "../../../../shared/types";

import * as React from "react";
import { Button, ButtonGroup, ContextMenu, Divider, Menu, MenuDivider, MenuItem, Tree, TreeNodeInfo } from "@blueprintjs/core";

import { Animation } from "babylonjs";

import { InspectorList } from "../../../editor/gui/inspector/fields/list";

import { Icon } from "../../../editor/gui/icon";
import { Dialog } from "../../../editor/gui/dialog";

import { Editor } from "../../../editor/editor";

import { Tools } from "../../../editor/tools/tools";

import { Cinematic } from "../../../editor/cinematic/cinematic";

import { ICinematicTrack } from "../../../editor/cinematic/base";
import { CinematicTrackType } from "../../../editor/cinematic/track";

import { CinematicGroupTrack } from "../inspectors/group-inspector";
import { CinematicPropertyTrack } from "../inspectors/property-track-inspector";
import { CinematicAnimationGroupTrack } from "../inspectors/animation-group-inspector";
import { CinematicPropertyGroupTrack } from "../inspectors/property-group-track-inspector";

import CinematicEditorPlugin from "../index";
import { ITrackOptions } from "../types/track-options";

export interface ITracksProps {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
	/**
	 * Defines the reference to the cinematic being edited.
	 */
	cinematic: Cinematic;
	/**
	 * Defines the reference to the cinematic editor base class.
	 */
	cinematicEditor: CinematicEditorPlugin;
}

export interface ITracksState {
	/**
	 * Defines the list of all nodes available in the tracks tree.
	 */
	nodes: TreeNodeInfo<ITrackOptions>[];
	/**
	 * Defines the reference to the selected node in the tracks tree.
	 */
	selectedNode: Nullable<TreeNodeInfo<ITrackOptions>>;
}

export class Tracks extends React.Component<ITracksProps, ITracksState> {
	private _mainDiv: Nullable<HTMLDivElement> = null;

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: ITracksProps) {
		super(props);

		this.state = {
			selectedNode: null,
			nodes: this.getTracksNodes(),
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
				<div style={{ height: "35px" }}>
					<ButtonGroup fill style={{ paddingTop: "10px", paddingLeft: "5px", paddingRight: "5px" }}>
						<Button small text="Add..." icon={<Icon src="plus.svg" />} rightIcon="caret-down" onClick={(ev) => this._handleAddButtonClicked(ev)} />
					</ButtonGroup>
				</div>
				<Divider />
				<div
					ref={(r) => this._mainDiv = r}
					onScroll={() => this._handleScroll()}
					style={{ height: "100%", overflow: "hidden", paddingBottom: "50px", backgroundColor: "#3A3A3A" }}
				>
					<Tree
						contents={this.state.nodes}
						onNodeClick={(n) => this._handleNodeClicked(n)}
						onNodeExpand={(n) => this._handleNodeExpand(n)}
						onNodeCollapse={(n) => this._handleNodeCollapsed(n)}
						onNodeContextMenu={(n, _, ev) => this._handleNodeContextMenu(n, ev)}
					/>
				</div>
			</div>
		);
	}

	/**
	 * Sets the new scroll top value of the main div.
	 * @param scrollTop defines the value of the new scroll top.
	 */
	public setScrollHeight(scrollTop: number): void {
		if (this._mainDiv) {
			this._mainDiv.scrollTop = Math.round(scrollTop);
		}
	}

	/**
	 * Returns wether or not the node identified by the given Id is expanded.
	 * @param id defines the id of the node to check.
	 */
	public isNodeExpanded(id: string): boolean {
		return this.state.nodes.find((n) => n.childNodes?.length && n.id === id)?.isExpanded ?? true;
	}

	/**
	 * Refreshes the current list of tracks.
	 */
	public refreshTracks(): void {
		this.setState({ nodes: this.getTracksNodes() });
	}

	/**
	 * Called on the user scrolls.
	 */
	private _handleScroll(): void {
		if (!this._mainDiv) {
			return;
		}

		// this.props.cinematicEditor._timelines?.setScrollHeight(this._mainDiv.scrollTop);
	}

	/**
	 * Returns the list of all available track nodes.
	 */
	public getTracksNodes(): TreeNodeInfo<ITrackOptions>[] {
		return [this._getCameraContent(), ...this._getTracksContent()];
	}

	/**
	 * Traverses all the given nodes array and calls the given callback.
	 */
	private _traverseNodes(nodes: TreeNodeInfo[], callback: (n: TreeNodeInfo) => void): void {
		nodes.forEach((n) => {
			callback(n);

			if (n.childNodes?.length) {
				this._traverseNodes(n.childNodes, callback);
			}
		});
	}

	/**
	 * Called on the user expands the given node.
	 */
	private _handleNodeExpand(node: TreeNodeInfo): void {
		node.isExpanded = true;
		this.setState({ nodes: this.state.nodes }, () => {
			this.props.cinematicEditor?._timelines?.refreshTimelines();
		});

	}

	/**
	 * Called on the user collapses the given node.
	 */
	private _handleNodeCollapsed(node: TreeNodeInfo): void {
		node.isExpanded = false;
		this.setState({ nodes: this.state.nodes }, () => {
			this.props.cinematicEditor?._timelines?.refreshTimelines();
		});
	}

	/**
	 * Called on the user clicls on the given node.
	 */
	private _handleNodeClicked(node: TreeNodeInfo<ITrackOptions>): void {
		this._traverseNodes(this.state.nodes, (n) => n.isSelected = false);
		node.isSelected = true;

		if (node.nodeData?.track.group) {
			this.props.editor.inspector.setSelectedObject(new CinematicGroupTrack(node.nodeData.track, this.props.cinematicEditor._tracks));
		}

		if (node.nodeData?.track?.animationGroup) {
			this.props.editor.inspector.setSelectedObject(new CinematicAnimationGroupTrack(node.nodeData.track, this.props.cinematicEditor._tracks));
		}

		if (node.nodeData?.track?.property) {
			this.props.editor.inspector.setSelectedObject(new CinematicPropertyTrack(node.nodeData.track, this.props.cinematicEditor._tracks));
		}

		if (node.nodeData?.track?.propertyGroup) {
			this.props.editor.inspector.setSelectedObject(new CinematicPropertyGroupTrack(node.nodeData.track, this.props.cinematicEditor._tracks));
		}

		this.setState({ nodes: this.state.nodes, selectedNode: node });
	}

	/**
	 * Returns all the nodes available for the camera (position, rotation, etc.)
	 */
	private _getCameraContent(): TreeNodeInfo<ITrackOptions> {
		return {
			hasCaret: true,
			isExpanded: true,
			label: (
				<InspectorList object={{ name: "Camera" }} property="name" label="Camera" noUndoRedo items={() => {
					return this.props.editor.scene?.cameras.map((c) => ({ data: c, label: c.name })) ?? [];
				}} onChange={(c) => {
					const nodeId = c?.id ?? "None";
					this.props.cinematic.camera.cameraId = nodeId;
					this.props.cinematic.camera.fov.property!.nodeId = nodeId;
					this.props.cinematic.camera.position.property!.nodeId = nodeId;
					this.props.cinematic.camera.target.property!.nodeId = nodeId;
				}} />
			),
			id: "cinematic-editor-camera",
			childNodes: [{
				label: "Position",
				id: "cinematic-editor-camera-position",
				secondaryLabel: <span style={{ color: "grey" }}>(Vector3)</span>,
			}, {
				label: "Target",
				id: "cinematic-editor-camera-target",
				secondaryLabel: <span style={{ color: "grey" }}>(Vector3)</span>,
			}, {
				label: "FOV",
				id: "cinematic-editor-camera-fov",
				secondaryLabel: <span style={{ color: "grey" }}>(Number)</span>,
			}, {
				label: "Focus Distance",
				id: "cinematic-editor-camera-focus-distance",
				secondaryLabel: <span style={{ color: "grey" }}>(DOF)</span>,
			}, {
				label: "F Stop",
				id: "cinematic-editor-camera-fstop",
				secondaryLabel: <span style={{ color: "grey" }}>(DOF)</span>,
			}, {
				label: "Focal Length",
				id: "cinematic-editor-camera-focal-length",
				secondaryLabel: <span style={{ color: "grey" }}>(DOF)</span>,
			}],
		};
	}

	/**
	 * Returns the list of additional tracks added by the user.
	 */
	private _getTracksContent(root: ICinematicTrack[] = this.props.cinematic.tracks): TreeNodeInfo<ITrackOptions>[] {
		const scene = this.props.editor.scene;

		return root.map((t, index) => {
			let label: string | JSX.Element = t.type.toString();
			let secondaryLabel: Undefinable<JSX.Element> = undefined;
			let childNodes: Undefinable<TreeNodeInfo<ITrackOptions>[]> = undefined;

			switch (t.type) {
				case CinematicTrackType.Group:
					label = (
						<div key={Tools.RandomId()} style={{ height: "26px", background: "darkslategrey", borderRadius: "10px" }}>
							<span style={{ lineHeight: "26px", marginLeft: "10px" }}>{t.group!.name}</span>
						</div>
					);
					childNodes = this._getTracksContent(t.group!.tracks);
					break;

				case CinematicTrackType.Property:
					const listLabel = <span>{t.property!.propertyPath}</span>;

					label = <InspectorList key={Tools.RandomId()} object={t.property} property="nodeId" label={listLabel} noUndoRedo borderLeftColor="forestgreen" dndHandledTypes={["graph/node"]} items={() => {
						const node = scene?.getNodeById(t.property!.nodeId);
						return [
							{ label: node?.name ?? "None", data: node?.id ?? "None" },
							{ label: "Scene", data: "__editor__scene__" },
						];
					}} onChange={() => {

					}} />
					break;

				case CinematicTrackType.PropertyGroup:
					label = (
						<div style={{ height: "25px", borderLeft: "3px solid rebeccapurple", padding: "0px 4px 0px 5px" }}>
							<span style={{ lineHeight: "28px" }}>{t.propertyGroup!.propertyPath}</span>
						</div>
					);
					secondaryLabel = <span key={Tools.RandomId()} style={{ color: "grey" }}>(Property Group)</span>;
					break;

				case CinematicTrackType.AnimationGroup:
					label = <InspectorList key={Tools.RandomId()} object={t.animationGroup} property="name" label="Animation Group" noUndoRedo borderLeftColor="darkorange" items={() => {
						return this.props.editor.scene?.animationGroups.map((c) => ({ data: c.name, label: c.name })) ?? [];
					}} onChange={() => {

					}} />
					break;
			}

			return {
				label,
				childNodes,
				secondaryLabel,
				nodeData: { removable: true, track: t },
				isExpanded: t.type === CinematicTrackType.Group,
				id: t.type === CinematicTrackType.Group ? `trackGroup${index}` : `track${index}`,
			};
		});
	}

	/**
	 * Called on the user clicks on the add button.
	 */
	private _handleAddButtonClicked(ev: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
		ContextMenu.show((
			<Menu>
				<MenuItem text="Add Group..." onClick={() => this._handleAddGroup()} />
				<MenuDivider />
				<MenuItem text="Add Property Track" onClick={() => this._handleAddPropertyTrack()} />
				<MenuItem text="Add Property Group Track" onClick={() => this._handleAddPropertyGroupTrack()} />
				<MenuDivider />
				<MenuItem text="Add Animation Group Track" onClick={() => this._handleAddAnimationGroupTrack()} />
			</Menu>
		), {
			top: ev.clientY,
			left: ev.clientX,
		});
	}

	/**
	 * Called on the user wants to add a new animation group track.
	 */
	private _handleAddAnimationGroupTrack(): void {
		this.props.cinematic.tracks.push({
			type: CinematicTrackType.AnimationGroup,
			animationGroup: {
				name: "None",
				slots: [],
			},
		});

		this.setState({ nodes: this.getTracksNodes(), selectedNode: null }, () => {
			this.props.cinematicEditor._timelines?.refreshTimelines();
		});
	}

	/**
	 * Called on the user wants to add a track group.
	 */
	private async _handleAddGroup(): Promise<void> {
		const name = await Dialog.Show("Group Name", "Please provide a name for the new track group.");
		if (!name) {
			return;
		}

		this.props.cinematic.tracks.push({
			type: CinematicTrackType.Group,
			group: {
				name,
				tracks: [],
			},
		});

		this.setState({ nodes: this.getTracksNodes(), selectedNode: null }, () => {
			this.props.cinematicEditor._timelines?.refreshTimelines();
		});
	}

	/**
	 * Called on the user wants to add a new property track.
	 */
	private _handleAddPropertyTrack(): void {
		this.props.cinematic.tracks.push({
			type: CinematicTrackType.Property,
			property: {
				keys: [],
				nodeId: "None",
				propertyPath: "",
				animationType: Animation.ANIMATIONTYPE_FLOAT,
			},
		});

		this.setState({ nodes: this.getTracksNodes(), selectedNode: null }, () => {
			this.props.cinematicEditor._timelines?.refreshTimelines();
		});
	}

	/**
	 * Called on the user wants to add a new property group track.
	 */
	private _handleAddPropertyGroupTrack(): void {
		this.props.cinematic.tracks.push({
			type: CinematicTrackType.PropertyGroup,
			propertyGroup: {
				keys: [],
				nodeIds: [],
				propertyPath: "",
				animationType: Animation.ANIMATIONTYPE_FLOAT,
			},
		});

		this.setState({ nodes: this.getTracksNodes(), selectedNode: null }, () => {
			this.props.cinematicEditor._timelines?.refreshTimelines();
		});
	}

	/**
	 * Called on the user right-clicks on a node.
	 */
	private _handleNodeContextMenu(node: TreeNodeInfo<ITrackOptions>, ev: React.MouseEvent<HTMLElement, MouseEvent>): void {
		if (!node.nodeData) {
			return;
		}

		ContextMenu.show((
			<Menu>
				<MenuItem text="Remove" disabled={!node.nodeData.removable} icon={<Icon src="times.svg" />} onClick={() => this._handleRemoveNode(node)} />
			</Menu>
		), {
			top: ev.clientY,
			left: ev.clientX,
		});
	}

	/**
	 * Called on the user wants to remove the given track node.
	 */
	private _handleRemoveNode(node: TreeNodeInfo<ITrackOptions>): void {
		const track = node.nodeData?.track;
		if (!track) {
			return;
		}

		const index = this.props.cinematic.tracks.indexOf(track);
		if (index !== -1) {
			this.props.cinematic.tracks.splice(index, 1);
		}

		this.setState({ nodes: this.getTracksNodes(), selectedNode: null });
		this.props.cinematicEditor._timelines?.refreshTimelines();
	}
}
