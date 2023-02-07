import { IStringDictionary } from "../../../shared/types";

import * as React from "react";
import { Tabs, Tab, TabId, Tooltip, MaybeElement } from "@blueprintjs/core";

import { Icon } from "../../editor/gui/icon";

import { AbstractInspector } from "../../editor/components/inspectors/abstract-inspector";
import { AbstractEditorPlugin, IEditorPluginProps } from "../../editor/tools/plugin";

import { DecalsPainterInspector } from "./decals/inspector";
import { FoliagePainterInspector } from "./foliage/inspector";
// import { TerrainPainterInspector } from "./terrain/inspector";

export const title = "Painting Tools";

export interface IPaintingTools {
    /**
     * Defines wether or not the tool is ready.
     */
    isReady: boolean;
    /**
     * Defines the height of the panel.
     */
    height: number;
    /**
     * Defines the Id of the 
     */
    tabId: TabId;
}

export default class PaintingToolsPlugin extends AbstractEditorPlugin<IPaintingTools> {
    private _tools: IStringDictionary<AbstractInspector<any, any>> = {};

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IEditorPluginProps) {
        super(props);

        // State
        this.state = {
            height: 0,
            tabId: "decals",
            isReady: this.editor.isInitialized,
        };

        // Register
        if (!this.editor.isInitialized) {
            this.editor.editorInitializedObservable.addOnce(() => {
                this.setState({ isReady: true }, () => this.resize());
            });
        }
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        if (!this.state.isReady) {
            return null;
        }

        const tabs = [
            this._createTabComponent("Decals", "cylinder.svg", <DecalsPainterInspector ref={(ref) => this._getTool("decals", ref)} toolId={"decals"} editor={this.editor} _objectRef={null} />),
            this._createTabComponent("Foliage", "grass.svg", <FoliagePainterInspector ref={(ref) => this._getTool("foliage", ref)} toolId={"foliage"} editor={this.editor} _objectRef={null} />),
            // this._createTabComponent(
            //     "Terrain",
            //     <Icon src="terrain.svg" style={{ width: "20px", height: "20px", filter: "none" }} />,
            //     <TerrainPainterInspector ref={(ref) => this._getTool("terrain", ref)} toolId="terrain" editor={this.editor} _objectRef={null} />
            // ),
        ];

        return (
            <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
                <Tabs
                    animate
                    vertical
                    children={tabs}
                    key="painting-tabs"
                    renderActiveTabPanelOnly={true}
                    selectedTabId={this.state.tabId}
                    onChange={(id) => this._handleTabChanged(id)}
                ></Tabs>
            </div>
        );
    }

    /**
     * Called on the plugin is ready.
     */
    public onReady(): void {
        this.resize();
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {
        // Nothing to do.
    }

    /**
     * Called on the panel has been resized.
     */
    public resize(): void {
        const size = this.editor.getPanelSize(title);
        if (size) {
            this.setState({ height: size.height }, () => {
                size.height += 45;

                for (const tool in this._tools) {
                    this._tools[tool]?.resize(size);
                }
            });
        }
    }

    /**
     * Called on the user changes the active tab.
     */
    private _handleTabChanged(tabId: TabId): void {
        this.setState({ tabId }, () => {
            this.resize();
        });
    }

    /**
     * Returns a new tab element containing the given component.
     */
    private _createTabComponent(title: string, icon: string | MaybeElement, component: React.ReactElement): React.ReactNode {
        const id = title.toLowerCase();

        const tabTitle = (
            <div style={{ width: "100%" }}>
                <Tooltip content={title} usePortal>
                    {typeof (icon) === "string" ? <Icon src={icon} style={{ width: "20px", height: "20px" }} /> : icon}
                </Tooltip>
            </div>
        );

        const panel = (
            <div style={{ /*marginLeft: "-40px",*/marginLeft: "-20px", marginTop: "5px", borderLeftColor: "#838383", borderLeftWidth: "2px", borderLeftStyle: "groove" }}>
                {component}
            </div>
        );

        return (
            <Tab id={id} title={tabTitle} key={id} panel={panel} style={{ width: "42px" }} />
        );
    }

    /**
     * Registers the given tool reference to the tools dictionary.
     */
    private _getTool(title: string, ref: any): void {
        this._tools[title] = ref;
    }
}
