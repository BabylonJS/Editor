import { Nullable } from "../../../../shared/types";

import * as React from "react";

import GraphEditorWindow from "../index";
import { ConsoleLog, ConsoleLogType } from "../../../editor/components/console/log";

export interface IConsoleProps {
    /**
     * Defines the reference to the editor's window main class.
     */
    editor: GraphEditorWindow;
}

export interface IConsoleState {
    /**
     * Defines the current width in pixels of the panel.
     */
    width: number;
    /**
     * Defines the current height in pixels of the panel.
     */
    height: number;

    /**
     * Defines the list of all available logs.
     */
    logs: React.ReactNode[];
}

export class Logs extends React.Component<IConsoleProps, IConsoleState> {
    private _div: Nullable<HTMLDivElement>;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IConsoleProps) {
        super(props);

        props.editor.logs = this;

        this.state = {
            logs: [],
            width: 1,
            height: 1,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                <div
                    key="common-div"
                    className="bp3-code-block"
                    ref={(r) => this._div = r}
                    style={{ width: this.state.width, height: this.state.height, marginTop: "0px", overflow: "auto" }}
                >
                    {this.state.logs}
                </div>
            </div>
        )
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        const log = console.log;
        console.log = (...args: any[]): void => {
            log.call(console, ...args);
            this.log(ConsoleLogType.Info, ...args);
        };

        const warn = console.warn;
        console.warn = (...args: any[]): void => {
            warn.call(console, ...args);
            this.log(ConsoleLogType.Warning, ...args);
        };

        this.resize();
    }

    /**
     * Called on the component did update.
     */
    public componentDidUpdate(): void {
        if (this._div) {
            this._div.scrollTop = this._div.scrollHeight + 25;
        }
    }

    /**
     * Called on the panel has been resized.
     */
    public resize(): void {
        const size = this.props.editor.getPanelSize("console");
        this.setState({ width: size.width, height: size.height });
    }

    /**
     * Clears the logs.
     */
    public clear(): void {

    }

    /**
     * Logs the given messages.
     * @param args defines all messages to log.
     */
    public log(type: ConsoleLogType, ...args: any[]): void {
        args.forEach((a) => {
            if (!a.toString) {
                return;
            }

            this.state.logs.push(<ConsoleLog message={a.toString()} type={type} />);
        });

        this.setState({ logs: this.state.logs });
    }
}
