import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes, ButtonGroup, Button } from "@blueprintjs/core";

import { Logger, Observable } from "babylonjs";

import { Icon } from "../gui/icon";

import { Editor } from "../editor";

import { ConsoleLog, IConsoleLog, ConsoleLogType } from "./console/log";

export interface IConsoleProps {
    /**
     * The editor reference.
     */
    editor: Editor;
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

export class Console extends React.Component<IConsoleProps, IConsoleState> {
    private _div: Nullable<HTMLDivElement> = null;

    /**
     * Notifies all listeners that the logs have been resized.
     */
    public onResizeObservable: Observable<void> = new Observable<void>();

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IConsoleProps) {
        super(props);

        props.editor.console = this;

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
                <div className={Classes.FILL} key="materials-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="clear" icon={<Icon src="recycle.svg" />} small={true} text="Clear" onClick={() => this.clear()} />
                    </ButtonGroup>
                </div>
                <div
                    key="common-div"
                    className="bp3-code-block"
                    ref={(r) => this._div = r}
                    style={{ width: this.state.width, height: this.state.height, marginTop: "6px", overflow: "auto" }}
                >
                    {this.state.logs}
                </div>
            </div>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        if (!this._div) {
            return;
        }

        this.logInfo("Console ready.");
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
        requestAnimationFrame(() => {
            const size = this.props.editor.getPanelSize("console");
            this.setState({ width: size.width, height: size.height - 31 });
        });
    }

    /**
     * Logs the given message as info.
     * @param message defines the message to log as info.
     * @param ref defines the optional callback on the 
     */
    public logInfo(message: string): Promise<ConsoleLog> {
        return this._addLog({ type: ConsoleLogType.Info, message });
    }

    /**
     * Logs the given message as warning.
     * @param message the message to log as warning.
     */
    public logWarning(message: string): Promise<ConsoleLog> {
        return this._addLog({ type: ConsoleLogType.Warning, message });
    }

    /**
     * Logs the given message as error.
     * @param message the message to log as error.
     */
    public logError(message: string): Promise<ConsoleLog> {
        return this._addLog({ type: ConsoleLogType.Error, message });
    }

    /**
     * Logs the given message using separators. Allows to create sections in logs.
     * @param message defines the message to log directly.
     */
    public logSection(message: string): Promise<ConsoleLog> {
        return this._addLog({ type: ConsoleLogType.Info, message, separator: true });
    }

    /**
     * Creates an empty log of type "Info" and returns its reference.
     */
    public createLog(): Promise<ConsoleLog> {
        return this._addLog({ type: ConsoleLogType.Info, message: "" });
    }

    /**
     * Logs the given custom react component.
     * @param log defines the reference to the custom react component instance.
     */
    public logCustom(log: React.ReactNode): void {
        this.state.logs.push(log);
        this.setState({ logs: this.state.logs });
    }

    /**
     * Clears the console.
     */
    public clear(): void {
        this.setState({ logs: [] });
    }

    /**
     * Adds the given log to the editor.
     */
    private _addLog(log: IConsoleLog): Promise<ConsoleLog> {
        return new Promise<ConsoleLog>((resolve) => {
            if (log.separator) {
                this.state.logs.push(
                    <>
                        <hr />
                        <ConsoleLog ref={(r) => r && resolve(r)} message={log.message} type={log.type} />
                        <hr />
                    </>
                );
            } else {
                this.state.logs.push(<ConsoleLog ref={(r) => r && resolve(r)} message={log.message} type={log.type} />);
            }

            this.setState({ logs: this.state.logs });
        });
    }

    /**
     * Overrides the current BabylonJS Logger class.
     */
    public overrideLogger(): void {
        const log = Logger.Log;
        const warn = Logger.Warn;
        const error = Logger.Error;

        Logger.Log = (m) => { log(m); this.logInfo(m); }
        Logger.Warn = (m) => { warn(m); this.logWarning(m); }
        Logger.Error = (m) => { error(m); this.logError(m); }
    }
}
