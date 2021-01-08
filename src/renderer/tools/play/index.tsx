import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes, ButtonGroup, Button, Divider, NonIdealState } from "@blueprintjs/core";

import { Icon } from "../../editor/gui/icon";

import { WorkSpace } from "../../editor/project/workspace";
import { ProjectExporter } from "../../editor/project/project-exporter";

import { AbstractEditorPlugin, IEditorPluginProps } from "../../editor/tools/plugin";

export const title = "Play";

export interface IPlayPlugin {
    /**
     * Defines wether or not the plugin is ready.
     */
    isReady: boolean;
    /**
     * Defines wether or not the game is running.
     */
    isRunning: boolean;
}

export default class PlayPlugin extends AbstractEditorPlugin<IPlayPlugin> {
    private _iframe: Nullable<HTMLIFrameElement> = null;
    private _refHandler = {
        getIFrame: (ref: HTMLIFrameElement) => this._iframe = ref,
    };

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IEditorPluginProps) {
        super(props);

        // State
        this.state = { isReady: this.editor.isInitialized, isRunning: false };
        
        // Register
        if (!this.editor.isInitialized) {
            this.editor.editorInitializedObservable.addOnce(() => {
                this.setState({ isReady: true });
            });
        }
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (!this.state.isReady || !WorkSpace.Workspace) { return null; }

        let content: React.ReactNode;
        if (this.state.isRunning) {
            const iframeUrl = `http://localhost:${WorkSpace.Workspace.serverPort}/`;
            content = (
                <iframe ref={this._refHandler.getIFrame} src={iframeUrl} style={{ width: "100%", height: "calc(100% - 25px)" }}></iframe>
            );
        } else {
            content = (
                <NonIdealState
                    title="Stopped"
                    description="Game is ready. Click restart button to run the game."
                    icon={<Icon src="square-full.svg" />}
                />
            );
        }

        return (
            <>
                <div className={Classes.FILL} key="documentation-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="refresh" small={true} icon="refresh" text="" onClick={() => this._handleRefresh()} />
                        <Button key="restart" small={true} icon={<Icon src="recycle.svg" />} text="Restart" onClick={() => this._handleRestart()} />
                        <Divider />
                        <Button key="stop" small={true} disabled={!this.state.isRunning} icon={<Icon src="square-full.svg" />} text="Stop" onClick={() => this._handleStop()} />
                    </ButtonGroup>
                </div>
                {content}
            </>
        );
    }

    /**
     * Called on the plugin is ready.
     */
    public onReady(): void {
        this.setState({ isRunning: true });
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {

    }

    /**
     * Called on the user wants to refresh the game.
     */
    private _handleRefresh(): void {
        if (this._iframe) {
            this._iframe.src = this._iframe.src;
        }

        this.setState({ isRunning: true });
    }

    /**
     * Called on the user wants to refresh.
     */
    private async _handleRestart(): Promise<void> {
        await ProjectExporter.ExportFinalScene(this.editor);
        this._handleRefresh();
    }

    /**
     * Called on the user wants to stop.
     */
    private _handleStop(): void {
        this.setState({ isRunning: false });
    }
}
