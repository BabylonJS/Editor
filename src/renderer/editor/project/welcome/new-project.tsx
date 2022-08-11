import { join } from "path";
import { pathExists, mkdir, writeJSON } from "fs-extra";
import Zip from "adm-zip";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Dialog, Classes } from "@blueprintjs/core";

import { Wizard } from "../../gui/wizard";
import { Confirm } from "../../gui/confirm";
import { Icon } from "../../gui/icon";

import { AppTools } from "../../tools/app";

import { Editor } from "../../editor";

import { Wizard0 } from "./wizard-project0";
// import { Wizard1 } from "./wizard-project1";
import { Wizard2 } from "./wizard-project2";

import { WorkSpace } from "../workspace";

export interface INewProjectWizardProps {
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
}

export class NewProjectWizard extends React.Component<INewProjectWizardProps> {
    /**
     * Shows the welcome wizard.
     * @param editor defines the reference to the editor.
     */
    public static Show(editor: Editor): void {
        ReactDOM.render(<NewProjectWizard editor={editor} />, document.getElementById("BABYLON-EDITOR-OVERLAY"));
    }

    // private _wizard1: Wizard1;
    private _wizard2: Wizard2;
    private _refHandler = {
        // getWizardStep1: (ref: Wizard1) => ref && (this._wizard1 = ref),
        getWizardStep2: (ref: Wizard2) => ref && (this._wizard2 = ref),
    };

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <Dialog
                key="welcome-wizard-dialog"
                isOpen={true}
                usePortal={true}
                title="Welcome"
                icon={<Icon src="logo-babylon.svg" style={{ width: "32px", height: "32px", filter: "unset" }} />}
                className={Classes.DARK}
                enforceFocus={true}
                style={{ width: "1000px" }}
                onClose={() => this._handleClose()}
            >
                <div className={Classes.DIALOG_BODY}>
                    <Wizard
                        key="wizard"
                        height={400}
                        onFinish={() => this._handleFinishWizard()}
                        steps={[{
                            title: "New project wizard",
                            element: <Wizard0 />
                        }, /* {
                            title: "New project type",
                            element: <Wizard1 ref={this._refHandler.getWizardStep1} />
                        }, */ {
                            title: "New project name",
                            element: <Wizard2 ref={this._refHandler.getWizardStep2} />
                        }]}
                    ></Wizard>
                </div>
            </Dialog>
        );
    }

    /**
     * Called on the user clicks on the "Ok" button or closes the dialog.
     */
    private _handleClose(): void {
        ReactDOM.unmountComponentAtNode(document.getElementById("BABYLON-EDITOR-OVERLAY") as Element);
    }

    /**
     * Called on the user finished the new project wizard.
     */
    private async _handleFinishWizard(): Promise<void> {
        const name = this._wizard2.state.projectName;

        // Get destination
        const dest = join(WorkSpace.DirPath!, "projects", name);
        if (await pathExists(dest)) { return; }
        await mkdir(dest);

        // Write project.
        const sceneZipPath = join(AppTools.GetAppPath(), `assets/project/add-project.zip`);
        const sceneZip = new Zip(sceneZipPath);

        await new Promise<void>((resolve, reject) => {
            sceneZip.extractAllToAsync(dest, false, (err) => err ? reject(err) : resolve());
        });

        // Write src project
        const srcDest = join(WorkSpace.DirPath!, "src/scenes/", name);
        if (!(await pathExists(srcDest))) { await mkdir(srcDest); }

        // Write .scene file
        await writeJSON(join(this.props.editor.assetsBrowser._files!.state.currentDirectory, `${name}.scene`), {
            createdAt: new Date(Date.now()).toDateString(),
        }, {
            spaces: "\t",
            encoding: "utf-8",
        });
        await this.props.editor.assetsBrowser.refresh();

        this._handleClose();
        if (!(await Confirm.Show("Load new project?", "Do you want to load the new created project?"))) { return; }

        // Upate workspace
        await WorkSpace.WriteWorkspaceFile(join(dest, "scene.editorproject"));
        window.location.reload();
    }
}
