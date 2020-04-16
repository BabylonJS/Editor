import { Nullable } from "../../../shared/types";

import * as React from "react";
import { editor } from "monaco-editor";

import Editor from "../index";

// Declare monaco on the window.
import * as monacoEditor from "monaco-editor";
declare var monaco: typeof monacoEditor;

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
}

export interface IConsoleProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export interface IConsoleState {
    /**
     * Defines wether or not the console has a running process.
     */
    hasProcessRunning: boolean;
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
    private _editor: Nullable<editor.ICodeEditor> = null;
    private _messages: IConsoleLog[] = [];
    private _autoScroll: boolean = true;
    private _addingLog: boolean = false;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IConsoleProps) {
        super(props);

        props.editor.console = this;
        this.state = { hasProcessRunning: false };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <>
                <div id="babylon-editor-console" style={{ width: "100%", height: "100%" }}></div>
            </>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        const div = document.getElementById("babylon-editor-console") as HTMLDivElement;
        
        this._editor = monaco.editor.create(div, {
            readOnly: true,
            value: "",
            language: "plaintext",
            theme: "vs-dark",
            automaticLayout: true,
            selectionHighlight: true,
        });

        this._editor.onDidScrollChange((e) => {
            if (!this._editor) { return; }
            const topForLastLine = this._editor.getTopForLineNumber(this._messages.length);

            if (e.scrollTop >= topForLastLine) {
                this._autoScroll = true;
            } else if (e.scrollTopChanged && !this._addingLog) {
                this._autoScroll = false;
            }
        });

        this.logInfo("Console ready.");
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        if (this._editor) { this._editor.dispose(); }
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
     * Adds the given log to the editor.
     */
    private _addLog(log: IConsoleLog): void {
        if (!this._editor) { return; }

        this._messages.push(log);
        if (this._messages.length > 1000) {
            this._messages.shift();
        }

        const model = this._editor.getModel() as editor.ITextModel;
        if (!model) { return; }

        const value = model.getValue();
        const message = log.message.split("\n").map((m) => `\t${m}`).join("\n");

        this._addingLog = true;

        switch (log.type) {
            case ConsoleLogType.Info:
                model.setValue(`${value}\n[INFO]:${message}`);
                console.log(log.message);
                break;
            case ConsoleLogType.Warning:
                model.setValue(`${value}\n[WARING]:${message}`);
                console.warn(log.message);
                break;
            case ConsoleLogType.Error:
                model.setValue(`${value}\n[ERROR]:${message}`);
                console.error(log.message);
                break;
        }

        if (this._autoScroll) { this._editor.revealLine(model.getLineCount()); }
        this._addingLog = false;
    }
}
