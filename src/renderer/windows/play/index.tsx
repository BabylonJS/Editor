import { shell } from "electron";

import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes, ButtonGroup, Button } from "@blueprintjs/core";

import { IWorkSpace } from "../../editor/project/typings";

export const title = "Play";

export interface IPlayWindowState {
    /**
     * Defines the current workspace object.
     */
    workspace?: IWorkSpace
}

export default class PlayWindow extends React.Component<{ }, IPlayWindowState> {
    private _iframe: Nullable<HTMLIFrameElement> = null;
    private _refHandler = {
        getIFrame: (ref: HTMLIFrameElement) => this._iframe = ref,
    };

    /**
     * Constructor
     * @param props the component's props.
     */
    public constructor(props: any) {
        super(props);

        this.state = { };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (!this.state.workspace) { return null; }

        const iframeUrl = `http://localhost:${this.state.workspace.serverPort}/`;
        return (
            <>
                <div className={Classes.FILL} key="documentation-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="open-browser" small={true} icon="document-open" text="Open In My Browser" onClick={() => this._handleOpenInBrowser()} />
                        <Button key="refresh" small={true} icon="refresh" text="Refresh" onClick={() => this._handleRefresh()} />
                    </ButtonGroup>
                </div>
                <iframe ref={this._refHandler.getIFrame} src={iframeUrl} style={{ width: "100%", height: "calc(100% - 25px)" }}></iframe>
            </>
        );
    }

    /**
     * Called on the component did mount.
     */
    public async componentDidMount(): Promise<void> {
        // Nothing to at the moment.
    }

    /**
     * Inits the plugin.
     * @param workspace defines the current workspace configuration.
     */
    public init(workspace: IWorkSpace): void {
        this.setState({ workspace });
    }

    /**
     * Called on the user wants to open the documentation in his browser.
     */
    private async _handleOpenInBrowser(): Promise<void> {
        if (!this._iframe) { return; }

        await shell.openExternal(this._iframe.src);
        window.close();
    }

    /**
     * Called on the user wants to refresh.
     */
    private _handleRefresh(): void {
        if (!this._iframe) { return; }

        this._iframe.src = this._iframe.src;
    }
}
