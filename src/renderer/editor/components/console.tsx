import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';
import chalk from "chalk";

import { Editor } from "../editor";

export enum ConsoleLogType {
    /**
     * Just for information.
     */
    Info = 0,
    /**
     * Shows a warning.
     */
    Warning,
    /**
     * Shows an error.
     */
    Error,
    /**
     * Just adds a message in its raw form.
     */
    Raw,
}

export interface IConsoleProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export interface IConsoleState {

}

export interface IConsoleLog {
    /**
     * The type of the message.
     */
    type: ConsoleLogType;
    /**
     * The message in the log.
     */
    message: string;
}

export class Console extends React.Component<IConsoleProps, IConsoleState> {
    private _terminal: Nullable<Terminal> = null;
    private _fitAddon: FitAddon = new FitAddon();

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IConsoleProps) {
        super(props);

        props.editor.console = this;
        this.state = { };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return <div id="babylon-editor-console" style={{ width: "100%", height: "100%" }}></div>;
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        const div = document.getElementById("babylon-editor-console") as HTMLDivElement;
        
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
        this._terminal.open(div);

        this.logInfo("Console ready.");
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        if (this._terminal) { this._terminal.dispose(); }
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
     * Logs the given message as info.
     * @param message the message to log as info.
     */
    public logInfo(message: string): void {
        this._addLog({ type: ConsoleLogType.Info, message });
    }

    /**
     * Logs the given message as warning.
     * @param message the message to log as warning.
     */
    public logWarning(message: string): void {
        this._addLog({ type: ConsoleLogType.Warning, message });
    }

    /**
     * Logs the given message as error.
     * @param message the message to log as error.
     */
    public logError(message: string): void {
        this._addLog({ type: ConsoleLogType.Error, message });
    }

    /**
     * Logs the given message in its raw form.
     * @param message the message to log directly.
     */
    public logRaw(message: string): void {
        this._addLog({ type: ConsoleLogType.Raw, message });
    }

    /**
     * Adds the given log to the editor.
     */
    private _addLog(log: IConsoleLog): void {
        if (!this._terminal) { return; }

        switch (log.type) {
            case ConsoleLogType.Info:
                    this._terminal.writeln(chalk.white(`[INFO]: ${log.message}`));
                    console.info(log.message);
                    break;
                case ConsoleLogType.Warning:
                    this._terminal.writeln(chalk.yellow(`[WARN]: ${log.message}`));
                    console.warn(log.message);
                    break;
                case ConsoleLogType.Error:
                    this._terminal.writeln(chalk.red(`[WARN]: ${log.message}`));
                    console.error(log.message);
                    break;
                case ConsoleLogType.Raw:
                    this._terminal.writeln(log.message);
                    console.log(log.message);
                    break;
        }
    }
}
