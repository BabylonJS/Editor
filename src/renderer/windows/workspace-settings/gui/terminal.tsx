import { IPty } from "node-pty";

import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

export interface ITerminalComponentProps {
    /**
     * Defines the style to apply to the div element containing the terminal.
     */
    style: React.CSSProperties;
    /**
     * Defines the program to show its logs.
     */
    program: IPty;
}

export class TerminalComponent extends React.Component<ITerminalComponentProps> {
    private _terminal: Nullable<Terminal> = null;
    private _fitAddon: FitAddon = new FitAddon();

    private _terminalDiv: Nullable<HTMLDivElement> = null;
    private _refHandler = {
        getTerminalDiv: (ref: HTMLDivElement) => this._terminalDiv = ref,
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return <div ref={this._refHandler.getTerminalDiv} style={this.props.style}></div>;
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        if (!this._terminalDiv) { return; }

        // Create terminal
        const terminal = new Terminal({
            fontFamily: "Consolas, 'Courier New', monospace",
            fontSize: 12,
            fontWeight: "normal",
            cursorStyle: "block",
            cursorWidth: 1,
            drawBoldTextInBrightColors: true,
            fontWeightBold: "bold",
            letterSpacing: -4,
            lineHeight: 1,
            rendererType: "canvas",
            allowTransparency: true,
            theme: {
                background: "#222222",
            },
        });

        this.props.program.onData((e) => terminal.write(e));
        terminal.onResize(() => {
            this.props.program.resize(terminal.cols, terminal.rows);
        });
        terminal.loadAddon(this._fitAddon);
        terminal.open(this._terminalDiv);

        this._fitAddon.fit();
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        if (this._terminal) { this._terminal.dispose(); }
        if (this._fitAddon) { this._fitAddon.dispose(); }
    }
}
