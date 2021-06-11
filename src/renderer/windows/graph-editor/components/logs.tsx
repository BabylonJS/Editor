import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

import GraphEditorWindow from "../index";

export interface IConsoleProps {
    /**
     * Defines the reference to the editor's window main class.
     */
    editor: GraphEditorWindow;
}

export class Logs extends React.Component<IConsoleProps> {
    private _logsDiv: HTMLDivElement;
    private _refHandler = {
        getLogsDiv: (ref: HTMLDivElement) => this._logsDiv = ref,
    }

    private _terminal: Nullable<Terminal> = null;
    private _fitAddon: FitAddon = new FitAddon();
    
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IConsoleProps) {
        super(props);

        props.editor.logs = this;
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return <div ref={this._refHandler.getLogsDiv} style={{ width: "100%", height: "100%" }}></div>;
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
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
                background: "#222222",
            },
        });

        this._terminal.loadAddon(this._fitAddon);
        this._terminal.open(this._logsDiv);

        const log = console.log;
        console.log = (...args: any[]): void => {
            log.call(console, ...args);
            this.log(args);
        };

        this.resize();
    }

    /**
     * Called on the panel has been resized.
     */
    public resize(): void {
        setTimeout(() => {
            try { this._fitAddon.fit(); } catch (e) { /* Catch silently */ }
        }, 0);
    }

    /**
     * Clears the logs.
     */
    public clear(): void {
        this._terminal?.clear();
        this._terminal?.writeln("Ready.");
    }

    /**
     * Logs the given messages.
     * @param args defines all messages to log.
     */
    public log(...args: any[]): void {
        args.forEach((a) => {
            if (!a.toString) {
                return;
            }

            this._terminal?.writeln(a.toString());
        });
    }
}
