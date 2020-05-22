import { readJSON, readdir, writeJson, stat } from "fs-extra";
import { basename, join, extname } from "path";
import Zip from "adm-zip";

import { Undefinable } from "../../../../shared/types";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Dialog, Classes, Button, Tooltip, Position, Divider, Callout, Intent, ButtonGroup, Alignment, ProgressBar } from "@blueprintjs/core";

import { Icon } from "../../gui/icon";
import { Wizard } from "../../gui/wizard";
import { Overlay } from "../../gui/overlay";
import { Alert } from "../../gui/alert";

import { Tools } from "../../tools/tools";

import { Project } from "../project";
import { IWorkSpace } from "../typings";

import { WorkspaceWizard0, IWorkspaceTemplate } from "./wizard-workspace0";
import { WorkspaceWizard1 } from "./wizard-workspace1";
import { WorkSpace } from "../workspace";

export interface IWelcomeDialogProps {
    /**
     * Sets wether or not the dialog can be closed.
     */
    canClose: boolean;
}

export interface IWelcomeDialogState {
    /**
     * Defines a progress (in [0, 1]) of the downloading process.
     */
    downloadProgress?: Undefinable<number>;
}

export class WelcomeDialog extends React.Component<IWelcomeDialogProps, IWelcomeDialogState> {
    /**
     * Shows the welcome wizard.
     */
    public static Show(canClose: boolean): void {
        ReactDOM.render(<WelcomeDialog canClose={canClose} />, document.getElementById("BABYLON-EDITOR-OVERLAY"));
    }

    private _wizard0: WorkspaceWizard0;
    private _wizard1: WorkspaceWizard1;
    private _refHandler = {
        getWizard0: (ref: WorkspaceWizard0) => ref && (this._wizard0 = ref),
        getWizard1: (ref: WorkspaceWizard1) => ref && (this._wizard1 = ref),
    };

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IWelcomeDialogProps) {
        super(props);
        this.state = { };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        let wizard: React.ReactNode;
        
        if (!this.state.downloadProgress) {
            wizard = (
                <Wizard
                    key="wizard"
                    height={400}
                    onFinish={() => this._handleFinishWizard()}
                    steps={[{
                        title: "New Workspace",
                        element: <WorkspaceWizard0 ref={this._refHandler.getWizard0} />
                    }, {
                        title: "Workspace Settings",
                        element: <WorkspaceWizard1 ref={this._refHandler.getWizard1} />
                    }]}
                ></Wizard>
            );
        } else if (this.state.downloadProgress < 1) {
            wizard = (
                <>
                    <p>Downloading template... {(this.state.downloadProgress * 100).toFixed(0)}%</p>
                    <ProgressBar value={this.state.downloadProgress} />
                </>
            )
        } else {
            wizard = <p>Extracting...</p>
        }

        return (
            <Dialog
                key="welcome-wizard-dialog"
                isOpen={true}
                usePortal={true}
                canOutsideClickClose={false}
                canEscapeKeyClose={false}
                title="Welcome"
                icon={<Icon src="logo-babylon.svg" style={{ width: "32px", height: "32px", filter: "unset" }} />}
                className={Classes.DARK}
                enforceFocus={true}
                style={{ width: "1000px" }}
                onClose={() => this.props.canClose && this._handleClose()}
            >
                <div className={Classes.DIALOG_BODY}>
                    <Callout title="Open an existing project" icon="info-sign">
                        <ButtonGroup vertical={true} fill={true} alignText={Alignment.LEFT}>
                            <Button key="open-workspace" icon={<Icon src="workspace.svg" />} onClick={() => this._handleOpenWorkspace()}>Open Workspace...</Button>
                        </ButtonGroup>
                    </Callout>
                    <Divider />

                    <Callout title="Recent projects" intent={Intent.PRIMARY} icon="document-open">
                        {this._getRecentProjects() ?? <p><strong>No recent project.</strong></p>}
                    </Callout>
                    <Divider />

                    <Callout title="Create a new workspace" intent={Intent.SUCCESS} icon="new-object">
                        {wizard}
                    </Callout>
                </div>
            </Dialog>
        );
    }

    /**
     * Returns the list of all available projects.
     */
    private _getRecentProjects(): Undefinable<JSX.Element> {
        const data = JSON.parse(localStorage.getItem("babylonjs-editor-welcome") ?? "[]") as any[];
        if (!data.length) { return undefined; }
        
        return (
            <div style={{ width: "100%", height: "200px" }}>
                {data.map((d, index) => (
                    <div style={{ float: "left", width: "32%", height: "100%", marginLeft: `${index}%`, backgroundColor: "black", borderRadius: "15px" }}>
                        <strong style={{ marginLeft: "5px" }}>{basename(d.path)}</strong>
                        <Tooltip content={d.path} position={Position.BOTTOM} usePortal={false}>
                            <img src={d.preview} onDoubleClick={() => this._handleOpenRecentProject(d.path)} style={{ width: "100%", height: "100%", objectFit: "contain" }}></img>
                        </Tooltip>
                    </div>
                ))}
            </div>
        );
    }

    /**
     * Called on the user clicks on the "Ok" button or closes the dialog.
     */
    private _handleClose(): void {
        ReactDOM.unmountComponentAtNode(document.getElementById("BABYLON-EDITOR-OVERLAY") as Element);
    }

    /**
     * Called on the user wants to load a workspace.
     */
    private _handleOpenWorkspace(): void {
        WorkSpace.Browse();
    }

    /**
     * Called on the user wants to open a recent project.
     */
    private async _handleOpenRecentProject(path: string): Promise<void> {
        const extension = extname(path).toLowerCase();
        switch (extension) {
            case ".editorworkspace": await WorkSpace.SetOpeningWorkspace(path); break;
            case ".editorproject": await Project.SetOpeningProject(path); break;
            default: return;
        }

        window.location.reload();
    }

    /**
     * Called on the user finished the new project wizard.
     */
    private async _handleFinishWizard(): Promise<void> {
        const templateType = this._wizard0.state.selectedTemplate;
        if (templateType && templateType.name !== "Empty") {
            return this._downloadTemplate(templateType);
        }

        const path = await Tools.ShowSaveDialog();
        if (!(await this._isFolderEmpty(path))) {
            await Alert.Show("Can't Create Project.", "Can't create project. The destination folder must be empty.");
            return this._handleFinishWizard();
        }

        this._handleClose();
        Overlay.Show("Creating Project...", true);

        // Write project.
        const projectZipPath = join(Tools.GetAppPath(), `assets/project/workspace.zip`);
        const projectZip = new Zip(projectZipPath);
        await new Promise<void>((resolve, reject) => {
            projectZip.extractAllToAsync(path, false, (err) => err ? reject(err) : resolve());
        });

        // Configure workspace
        const workspacePath = join(path, "workspace.editorworkspace");
        await this._updateWorkspaceSettings(workspacePath);

        // Open project!
        await WorkSpace.SetOpeningWorkspace(workspacePath);
        window.location.reload();
    }

    /**
     * Downloads the tempalate.
     */
    private async _downloadTemplate(template: IWorkspaceTemplate): Promise<void> {
        // Get destination path.
        const path = await Tools.ShowSaveDialog();
        if (!(await this._isFolderEmpty(path))) {
            await Alert.Show("Can't Create Project.", "Can't create project. The destination folder must be empty.");
            return this._downloadTemplate(template);
        }

        // Download file
        this.setState({ downloadProgress: 0.001 });
        const contentBuffer = await Tools.LoadFile<ArrayBuffer>(`http://editor.babylonjs.com/templates/${template.file}?${Date.now()}`, true, (d) => {
            this.setState({ downloadProgress: (d.loaded / d.total) });
        });

        const zip = new Zip(Buffer.from(contentBuffer));
        await new Promise<void>((resolve, reject) => zip.extractAllToAsync(path, false, (err) => err ? reject(err) : resolve()));

        // Notify
        Overlay.Show("Creating Project...", true);

        // Open project!
        const filesList = await readdir(path);
        const workspaceFile = filesList.find((f) => extname(f).toLowerCase() === ".editorworkspace") ?? "workspace.editorworkspace";
        const workspacePath = join(path, workspaceFile);

        await this._updateWorkspaceSettings(workspacePath);

        await WorkSpace.SetOpeningWorkspace(join(path, workspaceFile));
        window.location.reload();
    }

    /**
     * Updates the workspace settings on 
     */
    private async _updateWorkspaceSettings(worksapcePath: string): Promise<void> {
        const workspace = await readJSON(worksapcePath, { encoding: "utf-8" }) as IWorkSpace;
        workspace.serverPort = this._wizard1.state.serverPort;
        workspace.watchProject = this._wizard1.state.watchWorkspaceWithWebPack;

        await writeJson(worksapcePath, workspace, {
            encoding: "utf-8",
            spaces: "\t",
        });
    }

    /**
     * Returns wether or not the folder is empty.
     */
    private async _isFolderEmpty(path: string): Promise<boolean> {
        const stats = await stat(path);
        if (!stats.isDirectory()) { return false; }

        const files = await readdir(path);
        return files.length === 0;
    }
}