import * as React from "react";
import { Alignment, Navbar, Tab, TabId, Tabs } from "@blueprintjs/core";

import { HomeContent } from "./contents/home";
import { DocumentationContent } from "./contents/documentation";
import { DownloadContent } from "./contents/download";

export interface IWebSiteNavBarProps {
    // Empty at the moment.
}

export interface IWebSiteNavBarState {
    /**
     * Defines the id of the selected tab.
     */
    tabId: TabId;
}

export class WebSiteNavBar extends React.Component<IWebSiteNavBarProps, IWebSiteNavBarState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IWebSiteNavBarProps) {
        super(props);

        this.state = {
            tabId: "home",
        };
    }
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        // Get selected content
        let content: React.ReactNode;
        switch (this.state.tabId) {
            case "home": content = <HomeContent />; break;
            case "documentation": content = <DocumentationContent />; break;
            case "download": content = <DownloadContent />; break;
        }

        return (
            <>
                <Navbar style={{ backgroundColor: "#201936" }}>
                    <Navbar.Group>
                        <Navbar.Heading>
                            <img width="200" height="200" src="./img/babylonjs_logo.svg"></img>
                        </Navbar.Heading>
                        <Navbar.Heading>
                            <strong>Babylon.JS Editor</strong>
                        </Navbar.Heading>
                    </Navbar.Group>
                    <Navbar.Group align={Alignment.RIGHT}>
                        <Tabs
                            animate={true}
                            large={true}
                            onChange={(tabId) => this._handleTabChanged(tabId)}
                        >
                            <Tab id="home" title="Home" key="home-tab" />
                            <Tab id="documentation" title="Documentation" key="documentation-tab" />
                            <Tab id="download" title="Download" key="download-tab" />
                        </Tabs>
                    </Navbar.Group>
                </Navbar>
                {content}
            </>
        );
    }

    /**
     * Called on the user changes the current tab.
     */
    private _handleTabChanged(tabId: TabId): void {
        this.setState({ tabId });
    }
}
