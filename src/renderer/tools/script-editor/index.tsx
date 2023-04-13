import { join } from "path";
import { readFile, writeFile } from "fs-extra";

import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Button, ButtonGroup, Divider } from "@blueprintjs/core";

import { Code } from "../../editor/gui/code";
import { Icon } from "../../editor/gui/icon";

import { JSTools } from "../../editor/tools/js";
import { AppTools } from "../../editor/tools/app";
import { AbstractEditorPlugin, IEditorPluginProps } from "../../editor/tools/plugin";

export const title = "Script Editor";

export interface IScriptEditorPlugin {
    /**
     * Defines wether or not the plugin is ready.
     */
    isReady: boolean;

    /**
     * Defines wether or not the document has been changed and should be saved.
     */
    shouldSave: boolean;
}

export default class ScriptEditorPlugin extends AbstractEditorPlugin<IScriptEditorPlugin> {
    private _codeRef: Nullable<Code> = null;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IEditorPluginProps) {
        super(props);

        // State
        this.state = {
            shouldSave: false,
            isReady: this.editor.isInitialized,
        };

        // Register
        if (!this.editor.isInitialized) {
            this.editor.editorInitializedObservable.addOnce(() => {
                this.setState({ isReady: true });
            });
        }
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (!this.state.isReady) {
            return false;
        }

        return (
            <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                <div
                    style={{
                        width: "100%",
                        height: "30px",
                        background: "#333333",
                    }}
                >
                    <ButtonGroup>
                        <Button small={true} icon={<Icon src="copy.svg" />} text="Save" onClick={() => this._handleSave()} />
                        <Divider />
                        <Button small={true} icon={<Icon src="terminal.svg" />} text="Execute" onClick={() => this._handleExecuteScript()} />
                    </ButtonGroup>
                </div>
                <Code
                    code=""
                    language="javascript"
                    ref={(r) => this._codeRef = r}
                    style={{
                        width: "100%",
                        height: "calc(100% - 30px)",
                    }}
                />
            </div>
        );
    }

    /**
     * Called on the plugin is ready.
     */
    public async onReady(): Promise<void> {
        if (!this.editor.isProjectReady) {
            return this.editor.closePlugin(title);
        }

        if (!this._codeRef) {
            return;
        }

        try {
            const content = await readFile(this.props.openParameters?.path, { encoding: "utf-8" });
            this._codeRef.editor?.setValue(content);
        } catch (e) {
            return this.editor.closePlugin(title);
        }

        this._codeRef.editor?.onDidChangeModelContent(() => {
            this.setState({ shouldSave: true });
        });

        const typings = await readFile(join(AppTools.GetAppPath(), "module/index.d.ts"), { encoding: "utf-8" });
        window.monaco?.languages.typescript.javascriptDefaults.addExtraLib(typings, "babylonjs-editor");
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {
        // ...
    }

    /**
     * Called on the user clicks on the save button.
     */
    private async _handleSave(): Promise<void> {
        const path = this.props.openParameters?.path;
        if (!path) {
            return;
        }

        const value = this._codeRef?.editor?.getValue() ?? null;
        if (value === null) {
            return;
        }

        try {
            await writeFile(path, value, { encoding: "utf-8" });

            this.setState({ shouldSave: false });
            this.editor.notifyMessage("Successfully saved script", 2000);
        } catch (e) {
            if (e.message) {
                this.editor.console.logError(e.message);
            }

            this.editor.notifyMessage("Failed to save script. See console for more information.", 2000, undefined, "danger");
        }
    }

    /**
     * Called on the user wants to execute the script in the context of the editor.
     */
    private async _handleExecuteScript(): Promise<void> {
        const path = this.props.openParameters?.path;
        if (!path) {
            return;
        }

        await this._handleSave();
        await JSTools.ExecuteInEditorContext(this.editor, path);
    }
}
