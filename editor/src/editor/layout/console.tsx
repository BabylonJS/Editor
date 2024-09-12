import { clipboard } from "electron";

import { Button } from "@blueprintjs/core";
import { Component, ReactNode } from "react";

import { Editor } from "../main";

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../../ui/shadcn/ui/context-menu";

import { EditorConsoleProgressLogComponent } from "./console/progress-log";

export interface IEditorConsoleProps {
    editor: Editor;
}

export interface IEditorConsoleState {
    logs: ReactNode[];
}

export class EditorConsole extends Component<IEditorConsoleProps, IEditorConsoleState> {
    private _div: HTMLDivElement | null = null;

    public constructor(props: IEditorConsoleProps) {
        super(props);

        this.state = {
            logs: [],
        };
    }

    public render(): ReactNode {
        return (
            <div className="relative">
                <div className="sticky top-0 left-0 w-full h-10 bg-primary-foreground">
                    <div className="flex gap-2 h-full">
                        <Button minimal icon="trash" text="Clear" onClick={() => this.setState({ logs: [] })} />
                    </div>
                </div>

                <div ref={(r) => this._div = r} className="flex flex-col gap-1 p-2 text-foreground overflow-auto">
                    {this.state.logs}
                </div>
            </div>
        );
    }

    /**
     * Logs a message to the console.
     * @param message defines the message to log.
     */
    public log(message: ReactNode): void {
        this._addLog(
            <div key={this.state.logs.length + 1} className="whitespace-break-spaces hover:bg-secondary/50 transition-all duration-300 ease-in-out">
                {message}
            </div>
        );
    }

    /**
     * Logs a message to the console in yellow to indicate a warning.
     * @param message defines the message to log.
     */
    public warn(message: ReactNode): void {
        this._addLog(
            <div key={this.state.logs.length + 1} className="whitespace-break-spaces text-yellow-500 hover:bg-secondary/50 transition-all duration-300 ease-in-out">
                {message}
            </div>
        );
    }

    /**
     * Logs a message to the console in red to indicate an error.
     * @param message defines the message to log.
     */
    public error(message: ReactNode): void {
        this._addLog(
            <div key={this.state.logs.length + 1} className="whitespace-break-spaces text-red-500 hover:bg-secondary/50 transition-all duration-300 ease-in-out">
                {message}
            </div>
        );
    }

    /**
     * Logs a message to the console with a spinner indicator to indicate a progress.
     * This method returns the reference to the log component that can be modified later.
     * @param message defines the message to log by default.
     * @returns the reference to the progress log component that can be modified later.
     * @example
     *  const progress = await editor.layout.console.progress("Loading...");
     *  progress.setState({ done: true, message: "" });
     */
    public progress(message: ReactNode): Promise<EditorConsoleProgressLogComponent> {
        return EditorConsoleProgressLogComponent.Create(this.props.editor, message);
    }

    private _addLog(log: ReactNode): void {
        let ref: HTMLDivElement | null = null;

        this.state.logs.push(
            <ContextMenu>
                <ContextMenuTrigger>
                    <div ref={(r) => ref = r}>
                        {log}
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={() => clipboard.writeText(ref?.innerText ?? "")}>Copy</ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );

        this.setState({ logs: this.state.logs }, () => {
            if (this._div?.parentElement) {
                this._div.parentElement.scrollTop = this._div.scrollHeight + 25;
            }
        });
    }
}
