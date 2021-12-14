import { join } from "path";
import { DirectoryTree } from "directory-tree";

import * as React from "react";
import { Button, Divider } from "@blueprintjs/core";
import Tree, { DataNode } from "antd/lib/tree/index";

import { Icon } from "../../../gui/icon";
import { Overlay } from "../../../gui/overlay";

import { FSTools } from "../../../tools/fs";

import { WorkSpace } from "../../workspace";

import { Packer } from "../packer";

export interface IPackerTreeStepProps {
	/**
	 * Defines the reference to the packer.
	 */
	packer: Packer;

	/**
	 * Defines the callback called on the files have been selected.
	 */
	onDone: (files: string[]) => void;
}

export interface IPackerTreeStepState {
	/**
	 * Defines the list of all available absolute files paths.
	 */
	files: string[];
}

export class PackerTreeStep extends React.Component<IPackerTreeStepProps, IPackerTreeStepState> {
	private _checkedFiles: string[] = [];

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IPackerTreeStepProps) {
		super(props);

		this.state = {
			files: [],
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<div style={{ marginLeft: "-30px", height: "100%" }}>
				<div style={{ overflow: "auto", height: "calc(100% - 70px)" }}>
					<Tree.DirectoryTree
						checkable
						blockNode
						defaultExpandAll={false}
						expandAction="doubleClick"
						className="draggable-tree"
						treeData={this._getTreeData()}
						onCheck={(c) => this._handleChecked(c as string[])}
					/>
				</div>
				<Divider />
				<Button text="Next" fill intent="success" onClick={() => this.props.onDone(this._checkedFiles)} />
			</div>
		);
	}

	/**
	 * Called on the component did mount.
	 */
	public async componentDidMount(): Promise<void> {
		// Get list of files
		Overlay.Show("Analysing Workspace...", true);

		const files = await FSTools.GetGlobFiles(join(WorkSpace.DirPath!, "**", "*.*"), [
			join(WorkSpace.DirPath!, "src", "**", "*.*"),
			join(WorkSpace.DirPath!, "build", "**", "*.*"),
			join(WorkSpace.DirPath!, "projects", "**", "*.*"),
			join(WorkSpace.DirPath!, "declaration", "**", "*.*"),
			join(WorkSpace.DirPath!, "node_modules", "**", "*.*"),
		]);

		Overlay.Hide();

		this.setState({ files });
	}

	/**
	 * Called on the user checks a node.
	 */
	private _handleChecked(keys: string[]): void {
		this._checkedFiles = keys;
	}

	/**
	 * Returns the list of all available data nodes.
	 */
	private _getTreeData(): DataNode[] {
		if (!WorkSpace.DirPath) {
			return [];
		}

		return this.props.packer.getRootDirectories(this.state.files).map((rd) => this._recursivelyGetDataNode(rd));
	}

	/**
	 * Recursively creates the data nodes for the tree.
	 */
	private _recursivelyGetDataNode(root: DirectoryTree): DataNode {
		const dataNode: DataNode = {
			key: root.path,
			title: root.name,
			isLeaf: root.type === "file",
			icon: <Icon src={root.type === "directory" ? "folder.svg" : "file.svg"} />
		};

		if (root.type === "directory") {
			dataNode.children = root.children?.filter((c) => c.name.indexOf(".") !== 0).map((c) => this._recursivelyGetDataNode(c));
		}

		return dataNode;
	}
}
