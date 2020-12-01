import * as React from "react";

export class DocumentationContent extends React.Component {
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div style={{ width: "100%" }}>
                <div style={{ marginLeft: "50px", marginRight: "50px" }}>
                    <h1 className="title">Babylon.JS Editor Documentation</h1>
                    <p>
                        The documention is still Work In Progress and is <a target="blank" href="https://github.com/BabylonJS/Editor/blob/release/4.0.0/doc/00%20-%20welcome/doc.md">
                        available here on Github</a>.
                    </p>
                </div>
            </div>
        )
    }
}
