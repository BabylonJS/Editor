import { IStringDictionary } from "../../../shared/types";

import * as React from "react";
import { Tabs, Tab, TabId } from "@blueprintjs/core";

import { AbstractEditorPlugin, IEditorPluginProps } from "../../editor/tools/plugin";
import { AbstractInspector } from "../../editor/inspectors/abstract-inspector";

import { DecalsPainterInspector } from "./decals/inspector";
import { ThinInstancePainterInspector } from "./thin-instances/inspector";
// import { MaterialPainterInspector } from "./material/inspector";

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
    private _tools:IStringDictionary<AbstractInspector<any, any>> = {};

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
            this._createTabComponent("Decals", <DecalsPainterInspector ref={(ref) => this._getTool("decals", ref)} toolId={"decals"} editor={this.editor} _objectRef={null} />),
            this._createTabComponent("Thin Instances", <ThinInstancePainterInspector ref={(ref) => this._getTool("thin-instances", ref)} toolId={"decals"} editor={this.editor} _objectRef={null} />),
            // this._createTabComponent("Material", <MaterialPainterInspector ref={(ref) => this._getTool("material", ref)} toolId={"material"} editor={this.editor} _objectRef={null} />),
        ];

        return (
            <Tabs
                animate={true}
                key="painting-tabs"
                renderActiveTabPanelOnly={true}
                vertical={false}
                children={tabs}
                onChange={(id) => this._handleTabChanged(id)}
                selectedTabId={this.state.tabId}
            ></Tabs>
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
    private _createTabComponent(title: string, component: React.ReactElement): React.ReactNode {
        const id = title.toLowerCase();

        return (
            <Tab id={id} title={title} key={id} panel={component} />
        );
    }

    /**
     * Registers the given tool reference to the tools dictionary.
     */
    private _getTool(title: string, ref: any): void {
        this._tools[title] = ref;
    }
}
