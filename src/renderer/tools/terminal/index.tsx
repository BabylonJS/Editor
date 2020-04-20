import * as os from "os";

import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes } from "@blueprintjs/core";

import { spawn, IPty } from "node-pty";
import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';

import { AbstractEditorPlugin } from "../../editor/tools/plugin";

import { WorkSpace } from "../../editor/project/workspace";
import { Project } from "../../editor/project/project";

export const title = "Terminal";

export default class TerminalPlugin extends AbstractEditorPlugin<{ }> {
    private _terminalDiv: HTMLDivElement;
    private _refHandler = {
        getTerminalDiv: (ref: HTMLDivElement) => this._terminalDiv = ref,
    };

    private _terminal: Nullable<Terminal> = null;
    private _process: Nullable<IPty> = null;

    private _fitAddon: FitAddon = new FitAddon();

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return <div ref={this._refHandler.getTerminalDiv} className={Classes.FILL} key="terminal" style={{ width: "100%", height: "100%" }}></div>;
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
        setTimeout(() => {
            this._resizeTerminal();
            this._resizeProcess();
        }, 0);
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {
        this._process?.write(`exit\r`);
        if (this._terminal) { this._terminal.dispose(); }
        if (this._process) { this._process.kill(); }

        this._terminal = null;
        this._process = null;
    }

    /**
     * Creats the terminal.
     */
    private _createTerminal(): void {
        // Create process.
        const shell = this.editor.getPreferences().terminalPath ?? process.env[os.platform() === "win32" ? "COMSPEC" : "SHELL"];
        if (!shell) { return; }

        this._process = spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: WorkSpace.DirPath! ?? Project.DirPath!,
        });

        // Create terminal
        this._terminal = new Terminal({
            fontFamily: "Consolas, 'Courier New', monospace",
            fontSize: 12,
            fontWeight: "normal",
            cursorStyle: "block",
            cursorWidth: 1,
            drawBoldTextInBrightColors: true,
            fontWeightBold: "bold",
            letterSpacing: -4,
            cols: 80,
            lineHeight: 1,
            rendererType: "canvas",
            allowTransparency: true,
            theme: {
                background: "#111111"
            },
        });

        this._terminal.loadAddon(this._fitAddon);
        this._terminal.open(this._terminalDiv);

        this._resizeTerminal();
        this._resizeProcess();

        // Events
        this._terminal.onData((d) => this._process?.write(d));
        this._terminal.onResize((r) => this._process?.resize(r.cols, r.rows));

        this._process.onData((e) => this._terminal?.write(e));
        this._process.onExit(() => this.editor.closePlugin(title));
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

    /**
     * Resizes the process (conpty)
     */
    private _resizeProcess(): void {
        if (!this._terminal || !this._process) { return; }

        try {
            this._process.resize(this._terminal.cols, this._terminal.rows);
        } catch (e) {
            // Catch silently
        }
    }
}
