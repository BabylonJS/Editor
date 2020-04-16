import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes } from "@blueprintjs/core";

debugger;
import Pty from "node-pty";
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
    private _process: Nullable<Pty> = null;

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
        // Create process.
        // this._process = exec("cmd.exe", {
        //     cwd: WorkSpace.DirPath! ?? Project.DirPath!,
        // });
        debugger;
        this._process = Pty.spawn("COMSPEC", [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: WorkSpace.DirPath! ?? Project.DirPath!,
            env: process.env,
        });

        // this._process.stdout?.on("data", (d) => this._terminal?.write(d));

        // Create terminal
        this._terminal = new Terminal({
            fontSize: 12,
        });

        this._terminal.loadAddon(this._fitAddon);
        this._terminal.open(this._terminalDiv);

        this._fitAddon.fit();

        this._terminal.onData((d) => this._process?.stdin?.write(d));
        this._terminal.onResize((r) => this._process.resize(r.cols, r.rows));
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {
        // Empty for now...
        if (this._process) {
            this._process.unref();
            this._process.kill();
        }
    }
}
