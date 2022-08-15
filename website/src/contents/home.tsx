import * as React from "react";
import { NonIdealState } from "@blueprintjs/core";

export class HomeContent extends React.Component {
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <>
                {/* INTRO */}
                <div style={{ width: "100%", height: "200px", backgroundColor: "#201936" }}>
                    <div style={{ marginLeft: "50px", marginRight: "50px" }}>
                        <h1 className="title">Welcome to Babylon.JS Editor 4.4</h1>
                        <p className="content">
                            The Babylon.JS Editor is an open source project maintained by the community.
                            The mission is to provide community-driven powerful and simple tools that help Babylon.JS users to create beautiful,
                            awesome 3D games / applications. It comes with deep customization features and is built using Electron 
                            to support cross-platform development. Using the latest version of Babylon.JS, the Editor allows creating highly
                            customizable 3D web project skeletons based on the powerful ES6 modules version of Babylon.JS.
                        </p>
                    </div>
                </div>

                {/* CROSS-PLATFORM */}
                <div style={{ width: "100%", height: "350px", backgroundColor: "#5f5b60" }}>
                    <div style={{ width: "50%", height: "100%", float: "left" }}>
                        <img className="preview" src="./img/home/empty_project.png"></img>
                    </div>
                    <div style={{ width: "50%", height: "100%", float: "left" }}>
                        <NonIdealState
                            icon={<img width="100" height="100" src="./img/home/electron_icon.svg"></img>}
                            title={<strong className="title">Cross-platform support</strong>}
                            description={
                                <p className="content" style={{ maxWidth: "90%" }}>
                                    The Babylon.JS Editor is built using Electron and provides support for major operating systems including
                                    Mac, Windows and Linux. All features are made to work on all supported platforms.
                                </p>
                            }
                        />
                    </div>
                </div>

                {/* BUILT-IN TEMPLATES */}
                <div style={{ width: "100%", height: "350px", backgroundColor: "#324554" }}>
                    <div style={{ width: "50%", height: "100%", float: "left" }}>
                        <NonIdealState
                            icon={<img width="100" height="100" src="./img/home/code.svg"></img>}
                            title={<strong className="title">Built-in templates</strong>}
                            description={
                                <p className="content" style={{ maxWidth: "90%" }}>
                                    The Editor comes with some built-in projects including Third-Person-Shooter and First-Person-Shooter
                                    examples. This is perfect to learn by experimenting using these templates.
                                    {/* <Tree
                                        contents={[
                                            { label: <a href="./examples/tps/" target="blank">Thrid-Person-Shooter</a> } as ITreeNode,
                                            { label: <a href="./examples/fps/" target="blank">First-Person-Shooter</a> } as ITreeNode,
                                            { label: <a href="./examples/fps_graphs/" target="blank">First-Person-Shooter using graphs</a> } as ITreeNode,
                                        ]}
                                    /> */}
                                </p>
                            }
                        />
                    </div>
                    <div style={{ width: "50%", height: "100%", float: "left" }}>
                        <img className="preview" src="./img/home/templates.png"></img>
                    </div>
                </div>
                
                {/* VSCODE */}
                <div style={{ width: "100%", height: "350px", backgroundColor: "#201936" }}>
                    <div style={{ width: "50%", height: "100%", float: "left" }}>
                        <img className="preview" src="./img/home/vscode_debugging.png"></img>
                    </div>
                    <div style={{ width: "50%", height: "100%", float: "left" }}>
                        <NonIdealState
                            icon={<img style={{ width: "100px", height: "100px" }} src="./img/home/vscode.svg"></img>}
                            title="Visual Studio Code integration"
                            description={
                                <p className="content" style={{ maxWidth: "90%" }}>
                                    The Editor has been designed to work perfectly with VSCode. It includes remote debugging and shortcuts to quickly
                                    access script files attached to objects in scene.
                                    Simply double-click a script in Editor and it will open in VSCode or simply start remote debug in VSCode and put
                                    the desired breakpoints to start step-by-step debugging.
                                </p>
                            }
                        />
                    </div>
                </div>

                {/* GRAPHS */}
                <div style={{ width: "100%", height: "350px", backgroundColor: "#141414" }}>
                    <div style={{ width: "50%", height: "100%", float: "left" }}>
                        <NonIdealState
                            icon={<img style={{ width: "100px", height: "100px" }} src="./img/home/graphs_icon.svg"></img>}
                            title="Graph Editor (beta)"
                            description={
                                <p className="content" style={{ maxWidth: "90%" }}>
                                    As a non-developer it now becomes easy to develop custom behaviors for objects in scene.
                                    The powerful Graph Editor allows to create and customize objects at runtime. No third-dependency required
                                    as all graphs are translated into TypeScript code and compiled with the rest of the project.
                                </p>
                            }
                        />
                    </div>
                    <div style={{ width: "50%", height: "100%", float: "left" }}>
                        <img className="preview" src="./img/home/graphs.png"></img>
                    </div>
                </div>

                {/* OPEN SOURCE */}
                <div style={{ width: "100%", height: "300px", backgroundColor: "#201936" }}>
                    <div style={{ width: "50%", height: "100%", float: "left" }}>
                        <img className="preview" src="./img/home/empty_project.png"></img>
                    </div>
                    <div style={{ width: "50%", height: "100%", float: "left" }}>
                        <NonIdealState
                            icon={<img width="100" height="100" src="./img/home/github.svg"></img>}
                            title={<strong className="title">Fully open source project</strong>}
                            description={
                                <p className="content" style={{ maxWidth: "90%" }}>
                                    The Editor source code is fully open source sharing the same licence as Babylon.JS.
                                    All code is available on <a target="blank" href="https://github.com/BabylonJS/Editor/tree/release/4.0.0">Github</a> and is open to all contributions/feedbacks.
                                </p>
                            }
                        />
                    </div>
                </div>
            </>
        )
    }
}
