import { shell } from "electron";
import { join, extname } from "path";
import { readdir, writeFile } from "fs-extra";

import * as React from "react";
import { ButtonGroup, Button, Popover, Position, Menu, MenuItem, MenuDivider, ContextMenu, Classes, Intent } from "@blueprintjs/core";

import { Undefinable } from "../../../shared/types";

import { AbstractMesh, Node, IParticleSystem } from "babylonjs";

import { Editor } from "../editor";

import { Tools } from "../tools/tools";
import { ExecTools } from "../tools/exec";

import { Icon } from "../gui/icon";
import { Confirm } from "../gui/confirm";
import { Overlay } from "../gui/overlay";
import { Alert } from "../gui/alert";
import { Dialog } from "../gui/dialog";

import { SceneFactory } from "../scene/factory";
import { SceneSettings } from "../scene/settings";

import { WorkSpace } from "../project/workspace";
import { ProjectExporter } from "../project/project-exporter";
import { WelcomeDialog } from "../project/welcome/welcome";
import { NewProjectWizard } from "../project/welcome/new-project";
import { ProjectRenamer } from "../project/rename";

import { PhotoshopExtension } from "../extensions/photoshop";

export interface IToolbarProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export interface IToolbarState {
    /**
     * Defines wether or not the current project has a workspace. If true, the workspace tool will be shows.
     */
    hasWorkspace: boolean;
    /**
     * Defines wether or not the photoshop extension is enabled.
     */
    isPhotoshopEnabled: boolean;
}

export class MainToolbar extends React.Component<IToolbarProps, IToolbarState> {
    private _editor: Editor;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IToolbarProps) {
        super(props);

        this._editor = props.editor;
        this._editor.mainToolbar = this;

        this.state = { hasWorkspace: false, isPhotoshopEnabled: false };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const project =
            <Menu>
                <MenuItem text="Open Workspace..." icon={<Icon src="workspace.svg" />} onClick={() => this._menuItemClicked("project:open-workspace")} />
                <MenuItem text="Reveal WorkSpace In File Explorer" disabled={!WorkSpace.HasWorkspace()} icon="document-open" onClick={() => this._menuItemClicked("project:open-worspace-file-explorer")} />
                <MenuDivider />
                <MenuItem text="Reload Project..." icon={<Icon src="undo.svg" />} onClick={() => this._menuItemClicked("project:reload")} />
                <MenuItem text="Save Project..." icon={<Icon src="copy.svg" />} onClick={() => this._menuItemClicked("project:save")} />
                <MenuItem text="Rename Project..." icon="edit" onClick={() => this._menuItemClicked("project:rename")} />
                <MenuDivider />
                <MenuItem text="Add New Project..." icon={<Icon src="plus.svg" />} onClick={() => NewProjectWizard.Show()} />
                <MenuItem text="Projects" icon="more">
                    <MenuItem text="Refresh..." icon={<Icon src="recycle.svg" />} onClick={() => this._handleRefreshWorkspace()} />
                    <MenuDivider />
                    {WorkSpace.AvailableProjects.map((p) => <MenuItem key={p} text={p} onClick={() => this._handleChangeProject(p)} />)}
                </MenuItem>
                <MenuDivider />
                <MenuItem text="Open Visual Studio Code..." icon={<Icon src="vscode.svg" style={{ filter: "none" }} />} onClick={() => this._handleOpenVSCode()} />
            </Menu>;
        const edit =
            <Menu>
                <MenuItem text="Undo" icon={<Icon src="undo.svg" />} onClick={() => this._menuItemClicked("edit:undo")} />
                <MenuItem text="Redo" icon={<Icon src="redo.svg" />} onClick={() => this._menuItemClicked("edit:redo")} />
                <MenuDivider />
                <MenuItem text="Editor Camera" icon={<Icon src="camera.svg" />} onClick={() => this._menuItemClicked("edit:editor-camera")} />
                <MenuDivider />
                <MenuItem text="Refresh Assets..." icon={<Icon src="recycle.svg" />} onClick={() => this._menuItemClicked("edit:refresh-assets")} />
                <MenuItem text="Reset Editor..." icon={<Icon src="recycle.svg" />} onClick={() => this._menuItemClicked("edit:reset")} />
                <MenuDivider />
                <MenuItem text="Preferences..." icon={<Icon src="wrench.svg" />} onClick={() => this._handleWorkspaceSettings()} />
            </Menu>;
        const view =
            <Menu>
                {/* <MenuItem text="Add Preview" icon={<Icon src="plus.svg" />} onClick={() => this._menuItemClicked("view:add-preview")} /> */}
                <MenuItem text="Enable Post-Processes" icon={this._getCheckedIcon(this._editor.scene?.postProcessesEnabled)} onClick={() => this._menuItemClicked("view:pp-enabled")} />
                <MenuItem text="Enable Fog" icon={this._getCheckedIcon(this._editor.scene?.fogEnabled)} onClick={() => this._menuItemClicked("view:fog-enabled")} />
                <MenuDivider />
                <MenuItem text="Create ScreenShot..." icon={<Icon src="eye.svg" />} onClick={() => this._menuItemClicked("view:create-screenshot")} />
                <MenuDivider />
                <MenuItem text="Console" icon={<Icon src="info.svg" />} onClick={() => this._menuItemClicked("view:console")} />
                <MenuItem text="Terminal" icon={<Icon src="terminal.svg" />} onClick={() => this._menuItemClicked("view:terminal")} />
            </Menu>;
        const add =
            <Menu>
                <MenuItem text="Point Light" icon={<Icon src="lightbulb.svg" />} onClick={() => this._menuItemClicked("add:pointlight")} />
                <MenuItem text="Directional Light" icon={<Icon src="lightbulb.svg" />} onClick={() => this._menuItemClicked("add:directional-light")} />
                <MenuItem text="Spot Light" icon={<Icon src="lightbulb.svg" />} onClick={() => this._menuItemClicked("add:spot-light")} />
                <MenuDivider />
                <MenuItem text="Free Camera" icon={<Icon src="camera.svg" />} onClick={() => this._menuItemClicked("add:camera")} />
                <MenuItem text="Arc Rotate Camera" icon={<Icon src="camera.svg" />} onClick={() => this._menuItemClicked("add:arc-rotate-camera")} />
                <MenuDivider />
                <MenuItem text="Sky" icon={<Icon src="smog.svg" />} onClick={() => this._menuItemClicked("add:sky")} />
                <MenuDivider />
                <MenuItem text="Dummy Node" icon={<Icon src="clone.svg" />} onClick={() => this._menuItemClicked("add:dummy")} />
                <MenuDivider />
                <MenuItem text="Particle System" icon={<Icon src="wind.svg" />} onClick={() => this._menuItemClicked("add:particle-system")} />
            </Menu>;
        const addMesh =
            <Menu>
                <MenuItem text="Cube" icon={<Icon src="cube.svg" />} onClick={() => this._menuItemClicked("addmesh:cube")} />
                <MenuItem text="Sphere" icon={<Icon src="circle.svg" />} onClick={() => this._menuItemClicked("addmesh:sphere")} />
                <MenuItem text="Cylinder" icon={<Icon src="cylinder.svg" />} onClick={() => this._menuItemClicked("addmesh:cylinder")} />
                <MenuItem text="Plane" icon={<Icon src="square-full.svg" />} onClick={() => this._menuItemClicked("addmesh:plane")} />
                <MenuDivider />
                <MenuItem text="Ground" icon={<Icon src="vector-square.svg" />} onClick={() => this._menuItemClicked("addmesh:ground")} />
                <MenuItem text="Terrain From Height Map..." icon={<Icon src="terrain.svg" style={{ filter: "none" }} />} onClick={() => this._menuItemClicked("addmesh:heightmap")} />
            </Menu>;

        const tools =
            <Menu>
                <MenuItem text="Connect To Photoshop" intent={this.state.isPhotoshopEnabled ? Intent.SUCCESS : Intent.NONE} icon={<Icon src="photoshop.svg" style={{ filter: "none" }} />} onClick={() => this._menuItemClicked("tools:photoshop")} />
            </Menu>;

        const help =
            <Menu>
                <MenuItem text="Documentation..." icon={<Icon src="internetarchive.svg" />} onClick={() => this._menuItemClicked("help:documentation")} />
                <MenuItem text="Report issue..." icon={<Icon src="github.svg" />} onClick={() => this._menuItemClicked("help:report")} />
                <MenuDivider />
                <MenuItem text="Welcome..." icon={<Icon src="jedi.svg" />} onClick={() => this._menuItemClicked("help:welcome")} />
            </Menu>

        return (
            <ButtonGroup large={false} style={{ marginTop: "auto", marginBottom: "auto" }}>
                <Popover content={project} position={Position.BOTTOM_LEFT}>
                    <Button icon={<Icon src="folder-open.svg"/>} rightIcon="caret-down" text="File"/>
                </Popover>
                <Popover content={edit} position={Position.BOTTOM_LEFT}>
                    <Button icon={<Icon src="edit.svg"/>} rightIcon="caret-down" text="Edit"/>
                </Popover>
                <Popover content={view} position={Position.BOTTOM_LEFT}>
                    <Button icon={<Icon src="eye.svg"/>} rightIcon="caret-down" text="View"/>
                </Popover>
                <Popover content={add} position={Position.BOTTOM_LEFT}>
                    <Button icon={<Icon src="plus.svg"/>} rightIcon="caret-down" text="Add"/>
                </Popover>
                <Popover content={addMesh} position={Position.BOTTOM_LEFT}>
                    <Button icon={<Icon src="plus.svg"/>} rightIcon="caret-down" text="Add Mesh"/>
                </Popover>
                <Popover content={tools} position={Position.BOTTOM_LEFT}>
                    <Button icon={<Icon src="wrench.svg"/>} rightIcon="caret-down" text="Tools"/>
                </Popover>
                <Popover content={help} position={Position.BOTTOM_LEFT}>
                    <Button icon={<Icon src="dog.svg"/>} rightIcon="caret-down" text="Help"/>
                </Popover>
            </ButtonGroup>
        );
    }

    /**
     * Returns the check icon if the given "checked" property is true.
     */
    private _getCheckedIcon(checked: Undefinable<boolean>): Undefinable<JSX.Element> {
        return checked ? <Icon src="check.svg" /> : undefined;
    }

    /**
     * Called on a menu item is clicked.
     */
    private async _menuItemClicked(id: string): Promise<void> {
        // Get event family
        const split = id.split(":");
        const family = split[0];
        const action = split[1];

        // Common id.
        switch (id) {
            // Project
            case "project:open-workspace": WorkSpace.Browse(); break;
            case "project:open-worspace-file-explorer": shell.openItem(WorkSpace.DirPath!); break;

            case "project:reload": this._reloadProject(); break;
            case "project:save": ProjectExporter.Save(this._editor); break;
            case "project:rename": ProjectRenamer.Rename(this._editor); break;

            // Edit
            case "edit:editor-camera": this._editor.inspector.setSelectedObject(SceneSettings.Camera); break;

            case "edit:refresh-assets": this._editor.assets.forceRefresh(); break;
            case "edit:reset": this._editor._resetEditor(); break;

            // Help
            case "help:documentation": this._editor.addPlugin("doc"); break;
            case "help:report": shell.openExternal("https://github.com/BabylonJS/Editor/issues"); break;
            case "help:welcome": WelcomeDialog.Show(true); break;

            default: break;
        }

        // View
        if (family === "view") {
            switch (action) {
                // case "add-preview": this._editor.addPreview(); break;
                case "pp-enabled": this._editor.scene!.postProcessesEnabled = !this._editor.scene!.postProcessesEnabled; break;
                case "fog-enabled": this._editor.scene!.fogEnabled = !this._editor.scene!.fogEnabled; break;

                case "create-screenshot": this._handleCreateScreenshot(); break;

                case "console": this._editor.revealPanel("console"); break;
                case "terminal": this._editor.addPlugin("terminal");
                default: break;
            }

            this.forceUpdate();
            this._editor.inspector.refreshDisplay();
        }

        // Add
        if (family === "add") {
            let node: Undefinable<Node | IParticleSystem>;

            switch (action) {
                case "pointlight": node = SceneFactory.AddPointLight(this._editor); break;
                case "directional-light": node = SceneFactory.AddDirectionalLight(this._editor); break;
                case "spot-light": node = SceneFactory.AddSpotLight(this._editor); break;

                case "camera": node = SceneFactory.AddFreeCamera(this._editor); break;
                case "arc-rotate-camera": node = SceneFactory.AddArcRotateCamera(this._editor); break;

                case "sky": node = SceneFactory.AddSky(this._editor); break;

                case "dummy": node = SceneFactory.AddDummy(this._editor); break;

                case "particle-system": node = SceneFactory.AddParticleSystem(this._editor, false); break;
                default: break;
            }

            if (!node) { return; }

            if (node instanceof Node) {
                this._editor.addedNodeObservable.notifyObservers(node);
            } else {
                this._editor.addedParticleSystemObservable.notifyObservers(node);
            }
            return this._editor.graph.refresh();
        }

        // Add mesh
        if (family === "addmesh") {
            let mesh: Undefinable<AbstractMesh>;

            switch (action) {
                case "cube": mesh = SceneFactory.AddCube(this._editor); break;
                case "sphere": mesh = SceneFactory.AddSphere(this._editor); break;
                case "cylinder": mesh = SceneFactory.AddCynlinder(this._editor); break;
                case "plane": mesh = SceneFactory.AddPlane(this._editor); break;

                case "ground": mesh = SceneFactory.AddGround(this._editor); break;
                case "heightmap": mesh = await SceneFactory.AddTerrainFromHeightMap(this._editor); break;
                default: break;
            }

            if (!mesh) { return; }

            this._editor.addedNodeObservable.notifyObservers(mesh);
            return this._editor.graph.refresh();
        }

        // Tools
        if (family === "tools") {
            switch (action) {
                case "photoshop": this._handleTogglePhotoshop(); break;
            }
        }
    }

    /**
     * Called on the user wants to reload the project.
     */
    private async _reloadProject(): Promise<void> {
        if (await Confirm.Show("Reload project?", "Are you sure to reload?")) {
            Overlay.Show("Reloading...", true);
            window.location.reload();
        }
    }

    /**
     * Called on the user wants to toggle the connection to photoshop.
     */
    private async _handleTogglePhotoshop(): Promise<void> {
        let password = "";
        if (!PhotoshopExtension.IsEnabled) {
            password = await Dialog.Show("Connect to Photoshop", "Please provide the password to connect to photoshop", undefined, true);
        }
        
        await PhotoshopExtension.ToggleEnabled(this._editor, password);
        this.setState({ isPhotoshopEnabled: PhotoshopExtension.IsEnabled });
    }

    /**
     * Called on the user wants to refresh the available projects in the workspace.
     */
    private async _handleRefreshWorkspace(): Promise<void> {
        await WorkSpace.RefreshAvailableProjects();
        this.forceUpdate();
    }

    /**
     * Called on the user wants to show the workspace settings.
     */
    private async _handleWorkspaceSettings(): Promise<void> {
        const popupId = await this._editor.addWindowedPlugin("workspace-settings", undefined, WorkSpace.Path);
        if (!popupId) { return; }
    }

    /**
     * Called on the user wants to open VSCode.
     */
    private async _handleOpenVSCode(): Promise<void> {
        try {
            await ExecTools.ExecAndGetProgram(this._editor, `code "${WorkSpace.DirPath!}"`, undefined, true).promise;
        } catch (e) {
            Alert.Show("Failed to open VSCode", `
                Failed to open Visual Studio Code. Please ensure the command named "code" is available in the "PATH" environment. 
                You can add the command by opening VSCode, type "Command or Control + Shift + P" and find the command "Shell Command : Install code in PATH".
            `);
        }
    }

    /**
     * Called on the user wants to change the current project.
     */
    private async _handleChangeProject(name: string): Promise<void> {
        if (!(await Confirm.Show("Load project?", "Are you sure to close the current project?"))) { return; }

        const projectFolder = join(WorkSpace.DirPath!, "projects", name);
        const files = await readdir(projectFolder);

        let projectFileName: Undefinable<string> = "scene.editorproject";
        if (files.indexOf(projectFileName) === -1) {
            projectFileName = files.find((f) => extname(f).toLowerCase() === ".editorproject");
        }

        if (!projectFileName) { return; }
        await WorkSpace.WriteWorkspaceFile(join(projectFolder, projectFileName));
        window.location.reload();
    }

    /**
     * Called on the user wants to create a screenshot.
     */
    private async _handleCreateScreenshot(): Promise<void> {
        const b64 = await Tools.CreateScreenshot(this._editor.engine!, this._editor.scene!.activeCamera!);
        const img = (
            <img
                src={b64}
                style={{ objectFit: "contain", width: "100%", height: "100%" }}
                onContextMenu={(e) => {
                    ContextMenu.show(
                        <Menu className={Classes.DARK}>
                            <MenuItem text="Save..." icon={<Icon src="save.svg" />} onClick={async () => {
                                let destination = await Tools.ShowSaveFileDialog("Save Screenshot");

                                const extension = extname(destination);
                                if (extension !== ".png") { destination += ".png"; }

                                const base64 = b64.split(",")[1];
                                await writeFile(destination, new Buffer(base64, "base64"));
                                this._editor.notifyMessage("Successfully saved screenshot.", 1000, "saved");
                            }} />
                        </Menu>,
                        { left: e.clientX, top: e.clientY }
                    );
                }}
            ></img>
        );
        Alert.Show("Screenshot", "Result:", <Icon src="eye.svg" />, img);
    }
}
