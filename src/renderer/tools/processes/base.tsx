import { Nullable } from "../../../shared/types";

import * as React from "react";

import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';

import { AbstractEditorPlugin } from "../../editor/tools/plugin";

export abstract class AbstractProcessPlugin extends AbstractEditorPlugin<{}> {
    /**
     * Defines the reference to the terminal.
     */
    protected abstract terminal: Nullable<Terminal>;

    private _fitAddon: FitAddon = new FitAddon();
    private _terminalDiv: Nullable<HTMLDivElement> = null;

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div
                key="terminal"
                ref={(r) => this._terminalDiv = r}
                style={{ width: "100%", height: "100%", background: "black", overflow: "hidden" }}
            ></div>
        );
    }

    /**
     * Called on the plugin is ready.
     */
    public onReady(): void {
        if (this.editor.isInitialized) {
            return this._createTerminal();
        }

        this.editor.editorInitializedObservable.addOnce(() => this._createTerminal());
    }

    /**
     * Called on the panel has been resized.
     */
    public resize(): void {
        requestAnimationFrame(() => {
            this._resizeTerminal();
        });
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {
        this._fitAddon.dispose();
    }

    /**
     * Called on the plugin was previously hidden and is now shown.
     */
    public onShow(): void {
        super.onShow();
        this.resize();
    }

    /**
     * Creats the terminal.
     */
    private _createTerminal(): void {
        if (!this._terminalDiv || !this.terminal) {
            return;
        }

        this.terminal.loadAddon(this._fitAddon);
        this.terminal.open(this._terminalDiv);

        this._resizeTerminal();
    }

    /**
     * Resizes the terminal.
     */
    private _resizeTerminal(): void {
        try {
            this._fitAddon.fit();
        } catch (e) {
            // Catch silently.
        }
    }
}
