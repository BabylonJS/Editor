import { Button } from "@blueprintjs/core";
import { Component, ReactNode } from "react";

export interface IEditorConsoleState {
    logs: ReactNode[];
}

export class EditorConsole extends Component<unknown, IEditorConsoleState> {
    private _div: HTMLDivElement | null = null;

    public constructor(props: unknown) {
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
            <div key={this.state.logs.length + 1} className="whitespace-nowrap">
                {message}
            </div>
        );
    }

    public error(message: ReactNode): void {
        this._addLog(
            <div key={this.state.logs.length + 1} className="whitespace-nowrap text-red-500">
                {message}
            </div>
        );
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
