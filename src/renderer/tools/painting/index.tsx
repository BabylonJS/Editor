import * as React from "react";
import { Tabs, Tab, TabId } from "@blueprintjs/core";

import { AbstractEditorPlugin, IEditorPluginProps } from "../../editor/tools/plugin";
import { AbstractInspector } from "../../editor/inspectors/abstract-inspector";

import { DecalsPainterInspector } from "./decals/inspector";
// import { FoliagePainterInspector } from "./foliage/inspector";

export const title = "Painting Tools";

export interface IPaintingTools {
    /**
     * Defines wether or not the tool is ready.
     */
    isReady: boolean;
    /**
     * Defines the Id of the 
     */
    tabId: TabId;
}

export default class PreviewPlugin extends AbstractEditorPlugin<IPaintingTools> {
    private _tools: AbstractInspector<any>[] = [];
    private _refHandler = {
        getTool: (ref: any) => {
            if (!ref) { return; }
            const index = this._tools.indexOf(ref);
            if (index === -1) { this._tools.push(ref); }
        },
    };

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IEditorPluginProps) {
        super(props);

        // State
        this.state = { isReady: this.editor.isInitialized, tabId: "decals" };
        
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
        if (!this.state.isReady) { return null; }

        const tabs = [
            <Tab id="decals" title="Decals" key="decals" panel={<DecalsPainterInspector ref={this._refHandler.getTool} toolId={"decals"} editor={this.editor} _objectRef={null} />} />,
            // <Tab id="foliage" title="Foliage" key="foliage" panel={<FoliagePainterInspector ref={this._refHandler.getTool} toolId={"foliage"} editor={this.editor} _objectRef={null} />} />
        ];

        return (
            <Tabs
                animate={true}
                key="painting-tabs"
                renderActiveTabPanelOnly={true}
                vertical={false}
                children={tabs}
                onChange={(id) => this.setState({ tabId: id })}
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
            this._tools.forEach((t) => t?.resize(size));
        }
    }
}
