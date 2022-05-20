import * as React from "react";

export class DocumentationContent extends React.Component {
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div style={{ width: "100%", overflow: "hidden" }}>
                <div style={{ marginLeft: "50px", marginRight: "50px" }}>
                    <h1 className="title">Babylon.JS Editor Documentation</h1>
                </div>
                <p>
                    The documention is still Work In Progress and is <a target="blank" href="https://github.com/BabylonJS/Editor/tree/v4.2.0/doc/00%20-%20welcome/doc.md">
                        available here on Github</a>.
                    </p>
                <iframe src="./_doc/00 - welcome/doc.html" style={{ position: "absolute", border: "none", width: "100%", height: "100%", background: "rgb(20, 20, 20)" }}></iframe>
            </div>
        )
    }
}
