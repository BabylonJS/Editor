import { basename, dirname, join } from "path";
import { readdir, stat } from "fs-extra";

import * as React from "react";

import TreeSelect from "antd/lib/tree-select";
import { DefaultOptionType } from "rc-tree-select/lib/TreeSelect";

import { InspectorList } from "../../../editor/gui/inspector/fields/list";
import { InspectorNumber } from "../../../editor/gui/inspector/fields/number";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";
import { InspectorBoolean } from "../../../editor/gui/inspector/fields/boolean";
import { InspectorFileInput } from "../../../editor/gui/inspector/fields/file-input";

import { IPreferencesPanelProps } from "../index";

export interface IWorkspacePreferencesPanelState {
	/**
	 * Defines the current value for the scene output directory.
	 */
	sceneOutputDirectory?: string;
	/**
	 * Defines the list of all available items in the output folder tree select.
	 */
	sceneOutputData: DefaultOptionType[];
}

export class WorkspacePreferencesPanel extends React.Component<IPreferencesPanelProps, IWorkspacePreferencesPanelState> {
	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IPreferencesPanelProps) {
		super(props);

		this.state = {
			sceneOutputData: [],
			sceneOutputDirectory: props.preferences.state.workspace?.outputSceneDirectory,
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		const workspace = this.props.preferences.state.workspace;
		if (!workspace) {
			return null;
		}

		workspace.https ??= {
			enabled: false,
		};

		return (
			<div style={{ width: "70%", height: "100%", margin: "auto" }}>
				<InspectorSection title="Project">
					<InspectorBoolean object={workspace} property="generateSceneOnSave" label="Generate Scene On Save" defaultValue={true} />
					<InspectorBoolean object={workspace} property="playProjectInIFrame" label="Use Isolated IFrame When Playing Project" defaultValue={false} />
				</InspectorSection>

				<InspectorSection title="Package Manager">
					<InspectorList object={workspace} property="packageManager" label="Package Manager" items={[
						{ label: "Npm", data: "npm" },
						{ label: "Yarn", data: "yarn" },
					]} />
				</InspectorSection>

				<InspectorSection title="WebPack">
					<InspectorBoolean object={workspace} property="watchProject" label="Watch Project Automatically" defaultValue={true} />
				</InspectorSection>

				<InspectorSection title="Scene Output Folder">
					<TreeSelect
						treeDataSimpleMode
						style={{ width: "100%" }}
						placeholder="Please select"
						treeData={this.state.sceneOutputData}
						value={this.state.sceneOutputDirectory}
						dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
						loadData={(d) => this._handleLoadTreeSelectData(d)}
						onChange={(a) => this._handleSceneOutputDirectoryChanged(a)}
					/>
				</InspectorSection>

				<InspectorSection title="Web Server">
					<InspectorNumber object={workspace} property="serverPort" label="Server Port" min={0} step={1} />
					<InspectorSection title="HTTPS">
						<InspectorBoolean object={workspace.https} property="enabled" label="Enabled" defaultValue={false} />
						<InspectorFileInput object={workspace.https} property="certPath" label="Certificate" />
						<InspectorFileInput object={workspace.https} property="keyPath" label="Private Key" />
					</InspectorSection>
				</InspectorSection>
			</div>
		);
	}

	/**
	 * Called on the component did mount.
	 */
	public async componentDidMount(): Promise<void> {
		const workspacePath = this.props.preferences.workspacePath;
		if (!workspacePath) {
			return;
		}

		const workspaceDirectory = dirname(workspacePath);

		this.setState({
			sceneOutputData: [
				{ id: workspaceDirectory, label: "./", value: "" },
				...await this._getDirectories(workspaceDirectory),
			],
		});
	}

	/**
	 * Called on the user selected an output folder for the scene output.
	 */
	private _handleSceneOutputDirectoryChanged(absolutePath: string): void {
		const workspacePath = this.props.preferences.workspacePath;
		if (!workspacePath) {
			return;
		}

		const relativePath = absolutePath.replace(join(dirname(workspacePath), "/"), "");

		const workspace = this.props.preferences.state.workspace;
		if (workspace) {
			workspace.outputSceneDirectory = relativePath;
		}

		this.setState({ sceneOutputDirectory: relativePath });
	}

	/**
	 * Called on the user wants to expand a directory in the tree select.
	 * Loads all the children directories of the expanded node in the tree select.
	 */
	private async _handleLoadTreeSelectData(d: DefaultOptionType): Promise<void> {
		const children = await this._getDirectories(d.key as string);
		children.forEach((c) => c.pId = d.key);
	
		this.setState({ sceneOutputData: this.state.sceneOutputData.concat(children) });
	}

	/**
	 * Returns the list of all directories contained in the given directory.
	 */
	private async _getDirectories(directory: string): Promise<DefaultOptionType[]> {
		const list = await readdir(directory);
		const sceneOutputData: DefaultOptionType[] = [];

		for (const l of list) {
			const absolutePath = join(directory, l);
			const fStat = await stat(absolutePath);

			if (fStat.isDirectory()) {
				sceneOutputData.push({ id: absolutePath, label: basename(absolutePath), value: absolutePath });
			}
		}

		return sceneOutputData;
	}
}
