import * as React from "react";

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

export interface IConsoleLog {
    /**
     * The type of the message.
     */
    type: ConsoleLogType;
    /**
     * The message in the log.
     */
    message: string;
    /**
     * Defines wether or not a separator should be drawn.
     */
    separator?: boolean;
}

export interface IConsoleLogProps extends IConsoleLog {
    // Empty at the moment...
}

export interface IConsoleLogState {
    /**
     * Defines the message of the log.
     */
    message: string;
    /**
     * Defines the reference to the custom log body.
     */
    body?: React.ReactNode;
}

export class ConsoleLog extends React.Component<IConsoleLogProps, IConsoleLogState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IConsoleLogProps) {
        super(props);
        
        this.state = {
            message: props.message,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (this.state.body) {
            return this.state.body;
        }

        return (
            <p style={{ marginBottom: "0px", whiteSpace: "nowrap", color: this._getColor(this.props) }}>
                {this.state.message}
            </p>
        );
    }

    /**
     * Sets the new message of the log.
     * @param message defines the message of the log.
     */
    public setMessage(message: string): void {
        this.setState({ message });
    }

    /**
     * Sets the new body of the log.
     * @param body defines the reference to the custom body.
     */
    public setBody(body: React.ReactNode): void {
        this.setState({ body });
    }

    /**
     * Returns the color of the log according to its type.
     */
    private _getColor(log: IConsoleLog): string {
        let color = "white";
        switch (log.type) {
            case ConsoleLogType.Error: color = "red"; break;
            case ConsoleLogType.Warning: color = "yellow"; break;
        }

        return color;
    }
}
