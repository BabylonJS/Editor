import { Button } from "@blueprintjs/core";
import { Component, ReactNode } from "react";

import { Editor } from "../main";

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
            <div key={this.state.logs.length + 1} className="whitespace-break-spaces">
                {message}
            </div>
        );
    }

    public error(message: ReactNode): void {
        this._addLog(
            <div key={this.state.logs.length + 1} className="whitespace-break-spaces text-red-500">
                {message}
            </div>
        );
    }

    public progress(message: ReactNode): Promise<EditorConsoleProgressLogComponent> {
        return EditorConsoleProgressLogComponent.Create(this.props.editor, message);
    }

    private _addLog(log: ReactNode): void {
        this.state.logs.push(log);

        this.setState({ logs: this.state.logs }, () => {
            if (this._div?.parentElement) {
                this._div.parentElement.scrollTop = this._div.scrollHeight + 25;
            }
        });
    }
}
