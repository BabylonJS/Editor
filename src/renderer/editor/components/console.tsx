import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes, ButtonGroup, Button, Tabs, TabId, Tab } from "@blueprintjs/core";

import { Terminal } from "xterm";
import { FitAddon } from 'xterm-addon-fit';

import { Logger, Observable } from "babylonjs";

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

export enum ConsoleLayer {
    /**
     * Defines the layer containing all common logs.
     */
    Common = 0,
    /**
     * Defines the layer containing all the typescript logs.
     */
    TypeScript,
    /**
     * Defines the layer containing all the webpack logs.
     */
    WebPack,
}

export interface IConsoleProps {
    /**
     * The editor reference.
     */
    editor: Editor;
}

export interface IConsoleState {
    /**
     * Defines the current Id of the active tab.
     */
    tabId: TabId;
    /**
     * Defines the current width in pixels of the panel.
     */
    width: number;
    /**
     * Defines the current height in pixels of the panel.
     */
    height: number;
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
     * Defines the layer where to write the message (log).
     */
    layer?: ConsoleLayer;
}

export class Console extends React.Component<IConsoleProps, IConsoleState> {
    private _terminalTypeScript: Nullable<Terminal> = null;
    private _terminalWebPack: Nullable<Terminal> = null;

    private _fitAddonCommon: FitAddon = new FitAddon();
    private _fitAddonWebPack: FitAddon = new FitAddon();

    private _commonDiv: Nullable<HTMLDivElement> = null;
    private _terminalTypeScriptDiv: Nullable<HTMLDivElement> = null;
    private _terminalWebPackDiv: Nullable<HTMLDivElement> = null;

    private _refHandler = {
        getCommonDiv: (ref: HTMLDivElement) => this._commonDiv = ref,
        getTypeScriptDiv: (ref: HTMLDivElement) => this._terminalTypeScriptDiv = ref,
        getWebPackDiv: (ref: HTMLDivElement) => this._terminalWebPackDiv = ref,
    };

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
        this.state = { tabId: "common", width: 1, height: 1 };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div style={{ width: "100%", height: "100%" }}>
                <div className={Classes.FILL} key="materials-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="clear" icon={<Icon src="recycle.svg" />} small={true} text="Clear" onClick={() => this.clear(this.state.tabId)} />
                    </ButtonGroup>
                </div>
                <Tabs
                    animate={true}
                    key="console-tabs"
                    renderActiveTabPanelOnly={false}
                    vertical={true}
                    children={[
                        <Tab id="common"     title="Common"     key="common"     panel={<div ref={this._refHandler.getCommonDiv} key="common-div" className="bp3-code-block" style={{ width: this.state.width, height: this.state.height, marginTop: "6px", overflow: "auto" }}></div>} />,
                        <Tab id="typescript" title="TypeScript" key="typescript" panel={<div ref={this._refHandler.getTypeScriptDiv} key="typescript-div" style={{ width: "100%", height: "100%", marginTop: "6px" }}></div>} />,
                        <Tab id="webpack"    title="WebPack"    key="webpack"    panel={<div ref={this._refHandler.getWebPackDiv} key="webpack-div" style={{ width: "100%", height: "100%", marginTop: "6px" }}></div>} />,
                    ]}
                    onChange={(id) => this.setActiveTab(id)}
                    selectedTabId={this.state.tabId}
                ></Tabs>
            </div>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        if (!this._commonDiv || !this._terminalTypeScriptDiv || !this._terminalWebPackDiv) { return; }

        // Create terminals
        this._terminalWebPack = this._createTerminal(this._terminalWebPackDiv, this._fitAddonWebPack);
        this._terminalTypeScript = this._createTerminal(this._terminalTypeScriptDiv, this._fitAddonCommon);

        this.logInfo("Console ready.", ConsoleLayer.Common);
        this.logInfo("Console ready.", ConsoleLayer.TypeScript);
        this.logInfo("Console ready.", ConsoleLayer.WebPack);
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        if (this._terminalTypeScript) { this._terminalTypeScript.dispose(); }
        if (this._terminalWebPack) { this._terminalWebPack.dispose(); }

        this._fitAddonCommon.dispose();
        this._fitAddonWebPack.dispose();
    }

    /**
     * Called on the panel has been resized.
     */
    public resize(): void {
        setTimeout(() => {
            const size = this.props.editor.getPanelSize("console");

            if (this._terminalTypeScriptDiv) {
                this._terminalTypeScriptDiv.style.width = `${size.width - 130}px`;
                this._terminalTypeScriptDiv.style.height = `${size.height - 40}px`;
            }

            if (this._terminalWebPackDiv) {
                this._terminalWebPackDiv.style.width = `${size.width - 130}px`;
                this._terminalWebPackDiv.style.height = `${size.height - 40}px`;
            }
            
            switch (this.state.tabId) {
                case "common":
                    this.setState({ width: size.width - 130, height: size.height - 40 });
                    break;
                case "typescript":
                    this._terminalTypeScript?.resize(1, 1);
                    this._fitAddonCommon.fit();
                    break;
                case "webpack":
                    this._terminalWebPack?.resize(1, 1);
                    this._fitAddonWebPack.fit();
                    break;
            }

            this.onResizeObservable.notifyObservers();
        }, 0);
    }

    /**
     * Returns the terminal according to the given layer type.
     * @param type defines the type of terminal to get.
     */
    public getTerminalByType(type: ConsoleLayer): Nullable<Terminal> {
        switch (type) {
            case ConsoleLayer.TypeScript: return this._terminalTypeScript;
            case ConsoleLayer.WebPack: return this._terminalWebPack;
            default: return null;
        }
    }

    /**
     * Logs the given message as info.
     * @param message defines the message to log as info.
     * @param layer defines the layer where to draw the output.
     */
    public logInfo(message: string, layer?: ConsoleLayer): void {
        this._addLog({ type: ConsoleLogType.Info, message, layer });
    }

    /**
     * Logs the given message as warning.
     * @param message the message to log as warning.
     * @param layer defines the layer where to draw the output.
     */
    public logWarning(message: string, layer?: ConsoleLayer): void {
        this._addLog({ type: ConsoleLogType.Warning, message, layer });
    }

    /**
     * Logs the given message as error.
     * @param message the message to log as error.
     * @param layer defines the layer where to draw the output.
     */
    public logError(message: string, layer?: ConsoleLayer): void {
        this._addLog({ type: ConsoleLogType.Error, message, layer });
    }

    /**
     * Logs the given message in its raw form.
     * @param message the message to log directly.
     * @param layer defines the layer where to draw the output.
     */
    public logRaw(message: string, layer?: ConsoleLayer): void {
        this._addLog({ type: ConsoleLogType.Raw, message, layer });
    }

    /**
     * Sets the newly active tab.
     * @param tabId defines the id of the tab to set as active.
     */
    public setActiveTab(tabId: "common" | "webpack" | TabId): void {
        this.setState({ tabId }, () => this.resize());
    }

    /**
     * Clears the terminal containing in the tab identified by the given tab Id.
     * @param tabId defines the id of the tab to clear.
     */
    public clear(tabId: TabId): void {
        switch (tabId) {
            case "common": this._commonDiv && (this._commonDiv.innerHTML = ""); break;
            case "typescript": this._terminalTypeScript?.clear(); break;
            case "webpack": this._terminalWebPack?.clear(); break;
            default: break;
        }
    }

    /**
     * Adds the given log to the editor.
     */
    private _addLog(log: IConsoleLog): void {
        log.layer = log.layer ?? ConsoleLayer.Common;

        // Common
        if (log.layer === ConsoleLayer.Common) {
            if (!this._commonDiv) { return; }

            const p = document.createElement("p");
            p.style.marginBottom = "0px";
            p.style.whiteSpace = "nowrap";
            
            switch (log.type) {
                case ConsoleLogType.Info:
                    p.innerText = `[INFO]: ${log.message}`;
                    console.info(log.message);
                    break;
                case ConsoleLogType.Warning:
                    p.innerText = `[WARN]: ${log.message}`;
                    p.style.color = "yellow";
                    console.warn(log.message);
                    break;
                case ConsoleLogType.Error:
                    p.innerText = `[ERROR]: ${log.message}`;
                    p.style.color = "red";
                    console.warn(log.message);
                    break;
            }

            this._commonDiv.appendChild(p);
            this._commonDiv.scrollTop = this._commonDiv.scrollHeight + 25;

            return;
        }

        // Terminal
        const terminal = log.layer === ConsoleLayer.TypeScript ? this._terminalTypeScript : this._terminalWebPack;
        if (!terminal) { return; }

        switch (log.type) {
            case ConsoleLogType.Info:
                terminal.writeln(`[INFO]: ${log.message}`);
                console.info(log.message);
                break;
            case ConsoleLogType.Warning:
                terminal.writeln(`[WARN]: ${log.message}`);
                console.warn(log.message);
                break;
            case ConsoleLogType.Error:
                terminal.writeln(`[ERROR]: ${log.message}`);
                console.error(log.message);
                break;
            case ConsoleLogType.Raw:
                terminal.write(log.message);
                console.log(log.message.trim());
                break;
        }
    }

    /**
     * Creates an ew terminal opened in the given div HTML element.
     */
    private _createTerminal(terminalDiv: HTMLDivElement, addon: FitAddon): Terminal {
        // Create terminal
        const terminal = new Terminal({
            fontFamily: "Consolas, 'Courier New', monospace",
            fontSize: 12,
            fontWeight: "normal",
            cursorStyle: "block",
            cursorWidth: 1,
            drawBoldTextInBrightColors: true,
            fontWeightBold: "bold",
            letterSpacing: -4,
            // cols: 80,
            lineHeight: 1,
            rendererType: "canvas",
            allowTransparency: true,
            theme: {
                background: "#222222",
            },
        });

        terminal.loadAddon(addon);
        terminal.open(terminalDiv);

        return terminal;
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
