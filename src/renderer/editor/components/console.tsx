import { Nullable } from "../../../shared/types";

import * as React from "react";
import { ButtonGroup, Button } from "@blueprintjs/core";
import { editor } from "monaco-editor";

import { EditableText } from "../gui/editable-text";
import { ExecTools, IExecProcess } from "../tools/exec";
import { WorkSpace } from "../project/workspace";

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
    private _executingCommand: boolean = false;

    private _editableText: EditableText;
    private _refHandler = {
        getEditableText: (ref: EditableText) => this._editableText = ref,
    };

    private _process: Nullable<IExecProcess> = null;

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
                <div id="babylon-editor-console" style={{ width: "100%", height: "calc(100% - 25px)" }}></div>
                <EditableText ref={this._refHandler.getEditableText} value="" multiline={true} confirmOnEnterKey={true} placeholder="Enter your command here..." onConfirm={(v) => this._handleCommand(v)} />
                <ButtonGroup style={{ position: "absolute", bottom: "0px", right: "0px" }}>
                    <Button disabled={!this.state.hasProcessRunning} small={true} icon="stop" text="Stop" onClick={() => this.killCurrentProgram()} />
                </ButtonGroup>
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
     * Kills the currently running process.
     */
    public killCurrentProgram(): void {
        if (!this._process) { return; }

        this._process.process.unref();
        this._process.process.kill();
        this._process = null;
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

    /**
     * Executes the given command.
     */ 
    private async _handleCommand(command: string): Promise<void> {
        if (this._executingCommand || !WorkSpace.HasWorkspace() || !command) { return; }

        // Empty editable text
        this._editableText?.setState({ value: "" });
        setTimeout(() => this._editableText.focus(), 0);

        // Execute
        this._executingCommand = true;
        try {
            this.logInfo(`Executing command "${command}"`);

            this._process = ExecTools.ExecAndGetProgram(this.props.editor, command, WorkSpace.DirPath!);
            this.setState({ hasProcessRunning: true });
            await this._process.promise;

            this.logInfo(`Successfully executed command "${command}"`);
        } catch (e) {
            this.logError(`Command "${command}" failed.`);
        }

        this.setState({ hasProcessRunning: false });
        this._executingCommand = false;
    }
}