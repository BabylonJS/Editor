import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes, Tabs, Tab, Tag, Divider, Intent } from "@blueprintjs/core";

import { Observer, Scene } from "babylonjs";

import { AbstractEditorPlugin, IEditorPluginProps } from "../../editor/tools/plugin";

export const title = "Stats";

export interface IStatsState {
    // Common
    averageFPS?: number;
    instantaneousFPS?: number;

    averageFrameTime?: number;
    instantaneousFrameTime?: number;

    // Count
    activeFaces?: number;
    activeIndices?: number;

    activeMeshes?: number;

    totalVertices?: number;

    totalMeshes?: number;
    totalMaterials?: number;
    totalTextures?: number;
}

export default class StatsPlugin extends AbstractEditorPlugin<IStatsState> {
    private _afterRenderObserver: Nullable<Observer<Scene>> = null;
    private _lastTime: number = 0;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IEditorPluginProps) {
        super(props);

        this.state = { };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const common = (
            <div>
                <Divider style={{ backgroundColor: "dimgrey" }}>FPS</Divider>
                <Tag key="averageFPS" fill={true} intent={(this.state.averageFPS ?? 60) < 30 ? Intent.WARNING : Intent.NONE}>FPS: {this.state.averageFPS?.toFixed(2)}</Tag>
                <Tag key="instantaneousFPS" fill={true}>Instantaneous FPS: {this.state.instantaneousFPS?.toFixed(2)}</Tag>
                <Divider style={{ backgroundColor: "dimgrey" }}>Frame Time</Divider>
                <Tag key="averageFrameTime" fill={true}>Average Frame Time: {this.state.averageFrameTime?.toFixed(2)}</Tag>
                <Tag key="instantaneousFrameTime" fill={true}>Instantaneous Frame Time: {this.state.instantaneousFrameTime?.toFixed(2)}</Tag>
            </div>
        );
        
        const count = (
            <div>
                <Divider style={{ backgroundColor: "dimgrey" }}>Active Vertices</Divider>
                <Tag key="activeFaces" fill={true}>Active Faces: {this.state.activeFaces}</Tag>
                <Tag key="activeIndices" fill={true}>Active Indices: {this.state.activeIndices}</Tag>
                <Divider style={{ backgroundColor: "dimgrey" }}>Active</Divider>
                <Tag key="activeMeshes" fill={true}>Active Meshes: {this.state.activeMeshes}</Tag>
                <Divider style={{ backgroundColor: "dimgrey" }}>Total Vertices</Divider>
                <Tag key="totalVertices" fill={true}>Total Vertices: {this.state.totalVertices}</Tag>
                <Divider style={{ backgroundColor: "dimgrey" }}>Total Others</Divider>
                <Tag key="totalMeshes" fill={true}>Total Meshes: {this.state.totalMeshes}</Tag>
                <Tag key="totalMaterials" fill={true}>Total Materials: {this.state.totalMaterials}</Tag>
                <Tag key="totalTextures" fill={true}>Total Textures: {this.state.totalTextures}</Tag>
            </div>
        );

        return (
            <div key="main-div" className={Classes.FILL} style={{ width: "100%", height: "100%" }}>
                <Tabs key="tabs" animate={true} renderActiveTabPanelOnly={true} vertical={false}>
                    <Tab id="common" key="common-tab" title="Common" panel={common} />
                    <Tab id="count" key="count-tab" title="Count" panel={count} />
                </Tabs>
            </div>
        );
    }

    /**
     * Called on the plugin is ready.
     */
    public onReady(): void {
        if (this.editor.isInitialized) {
            return this._register();
        }

        this.editor.editorInitializedObservable.addOnce(() => this._register());
    }

    /**
     * Called on the panel has been resized.
     */
    public resize(): void {

    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {
        this.editor.scene!.onAfterRenderObservable.remove(this._afterRenderObserver);
    }

    /**
     * Registers the on after render observable to update stats.
     */
    private _register(): void {
        this._afterRenderObserver = this.editor.scene!.onAfterRenderObservable.add(() => {
            this._lastTime += this.editor.engine!.getDeltaTime();
            if (this._lastTime < 500) { return; }

            this._lastTime = 0;

            const p = this.editor.engine!.performanceMonitor;
            const s = this.editor.scene!;

            this.setState({
                averageFPS: p.averageFPS,
                instantaneousFPS: p.instantaneousFPS,

                averageFrameTime: p.averageFrameTime,
                instantaneousFrameTime: p.instantaneousFrameTime,

                activeFaces: s.getActiveIndices() / 3,
                activeIndices: s.getActiveIndices(),

                activeMeshes: s.getActiveMeshes().length,

                totalVertices: s.getTotalVertices(),

                totalMeshes: s.meshes.length,
                totalMaterials: s.materials.length,
                totalTextures: s.textures.length,
            });
        });
    }
}
