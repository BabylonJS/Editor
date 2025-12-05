import { dirname, join } from "path/posix";
import { ipcRenderer, shell } from "electron";

import { Component, ReactNode } from "react";

import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger } from "../../ui/shadcn/ui/menubar";

import { isDarwin } from "../../tools/os";
import { execNodePty } from "../../tools/node-pty";
import { openSingleFileDialog } from "../../tools/dialog";

import { showConfirm } from "../../ui/dialog";
import { ToolbarComponent } from "../../ui/toolbar";

import { saveProject } from "../../project/save/save";
import { startProjectDevProcess } from "../../project/run";
import { exportProject } from "../../project/export/export";

import { Editor } from "../main";
import { getNodeCommands } from "../dialogs/command-palette/node";
import { getMeshCommands } from "../dialogs/command-palette/mesh";
import { getLightCommands } from "../dialogs/command-palette/light";
import { getCameraCommands } from "../dialogs/command-palette/camera";
import { getSpriteCommands } from "../dialogs/command-palette/sprite";
import { ICommandPaletteType } from "../dialogs/command-palette/command-palette";

export interface IEditorToolbarProps {
	editor: Editor;
}

export class EditorToolbar extends Component<IEditorToolbarProps> {
	private _nodeCommands: ICommandPaletteType[];
	private _meshCommands: ICommandPaletteType[];
	private _lightCommands: ICommandPaletteType[];
	private _cameraCommands: ICommandPaletteType[];
	private _spriteCommands: ICommandPaletteType[];

	public constructor(props: IEditorToolbarProps) {
		super(props);

		ipcRenderer.on("editor:open-project", () => this._handleOpenProject());
		ipcRenderer.on("editor:open-vscode", () => this._handleOpenVisualStudioCode());

		this._nodeCommands = getNodeCommands(this.props.editor);
		this._meshCommands = getMeshCommands(this.props.editor);
		this._lightCommands = getLightCommands(this.props.editor);
		this._cameraCommands = getCameraCommands(this.props.editor);
		this._spriteCommands = getSpriteCommands(this.props.editor);

		const commands = [...this._nodeCommands, ...this._meshCommands, ...this._lightCommands, ...this._cameraCommands, ...this._spriteCommands];

		commands.forEach((command) => {
			ipcRenderer.on(`add:${command.ipcRendererChannelKey}`, command.action);
		});
	}

	public render(): ReactNode {
		return (
			<>
				{isDarwin() && <div className="absolute top-0 left-0 w-screen h-10 electron-draggable" />}

				{(!isDarwin() || process.env.DEBUG) && this._getToolbar()}
			</>
		);
	}

	private _getToolbar(): ReactNode {
		return (
			<ToolbarComponent>
				<Menubar className="border-none rounded-none pl-3 my-auto">
					<img alt="" src="assets/babylonjs_icon.png" className="w-6 object-contain" />

					{/* File */}
					<MenubarMenu>
						<MenubarTrigger>File</MenubarTrigger>
						<MenubarContent className="border-black/50">
							<MenubarItem onClick={() => this._handleOpenProject()}>
								Open Project <MenubarShortcut>CTRL+O</MenubarShortcut>
							</MenubarItem>

							<MenubarSeparator />

							<MenubarItem onClick={() => saveProject(this.props.editor)}>
								Save <MenubarShortcut>CTRL+S</MenubarShortcut>
							</MenubarItem>

							<MenubarItem onClick={() => exportProject(this.props.editor, { optimize: true })}>
								Generate <MenubarShortcut>CTRL+G</MenubarShortcut>
							</MenubarItem>

							<MenubarSeparator />

							<MenubarItem disabled={!this.props.editor.state.visualStudioCodeAvailable} onClick={() => this._handleOpenVisualStudioCode()}>
								Open in Visual Studio Code
							</MenubarItem>

							<MenubarSeparator />

							<MenubarItem onClick={() => startProjectDevProcess(this.props.editor)}>Run Project...</MenubarItem>
						</MenubarContent>
					</MenubarMenu>

					{/* Edit */}
					<MenubarMenu>
						<MenubarTrigger>Edit</MenubarTrigger>
						<MenubarContent className="border-black/50">
							<MenubarItem>
								Undo <MenubarShortcut>CTRL+Z</MenubarShortcut>
							</MenubarItem>
							<MenubarItem>
								Redo <MenubarShortcut>CTRL+Y</MenubarShortcut>
							</MenubarItem>

							<MenubarSeparator />

							<MenubarItem>
								Select All <MenubarShortcut>CTRL+A</MenubarShortcut>
							</MenubarItem>
							<MenubarItem>
								Copy <MenubarShortcut>CTRL+C</MenubarShortcut>
							</MenubarItem>
							<MenubarItem>
								Paste <MenubarShortcut>CTRL+V</MenubarShortcut>
							</MenubarItem>

							<MenubarSeparator />

							<MenubarItem onClick={() => this.props.editor.setState({ editProject: true })}>Project...</MenubarItem>

							<MenubarSeparator />

							<MenubarItem onClick={() => this.props.editor.setState({ editPreferences: true })}>Preferences...</MenubarItem>
						</MenubarContent>
					</MenubarMenu>

					{/* Preview */}
					<MenubarMenu>
						<MenubarTrigger>Preview</MenubarTrigger>
						<MenubarContent className="border-black/50">
							<MenubarItem onClick={() => this.props.editor.layout.preview.setActiveGizmo("position")}>
								Position <MenubarShortcut>CTRL+T</MenubarShortcut>
							</MenubarItem>
							<MenubarItem onClick={() => this.props.editor.layout.preview.setActiveGizmo("rotation")}>
								Rotation <MenubarShortcut>CTRL+R</MenubarShortcut>
							</MenubarItem>
							<MenubarItem onClick={() => this.props.editor.layout.preview.setActiveGizmo("scaling")}>
								Scaling <MenubarShortcut>CTRL+W</MenubarShortcut>
							</MenubarItem>

							<MenubarSeparator />

							<MenubarItem onClick={() => this.props.editor.layout.preview.focusObject()} className="w-60">
								Focus Selected Object <MenubarShortcut>CTRL+F</MenubarShortcut>
							</MenubarItem>

							<MenubarSeparator />

							<MenubarItem onClick={() => this.props.editor.layout.inspector.setEditedObject(this.props.editor.layout.preview.scene.activeCamera)}>
								Edit Camera
							</MenubarItem>

							<MenubarSeparator />

							<MenubarItem onClick={() => this.props.editor.layout.preview.play.triggerPlayScene()}>Play Scene</MenubarItem>
						</MenubarContent>
					</MenubarMenu>

					{/* Add */}
					<MenubarMenu>
						<MenubarTrigger>Add</MenubarTrigger>
						<MenubarContent className="border-black/50">
							{this._nodeCommands.map((command) => (
								<MenubarItem key={command.key} disabled={command.disabled} onClick={command.action}>
									{command.text}
								</MenubarItem>
							))}
							<MenubarSeparator />
							{this._meshCommands.map((command) => (
								<MenubarItem key={command.key} disabled={command.disabled} onClick={command.action}>
									{command.text}
								</MenubarItem>
							))}
							<MenubarSeparator />
							{this._lightCommands.map((command) => (
								<MenubarItem key={command.key} disabled={command.disabled} onClick={command.action}>
									{command.text}
								</MenubarItem>
							))}
							<MenubarSeparator />
							{this._cameraCommands.map((command) => (
								<MenubarItem key={command.key} disabled={command.disabled} onClick={command.action}>
									{command.text}
								</MenubarItem>
							))}
							<MenubarSeparator />
							{this._spriteCommands.map((command) => (
								<MenubarItem key={command.key} disabled={command.disabled} onClick={command.action}>
									{command.text}
								</MenubarItem>
							))}
						</MenubarContent>
					</MenubarMenu>

					{/* Window */}
					<MenubarMenu>
						<MenubarTrigger>Window</MenubarTrigger>
						<MenubarContent className="border-black/50">
							<MenubarItem onClick={() => this._handleOpenFXEditor()}>
								FX Editor...
							</MenubarItem>

							<MenubarSeparator />

							<MenubarItem onClick={() => ipcRenderer.send("window:minimize")}>
								Minimize <MenubarShortcut>CTRL+M</MenubarShortcut>
							</MenubarItem>
							<MenubarItem onClick={() => this.props.editor.close()}>
								Close <MenubarShortcut>CTRL+W</MenubarShortcut>
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>

					{/* Help */}
					<MenubarMenu>
						<MenubarTrigger>Help</MenubarTrigger>
						<MenubarContent className="border-black/50">
							<MenubarItem onClick={() => shell.openExternal("https://editor.babylonjs.com/documentation")}>Editor Documentation...</MenubarItem>
							<MenubarItem onClick={() => shell.openExternal("https://doc.babylonjs.com")}>Babylon.js Documentation...</MenubarItem>
							<MenubarSeparator />
							<MenubarItem onClick={() => shell.openExternal("https://forum.babylonjs.com")}>Babylon.js Forum...</MenubarItem>
							<MenubarSeparator />
							<MenubarItem onClick={() => shell.openExternal("https://forum.babylonjs.com/c/bugs")}>Report an Issue...</MenubarItem>
						</MenubarContent>
					</MenubarMenu>
				</Menubar>
			</ToolbarComponent>
		);
	}

	private async _handleOpenProject(): Promise<void> {
		const file = openSingleFileDialog({
			title: "Open Project",
			filters: [{ name: "Babylon.js Editor Project File", extensions: ["bjseditor"] }],
		});

		if (!file) {
			return;
		}

		const accept = await showConfirm("Are you sure?", "This will close the current project and open the selected one.");
		if (!accept) {
			return;
		}

		await this.props.editor.layout.preview.reset();
		await this.props.editor.openProject(file);
	}

	private async _handleOpenVisualStudioCode(): Promise<void> {
		if (!this.props.editor.state.projectPath) {
			return;
		}

		const p = await execNodePty(`code "${join(dirname(this.props.editor.state.projectPath), "/")}"`);
		await p.wait();
	}

	private _handleOpenFXEditor(): void {
		ipcRenderer.send("window:open", "build/src/editor/windows/fx-editor", {});
	}
}
