import * as React from "react";
import { Divider, NonIdealState } from "@blueprintjs/core";

/**
 * #FCF7F8
 * #CED3DC
 * #ABA9C3
 * #275DAD
 * #5B616A
 */

export class HomeContent extends React.Component {
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <>
                <div style={{ width: "100%", height: "200px", backgroundColor: "#2A2342" }}>
                    <div style={{ marginLeft: "50px", marginRight: "50px" }}>
                        <h1>Welcome to Babylon.JS Editor v4.0.0</h1>
                        <p>
                            The mission of the Editor is to provide powerful and simple tools that help Babylon.JS users to create beautiful,
                            awesome 3D games/applications.
                        </p>
                    </div>
                </div>
                <div style={{ width: "100%", height: "300px", backgroundColor: "#BB464B" }}>
                    <div style={{ width: "50%", height: "100%", float: "left" }}>
                        <img src="./img/home/empty_project.png" style={{ width: "100%", height: "100%", objectFit: "contain" }}></img>
                    </div>
                    <Divider />
                    <div style={{ width: "50%", height: "100%", float: "left" }}>
                        <NonIdealState
                            icon="eraser"
                            title="Multiplatform support"
                            description="Coucou fezf eze fzfez efz fez fezfezfezfezf ezf ez fez efzezfez fez ezffezfez fze"
                        />
                    </div>
                </div>
                {/* <Divider /> */}
                {/* <div style={{ width: "100%", height: "200px", background: "#444444" }}>
                    <img src="./img/home/empty_project.png" style={{ width: "100%", height: "100%", objectFit: "contain" }}></img>
                </div> */}
            </>
        )
    }
}
