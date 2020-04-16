import { join } from "path";
import { pathExists, mkdir } from "fs-extra";
import Zip from "adm-zip";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Dialog, Classes } from "@blueprintjs/core";

import { Wizard } from "../../gui/wizard";
import { Confirm } from "../../gui/confirm";
import { Icon } from "../../gui/icon";

import { Tools } from "../../tools/tools";

import { Wizard0 } from "./wizard-project0";
import { Wizard1 } from "./wizard-project1";
import { Wizard2 } from "./wizard-project2";

import { WorkSpace } from "../workspace";

export class NewProjectWizard extends React.Component {
    /**
     * Shows the welcome wizard.
     */
    public static Show(): void {
        ReactDOM.render(<NewProjectWizard />, document.getElementById("BABYLON-EDITOR-OVERLAY"));
    }

    private _wizard1: Wizard1;
    private _wizard2: Wizard2;
    private _refHandler = {
        getWizardStep1: (ref: Wizard1) => ref && (this._wizard1 = ref),
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
                        }, {
                            title: "New project type",
                            element: <Wizard1 ref={this._refHandler.getWizardStep1} />
                        }, {
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
        const type = this._wizard1.state.projectType;
        const name = this._wizard2.state.projectName;

        // Get destination
        const dest = join(WorkSpace.DirPath!, "projects", name);
        if (await pathExists(dest)) { return; }
        await mkdir(dest);

        // Write project.
        const sceneZipPath = join(Tools.GetAppPath(), `assets/wizard/${type.toLowerCase()}.zip`);
        const sceneZip = new Zip(sceneZipPath);

        await new Promise<void>((resolve, reject) => {
            sceneZip.extractAllToAsync(dest, false, (err) => err ? reject(err) : resolve());
        });

        this._handleClose();
        if (!(await Confirm.Show("Load new project?", "Do you want to load the new created project?"))) { return; }

        // Upate workspace
        await WorkSpace.WriteWorkspaceFile(join(dest, "scene.editorproject"));
        window.location.reload();
    }
}
