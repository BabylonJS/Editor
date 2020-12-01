import { Card, Divider, ITreeNode, NonIdealState, Tree } from "@blueprintjs/core";
import * as React from "react";

export interface IVersionsDownload {
    version: string;

    win32: string;
    darwin: string;
    linux: string;
}

export class DownloadContent extends React.Component {
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const json = this._getVersions();
        const cards = this._getOlderVersionsCards(json);

        return (
            <div style={{ width: "100%" }}>
                <div style={{ width: "100%", height: "350px", backgroundColor: "#201936" }}>
                    <div style={{ marginLeft: "50px", marginRight: "50px" }}>
                        <h1 className="title">Download latest version</h1>
                        <p>
                            The latest version of the Babylon.JS Editor comes with the latest features and bugfix. It is recommanded to
                            keep the Editor up to date.
                        </p>
                        <Card interactive={false} style={{ width: "50%", transform: "translate(50%)", background: "#324554" }}>
                            <NonIdealState
                                key="latest-download"
                                icon="download"
                                title={"Version " + json[0].version}
                                description={
                                    <Tree
                                        key="lastest-download-links"
                                        contents={[
                                            { id: "0", label: <a key={json[0].win32}  href={"http://editor.babylonjs.com/" + json[0].win32}>Windows</a>, icon: <img width="24" height="24" src="./img/download/windows_icon.png"></img> } as ITreeNode,
                                            { id: "1", label: <a key={json[0].darwin} href={"http://editor.babylonjs.com/" + json[0].darwin}>Mac</a>,    icon: <img width="24" height="24" src="./img/download/mac_icon.svg"></img> } as ITreeNode,
                                            { id: "2", label: <a key={json[0].linux}  href={"http://editor.babylonjs.com/" + json[0].linux}>Linux</a>,   icon: <img width="24" height="24" src="./img/download/linux_icon.svg"></img> } as ITreeNode,
                                        ]}
                                    />
                                }
                            />
                        </Card>
                    </div>
                </div>

                <div style={{ width: "100%", backgroundColor: "#141414" }}>
                    <div style={{ marginLeft: "50px", marginRight: "50px" }}>
                        <h1>Older versions</h1>
                        {cards}
                    </div>
                </div>
            </div>
        )
    }

    /**
     * Returns the list of all older versions to download.
     */
    private _getOlderVersionsCards(json: IVersionsDownload[]): React.ReactNode[] {
        return json.map((v) => (
            <div style={{ height: "200px" }}>
                <h1 key={`older-version-${v.version}`} style={{ textAlign: "center" }}>{v.version}</h1>
                <div style={{ width: "33.3%", float: "left" }}>
                    <a href={"http://editor.babylonjs.com/" + v.win32}>
                        <NonIdealState
                            icon={<img width="24" height="24" src="./img/download/windows_icon.png"></img>}
                            title="Windows"
                        />
                    </a>
                </div>
                <div style={{ width: "33.3%", float: "left" }}>
                    <a href={"http://editor.babylonjs.com/" + v.darwin}>
                        <NonIdealState
                            icon={<img width="24" height="24" src="./img/download/mac_icon.svg"></img>}
                            title="Mac"
                        />
                    </a>
                </div>
                <div style={{ width: "33.3%", float: "left" }}>
                    <a href={"http://editor.babylonjs.com/" + v.linux}>
                        <NonIdealState
                            icon={<img width="24" height="24" src="./img/download/linux_icon.svg"></img>}
                            title="Linux"
                        />
                    </a>
                </div>
                <Divider />
            </div>
        ));
    }

    /**
     * Returns the list of all avaialble downloads.
     */
    private _getVersions(): IVersionsDownload[] {
        const baseJson = require("../../../assets/server/versions.json");
        const json: IVersionsDownload[] = [];

        for (const version in baseJson) {
            if (version.indexOf("4.") !== 0) {
                continue;
            }

            json.push({ version, ...baseJson[version] });
        }

        return json.reverse();
    }
}
