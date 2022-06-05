import { readJSON, writeJSON } from "fs-extra";

import { IStringDictionary, Nullable } from "../../../shared/types";

import * as React from "react";
import { Button, ButtonGroup, Divider, H3, Intent, ITreeNode, Tree, Toaster } from "@blueprintjs/core";

import { IWorkSpace } from "../../editor/project/typings";

import { TouchBarHelper } from "../../editor/tools/touch-bar";

import { IPCTools } from "../../editor/tools/ipc";
import { IEditorPreferences } from "../../editor/tools/types";

import { EditorPreferencesPanel } from "./panels/editor";
import { PluginsPreferencesPanel } from "./panels/plugins";
import { WorkspacePreferencesPanel } from "./panels/workspace";

import { AssetsTexturesPreferencesPanel } from "./panels/assets/textures";
import { AssetsGeometriesPreferencesPanel } from "./panels/assets/geometries";

export const title = "Preferences";

export interface IPreferencesPanelProps {
	/**
	 * Defines the reference to the main preferences window.
	 */
	preferences: PreferencesWindow;
}

export interface IPreferencesWindowState {
	/**
	 * Defines the reference to the workspace 
	 */
	workspace?: IWorkSpace;
	/**
	 * Defines the reference to the editor's preferences.
	 */
	editor: IEditorPreferences;

	/**
	 * Defines the list of all categories.
	 */
	categories: ITreeNode<{}>[];
	/**
	 * Defines the reference to the active panel.
	 */
	activePanel: React.JSXElementConstructor<IPreferencesPanelProps>;
}

export default class PreferencesWindow extends React.Component<{}, IPreferencesWindowState> {
	/**
	 * Defines the absolute path to the workspace file.
	 */
	public workspacePath: Nullable<string> = null;

	private _panels: IStringDictionary<React.JSXElementConstructor<IPreferencesPanelProps>> = {
		"workspace": WorkspacePreferencesPanel,
		"editor": EditorPreferencesPanel,
		"plugins": PluginsPreferencesPanel,

		"assets/geometries": AssetsGeometriesPreferencesPanel,
		"assets/textures": AssetsTexturesPreferencesPanel,
	};

	private _toaster: Nullable<Toaster> = null;

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: any) {
		super(props);

		this.state = {
			activePanel: this._panels.editor,
			editor: JSON.parse(localStorage.getItem("babylonjs-editor-preferences") ?? "{ }"),
			categories: [],
		};
	}

	/**
	 * Inits the plugin.
	 * @param workspaePath defines the path to the workspace file.
	 */
	public async init(workspaePath?: string): Promise<void> {
		this.workspacePath = workspaePath ?? null;

		TouchBarHelper.SetTouchBarElements([]);

		if (this.workspacePath) {
			this.setState({
				workspace: await readJSON(this.workspacePath, { encoding: "utf-8" }),
			});
		}

		this.setState({
			categories: [
				{ id: "workspace", label: "Workspace", disabled: this.workspacePath === null },
				{ id: "editor", label: "Editor", isSelected: true },
				{ id: "plugins", label: "Plugins" },
				{ id: "assets", label: "Assets", isExpanded: true, disabled: this.workspacePath === null, childNodes: [
					{ id: "assets/geometries", label: "Geometries", disabled: this.workspacePath === null },
					{ id: "assets/textures", label: "Textures", disabled: this.workspacePath === null },
				] }
			],
		});
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<div style={{ width: "100%", height: "100%" }}>
				<div style={{ width: "300px", height: "100%", float: "left", backgroundColor: "#222222" }}>
					<H3 style={{ textAlign: "center", lineHeight: "45px" }}>Categories</H3>
					<Divider />
					<Tree
						contents={this.state.categories}
						onNodeClick={(n) => this._handleCategoryClick(n)}
						onNodeExpand={(n) => this._handleCategoryExpanded(n)}
						onNodeCollapse={(n) => this._handleCategoryCollapsed(n)}
					/>

					<ButtonGroup style={{ marginLeft: "10px", width: "295px", position: "absolute", bottom: "60px" }}>
						<Button text="Apply" style={{ width: "calc(100% - 20px)" }} intent={Intent.PRIMARY} onClick={() => this._handleApply()} />
					</ButtonGroup>
					
					<ButtonGroup style={{ marginLeft: "10px", width: "295px", position: "absolute", bottom: "15px" }}>
						<Button text="Ok" style={{ width: "calc(50% - 10px)" }} intent={Intent.SUCCESS} onClick={() => this._handleOk()} />
						<Button text="Close" style={{ left: "10px", width: "calc(50% - 20px)" }} intent={Intent.WARNING} onClick={() => this._handleClose()} />
					</ButtonGroup>
				</div>
				<div style={{ width: "calc(100% - 300px)", height: "100%", float: "left", backgroundColor: "#444444", overflow: "auto" }}>
					<H3 style={{ textAlign: "center", lineHeight: "45px" }}>{this.state.categories.find((c) => c.isSelected || c.childNodes?.find((c) => c.isSelected))?.label}</H3>
					<Divider />
					<this.state.activePanel preferences={this} />
				</div>
				<Toaster ref={(ref) => this._toaster = ref} position="top-right" usePortal={true} />
			</div>
		);
	}

	/**
	 * Called on the user clicks on a category in the tree.
	 */
	private _handleCategoryClick(node: ITreeNode<{}>): void {
		const categories = this.state.categories.slice();
		categories.forEach((n) => {
			n.isSelected = false;

			// Only 2 levels here, keep it this way :)
			n.childNodes?.forEach((n) => n.isSelected = false);
		});

		node.isSelected = true;
		this.setState({ categories });

		const activePanel = this._panels[node.id];
		if (activePanel) {
			this.setState({ activePanel });
		}
	}

	/**
	 * Called on the user expands a node.
	 */
	private _handleCategoryExpanded(node: ITreeNode<{}>): void {
		node.isExpanded = true;
		this.setState({ categories: this.state.categories });
	}

	/**
	 * Called on the user collapses a node.
	 */
	private _handleCategoryCollapsed(node: ITreeNode<{}>): void {
		node.isExpanded = false;
		this.setState({ categories: this.state.categories });
	}

	/**
	 * Called on the user clicks on the "Apply" button. Saves the preferences.
	 */
	private async _handleApply(): Promise<void> {
		try {
			// Workspace
			if (this.workspacePath && this.state.workspace) {
				await writeJSON(this.workspacePath, this.state.workspace, { encoding: "utf-8", spaces: "\t" });
				await IPCTools.ExecuteEditorFunction("_refreshWorkSpace");
			}

			// Preferences
			localStorage.setItem("babylonjs-editor-preferences", JSON.stringify(this.state.editor));
			await IPCTools.ExecuteEditorFunction("_applyPreferences");
			await IPCTools.ExecuteEditorFunction("_applyPreferencesPlugins");

			this._toaster?.show({
				timeout: 1000,
				intent:"success",
				message: "Preferences Applied",
			});
		} catch (e) {
			this._toaster?.show({
				timeout: 3000,
				intent: "danger",
				message: `Failed: ${e.message}`,
			});
		}
	}

	/**
	 * Called on the user clicks on the "Ok" button. Saves the preferences and closes
	 * the window.
	 */
	private async _handleOk(): Promise<void> {
		await this._handleApply();
		this._handleClose();
	}

	/**
	 * Called once the user cancels preferences.
	 */
	private _handleClose(): void {
		window.close();
	}
}
