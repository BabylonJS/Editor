import { dirname, join } from "path/posix";
import { ipcRenderer, shell } from "electron";

import { Component, ReactNode } from "react";

import {
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarItem,
	MenubarLabel,
	MenubarMenu,
	MenubarSeparator,
	MenubarShortcut,
	MenubarSub,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarTrigger,
} from "../../ui/shadcn/ui/menubar";

import { isDarwin } from "../../tools/os";
import { execNodePty } from "../../tools/node-pty";
import { openSingleFileDialog } from "../../tools/dialog";
import { saveSceneScreenshot } from "../../tools/scene/screenshot";

import { showConfirm } from "../../ui/dialog";
import { Button } from "../../ui/shadcn/ui/button";
import { ToolbarComponent } from "../../ui/toolbar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/shadcn/ui/tooltip";

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

import { EditorAssistantIcon } from "./assistant/icon";
import { EditorMarketplaceBrowser } from "./marketplace";

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
		ipcRenderer.on("editor:toggle-marketplace", () => this._handleToggleMarketplace());

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

				{/* Without the toolbar, the button of the assistant lives in the title bar. */}
				{isDarwin() && !process.env.DEBUG && this.props.editor.state.enableExperimentalFeatures && (
					<div className="absolute top-0 right-0 flex items-center h-10 pr-2 z-[9999] electron-no-drag">{this._getAssistantButton()}</div>
				)}

				{(!isDarwin() || process.env.DEBUG) && this._getToolbar()}
			</>
		);
	}

	private _getAssistantButton(): ReactNode {
		const { assistantOpen: open, assistantWorkState: workState } = this.props.editor.state;

		return (
			<TooltipProvider delayDuration={0}>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							data-active={open || workState !== "idle"}
							className={`assistant-button h-8 gap-2 px-2 ${open ? "bg-primary/20 hover:bg-primary/30" : "hover:bg-muted"}`}
							onClick={() => this.props.editor.setAssistantOpen(!this.props.editor.state.assistantOpen)}
						>
							<span className="assistant-button-glow" />
							<EditorAssistantIcon workState={workState} size={20} />
							<span className="text-sm">AI Assistant</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>{this._getAssistantTooltip()}</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	private _getAssistantTooltip(): string {
		switch (this.props.editor.state.assistantWorkState) {
			case "working":
				return "The AI assistant is working...";
			case "waiting":
				return "The AI assistant needs your input";
			default:
				return this.props.editor.state.assistantOpen ? "Hide the AI assistant" : "Ask Claude to build your scene and add assets to your project";
		}
	}

	private _getToolbar(): ReactNode {
		return (
			<ToolbarComponent right={this.props.editor.state.enableExperimentalFeatures && this._getAssistantButton()}>
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

							<MenubarSeparator />

							<MenubarItem onClick={() => exportProject(this.props.editor, { optimize: false, debugMode: false })}>
								Generate Current Scene <MenubarShortcut>CTRL+G</MenubarShortcut>
							</MenubarItem>
							<MenubarItem onClick={() => this.props.editor.setState({ generateProject: true })}>Generate All Scenes and Assets...</MenubarItem>

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

							<MenubarSub>
								<MenubarSubTrigger>Screenshot</MenubarSubTrigger>
								<MenubarSubContent className="w-52">
									<MenubarLabel className="text-muted-foreground">Landscape</MenubarLabel>
									<MenubarItem onClick={() => saveSceneScreenshot(this.props.editor.layout.preview.scene, { width: 1280, height: 720 })}>
										720p <MenubarShortcut>(1280x720)</MenubarShortcut>
									</MenubarItem>
									<MenubarItem onClick={() => saveSceneScreenshot(this.props.editor.layout.preview.scene, { width: 1920, height: 1080 })}>
										1080p <MenubarShortcut>(1920x1080)</MenubarShortcut>
									</MenubarItem>
									<MenubarItem onClick={() => saveSceneScreenshot(this.props.editor.layout.preview.scene, { width: 3840, height: 2160 })}>
										4K <MenubarShortcut>(3840x2160)</MenubarShortcut>
									</MenubarItem>
									<MenubarLabel className="text-muted-foreground">Square</MenubarLabel>
									<MenubarItem onClick={() => saveSceneScreenshot(this.props.editor.layout.preview.scene, { width: 512, height: 512 })}>512x512</MenubarItem>
									<MenubarItem onClick={() => saveSceneScreenshot(this.props.editor.layout.preview.scene, { width: 1024, height: 1024 })}>1024x1024</MenubarItem>
									<MenubarItem onClick={() => saveSceneScreenshot(this.props.editor.layout.preview.scene, { width: 2048, height: 2048 })}>2048x2048</MenubarItem>
									<MenubarItem onClick={() => saveSceneScreenshot(this.props.editor.layout.preview.scene, { width: 4096, height: 4096 })}>4096x4096</MenubarItem>
								</MenubarSubContent>
							</MenubarSub>

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

					{/* View */}
					<MenubarMenu>
						<MenubarTrigger>Views</MenubarTrigger>
						<MenubarContent className="border-black/50">
							<MenubarCheckboxItem checked={this.props.editor.state.openedTabs.includes("marketplace")} onClick={() => this._handleToggleMarketplace()}>
								Marketplace
							</MenubarCheckboxItem>
							{this.props.editor.state.enableExperimentalFeatures && (
								<MenubarCheckboxItem
									checked={this.props.editor.state.assistantOpen}
									onClick={() => this.props.editor.setAssistantOpen(!this.props.editor.state.assistantOpen)}
								>
									AI Assistant
								</MenubarCheckboxItem>
							)}
						</MenubarContent>
					</MenubarMenu>

					{/* Window */}
					<MenubarMenu>
						<MenubarTrigger>Window</MenubarTrigger>
						<MenubarContent className="border-black/50">
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

	private _handleToggleMarketplace(): void {
		if (this.props.editor.state.openedTabs.includes("marketplace")) {
			return this.props.editor.layout.removeLayoutTab("marketplace");
		}

		this.props.editor.layout.addLayoutTab(<EditorMarketplaceBrowser editor={this.props.editor} ref={(r) => (this.props.editor.layout.marketplace = r)} />, {
			id: "marketplace",
			title: "Marketplace",
			enableClose: true,
			setAsActiveTab: true,
			neighborId: "assets-browser",
		});
	}
}
