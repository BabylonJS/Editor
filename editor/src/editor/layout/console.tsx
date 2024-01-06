import { Component, ReactNode } from "react";

export interface IEditorConsoleState {
    logs: ReactNode[];
}

export class EditorConsole extends Component<unknown, IEditorConsoleState> {
    public constructor(props: unknown) {
        super(props);

        this.state = {
            logs: [],
        };
    }

    public render(): ReactNode {
        return (
            <div className="flex flex-col gap-1 p-2">
                {this.state.logs}
            </div>
        );
    }

    /**
     * Logs a message to the console.
     * @param message defines the message to log.
     */
    public log(message: ReactNode): void {
        this.state.logs.push(
            <div key={this.state.logs.length + 1}>
                {message}
            </div>
        );

        this.setState({ logs: this.state.logs });
    }
}
