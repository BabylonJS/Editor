import { pathExists } from "fs-extra";
import directoryTree, { DirectoryTree } from "directory-tree";

import * as React from "react";
import { Classes, InputGroup, Tree, ITreeNode } from "@blueprintjs/core";

import { Icon } from "../../gui/icon";
import { join } from "path";

export interface IAssetsBrowserTreeProps {
	/**
	 * Defines the callback called on a directory has been clicked in the tree.
	 */
	onDirectorySelected: (path: string) => void;
}

export interface IAssetsBrowserTreeState {
	/**
	 * Defines the list of all available nodes in the tree.
	 */
	nodes: ITreeNode<string>[];
}

export class AssetsBrowserTree extends React.Component<IAssetsBrowserTreeProps, IAssetsBrowserTreeState> {
	private _assetsDirectory: string;
	private _activeDirectory: string;

	private _expandedPaths: string[] = [];

	private _filter: string = "";

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IAssetsBrowserTreeProps) {
		super(props);

		this.state = {
			nodes: [],
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
						contents={this.state.nodes}
						onNodeClick={(n) => this._handleNodeClicked(n)}
						onNodeExpand={(n) => this._handleNodeExpanded(n, "expand")}
						onNodeCollapse={(n) => this._handleNodeExpanded(n, "collapse")}
						onNodeDoubleClick={(n) => this._handleNodeExpanded(n, n.isExpanded ? "collapse" : "expand")}
					/>
				</div>
			</div>
		);
	}

	/**
	 * Sets the new absolute path to the directory to read and draw its items.
	 * @param directoryPath defines the absolute path to the directory to show in the view.
	 */
	public async setDirectory(directoryPath: string): Promise<void> {
		if (!this._assetsDirectory) {
			this._assetsDirectory = directoryPath;
		}

		const split = directoryPath.split(this._assetsDirectory)[1];
		if (split) {
			const directories = split.split("/");

			let stack = directories[0];

			directories.forEach((d) => {
				if (!d) {
					return;
				}

				const path = join(this._assetsDirectory, stack);
				const index = this._expandedPaths.indexOf(path);
				if (index === -1) {
					this._expandedPaths.push(path);
				}

				stack = join(stack, d);
			});
		}

		this._activeDirectory = directoryPath;
		this.setState({ nodes: [this._refreshTree()] });
	}

	/**
	 * Called on the user changes the filter.
	 */
	private _handleFilterChanged(filter: string): void {
		this._filter = filter;
		this.setState({ nodes: [this._refreshTree()] });
	}

	/**
	 * Called on the user clicks on a node.
	 */
	private async _handleNodeClicked(node: ITreeNode<string>): Promise<void> {
		this._tarverseNodes(this.state.nodes, (n) => n.isSelected = false);
		node.isSelected = true;

		this.setState({ nodes: this.state.nodes });

		const exists = await pathExists(node.nodeData!);
		if (exists) {
			this.props.onDirectorySelected(node.nodeData!);
		}
	}

	/**
	 * Called on the user expands or collapses a node.
	 */
	private _handleNodeExpanded(node: ITreeNode<string>, state: "expand" | "collapse"): void {
		node.isExpanded = state === "expand";
		node.icon = node.isExpanded ? <Icon src="folder-open.svg" /> : <Icon src="folder.svg" />;

		if (state === "expand") {
			this._expandedPaths.push(node.nodeData!);
		} else {
			const index = this._expandedPaths.indexOf(node.nodeData!);
			if (index !== -1) {
				this._expandedPaths.splice(index, 1);
			}
		}

		this.setState({ nodes: this.state.nodes });
	}

	/**
	 * Traverses all the nodes of the tree and calls the given callback for each node visited.
	 */
	private _tarverseNodes(nodes: ITreeNode<string>[], callback: (n: ITreeNode<string>) => void): void {
		nodes.forEach((n) => {
			callback(n);
			this._tarverseNodes(n.childNodes ?? [], callback);
		});
	}

	/**
	 * Refreshes the current list of nodes available in the tree.
	 */
	private _refreshTree(tree?: DirectoryTree, root?: ITreeNode<string>): ITreeNode<string> {
		tree ??= directoryTree(this._assetsDirectory);
		root ??= {
			id: tree.path,
			childNodes: [],
			label: tree.name,
			isExpanded: true,
			nodeData: tree.path,
			icon: <Icon src="folder-open.svg" />
		};

		const filter = this._filter.toLowerCase();

		tree.children?.forEach((t) => {
			if (t.type === "file") {
				return;
			}

			const child = this._refreshTree(t, {
				id: t.path,
				label: t.name,
				childNodes: [],
				nodeData: t.path,
				icon: <Icon src="folder.svg" />,
				isSelected: this._activeDirectory === t.path,
				isExpanded: this._expandedPaths.indexOf(t.path) !== -1 || this._filter !== "",
			});

			const matches = t.name.toLowerCase().indexOf(filter) !== -1;
			if (matches) {
				// root?.childNodes?.push(child);
			}
			
			root?.childNodes?.push(child);
		});

		if (!root.childNodes?.length) {
			root.childNodes = undefined;
		}

		return root;
	}
}
