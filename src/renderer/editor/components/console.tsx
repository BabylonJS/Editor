import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes, ButtonGroup, Button } from "@blueprintjs/core";

import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';
import chalk from "chalk";

import { Logger } from "babylonjs";

import { Icon } from "../gui/icon";

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

    private _terminalDiv: Nullable<HTMLDivElement> = null;
    private _refHandler = {
        getDiv: (ref: HTMLDivElement) => this._terminalDiv = ref,
    };

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
        return (
            <div style={{ width: "100%", height: "100%" }}>
                <div className={Classes.FILL} key="materials-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="clear" icon={<Icon src="recycle.svg" />} small={true} text="Clear" onClick={() => this._terminal?.clear()} />
                    </ButtonGroup>
                </div>
                <div ref={this._refHandler.getDiv} style={{ minWidth: "100px", minHeight: "100px", width: "100%", height: "calc(100% - 25px)" }}></div>
            </div>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        if (!this._terminalDiv) { return; }

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
        this._terminal.open(this._terminalDiv);

        this.logInfo("Console ready.");

        // Register logs from BabylonJS
        this._overrideLogger();
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
        if (!this._terminal) { return; }

        setTimeout(() => {
            const size = this.props.editor.getPanelSize("console");

            const width = (size.width / this._terminal!["_core"]._renderService.dimensions.actualCellWidth) >> 0;
            const height = (size.height / this._terminal!["_core"]._renderService.dimensions.actualCellHeight) >> 0;

            this._terminal!.resize(width || size.width, height || size.height);
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
                    this._terminal.write(log.message);
                    console.log(log.message);
                    break;
        }
    }

    /**
     * Overrides the current BabylonJS Logger class.
     */
    private _overrideLogger(): void {
        const log = Logger.Log;
        const warn = Logger.Warn;
        const error = Logger.Error;

        Logger.Log = (m) => { log(m); this.logInfo(m); }
        Logger.Warn = (m) => { warn(m); this.logWarning(m); }
        Logger.Error = (m) => { error(m); this.logError(m); }
    }
}
