import { ipcRenderer } from "electron";

import { IPCRequests } from "../../../shared/ipc";

import * as React from "react";

import { IWorkSpace } from "../../editor/project/typings";

export const title = "Play";

export interface IPlayWindowState {
    /**
     * Defines the current workspace object.
     */
    workspace?: IWorkSpace
}

export default class PlayWindow extends React.Component<{ }, IPlayWindowState> {
    /**
     * Constructor
     * @param props the component's props.
     */
    public constructor(props: any) {
        super(props);

        this.state = { };
        this._bindEvents();
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (!this.state.workspace) { return null; }

        const iframeUrl = `http://localhost:${this.state.workspace.serverPort}/`;
        return (
            <iframe src={iframeUrl} style={{ width: "100%", height: "100%" }}></iframe>
        );
    }

    /**
     * Called on the component did mount.
     */
    public async componentDidMount(): Promise<void> {
        // Nothing to at the moment.
    }

    /**
     * Binds the plugin's events.
     */
    private _bindEvents(): void {
        ipcRenderer.once(IPCRequests.SendWindowMessage, (_ , data) => data.id === "init" && this.setState({ workspace: data }));
    }
}
