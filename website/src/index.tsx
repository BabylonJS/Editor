import * as React from "react";
import * as ReactDOM from "react-dom";
import { WebSiteNavBar } from "./navbar";

import "../../node_modules/@blueprintjs/core/lib/css/blueprint.css";
import "../../node_modules/@blueprintjs/core/lib/css/blueprint-hi-contrast.css";

export class WebSite extends React.Component {
    /**
     * Inits the website.
     */
    public static Init(): void {
        const div = document.getElementById("editor-website-div");
        ReactDOM.render(<WebSite />, div);
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div style={{ width: "100%" }}>
                <WebSiteNavBar />
            </div>
        )
    }
}
