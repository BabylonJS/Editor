import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes, Tabs, Tab, Tag, Divider, Intent } from "@blueprintjs/core";

import { Observer, Scene, EngineInstrumentation, SceneInstrumentation } from "babylonjs";

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
    activeBones?: number;
    activeParticles?: number;

    activeMeshes?: number;
    drawCalls?: number;

    totalVertices?: number;

    totalMeshes?: number;
    totalMaterials?: number;
    totalTextures?: number;
    totalLights?: number;

    // Durations
    gpuFrameTime?: number;
    gpuFrameTimeAvarage?: number;

    absoluteFPS?: number;
    render?: number;
    frameTotal?: number;
    interFrame?: number;

    meshSelection?: number;
    renderTargets?: number;
    animations?: number;
    particles?: number;
    physics?: number;
}

export default class StatsPlugin extends AbstractEditorPlugin<IStatsState> {
    private _afterRenderObserver: Nullable<Observer<Scene>> = null;
    private _lastTime: number = 0;

    private _engineInstrumentation: Nullable<EngineInstrumentation> = null;
    private _sceneInstrumentation: Nullable<SceneInstrumentation> = null;

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
                <Divider style={{ backgroundColor: "#333333", borderRadius: "5px", paddingLeft: "3px" }}>FPS</Divider>
                <Tag key="averageFPS" fill={true} intent={(this.state.averageFPS ?? 60) < 30 ? Intent.WARNING : Intent.PRIMARY}>FPS: {this.state.averageFPS?.toFixed(2)}</Tag>
                <Tag intent={Intent.PRIMARY} key="instantaneousFPS" fill={true}>Instantaneous FPS: {this.state.instantaneousFPS?.toFixed(2)}</Tag>
                <Divider style={{ backgroundColor: "#333333", borderRadius: "5px", paddingLeft: "3px" }}>Frame Time</Divider>
                <Tag intent={Intent.PRIMARY} key="averageFrameTime" fill={true}>Average Frame Time: {this.state.averageFrameTime?.toFixed(2)} ms</Tag>
                <Tag intent={Intent.PRIMARY} key="instantaneousFrameTime" fill={true}>Instantaneous Frame Time: {this.state.instantaneousFrameTime?.toFixed(2)} ms</Tag>
            </div>
        );
        
        const count = (
            <div>
                <Divider style={{ backgroundColor: "#333333", borderRadius: "5px", paddingLeft: "3px" }}>Active Vertices</Divider>
                <Tag intent={Intent.PRIMARY} key="activeFaces" fill={true}>Active Faces: {this.state.activeFaces}</Tag>
                <Tag intent={Intent.PRIMARY} key="activeIndices" fill={true}>Active Indices: {this.state.activeIndices}</Tag>
                <Tag intent={Intent.PRIMARY} key="activeBones" fill={true}>Active Bones: {this.state.activeBones}</Tag>
                <Tag intent={Intent.PRIMARY} key="activeParticles" fill={true}>Active Particles: {this.state.activeParticles}</Tag>
                <Divider style={{ backgroundColor: "#333333", borderRadius: "5px", paddingLeft: "3px" }}>Active</Divider>
                <Tag intent={Intent.PRIMARY} key="activeMeshes" fill={true}>Active Meshes: {this.state.activeMeshes}</Tag>
                <Tag intent={Intent.PRIMARY} key="drawCalls" fill={true}>Draw Calls: {this.state.drawCalls}</Tag>
                <Divider style={{ backgroundColor: "#333333", borderRadius: "5px", paddingLeft: "3px" }}>Total Vertices</Divider>
                <Tag intent={Intent.PRIMARY} key="totalVertices" fill={true}>Total Vertices: {this.state.totalVertices}</Tag>
                <Divider style={{ backgroundColor: "#333333", borderRadius: "5px", paddingLeft: "3px" }}>Total Others</Divider>
                <Tag intent={Intent.PRIMARY} key="totalMeshes" fill={true}>Total Meshes: {this.state.totalMeshes}</Tag>
                <Tag intent={Intent.PRIMARY} key="totalMaterials" fill={true}>Total Materials: {this.state.totalMaterials}</Tag>
                <Tag intent={Intent.PRIMARY} key="totalTextures" fill={true}>Total Textures: {this.state.totalTextures}</Tag>
                <Tag intent={Intent.PRIMARY} key="totalLights" fill={true}>Total Lights: {this.state.totalLights}</Tag>
            </div>
        );

        const durations = (
            <div>
                <Divider style={{ backgroundColor: "#333333", borderRadius: "5px", paddingLeft: "3px" }}>GPU</Divider>
                <Tag intent={Intent.PRIMARY} key="gpuFrameTime" fill={true}>GPU Frame Time: {this.state.gpuFrameTime?.toFixed(2)} ms</Tag>
                <Tag intent={Intent.PRIMARY} key="gpuFrameTimeAvarage" fill={true}>GPU Frame Time (Average): {this.state.gpuFrameTimeAvarage?.toFixed(2)} ms</Tag>
                <Divider style={{ backgroundColor: "#333333", borderRadius: "5px", paddingLeft: "3px" }}>Scene</Divider>
                <Tag intent={Intent.PRIMARY} key="absoluteFPS" fill={true}>Absolute FPS: {this.state.absoluteFPS?.toFixed(0)}</Tag>
                <Tag intent={Intent.PRIMARY} key="render" fill={true}>Render: {this.state.render} ms</Tag>
                <Tag intent={Intent.PRIMARY} key="frameTotal" fill={true}>Frame Total: {this.state.frameTotal?.toFixed(2)} ms</Tag>
                <Tag intent={Intent.PRIMARY} key="interFrame" fill={true}>Inter-frame: {this.state.interFrame?.toFixed(2)} ms</Tag>
                <Divider style={{ backgroundColor: "#333333", borderRadius: "5px", paddingLeft: "3px" }}>Elements</Divider>
                <Tag intent={Intent.PRIMARY} key="meshSelection" fill={true}>Mesh Selection: {this.state.meshSelection?.toFixed(2)} ms</Tag>
                <Tag intent={Intent.PRIMARY} key="renderTargets" fill={true}>Render Targets: {this.state.renderTargets?.toFixed(2)} ms</Tag>
                <Tag intent={Intent.PRIMARY} key="animations" fill={true}>Animations: {this.state.animations?.toFixed(2)} ms</Tag>
                <Tag intent={Intent.PRIMARY} key="particles" fill={true}>Particles: {this.state.particles?.toFixed(2)} ms</Tag>
                <Tag intent={Intent.PRIMARY} key="physics" fill={true}>Physics: {this.state.physics?.toFixed(2)} ms</Tag>
            </div>
        );

        return (
            <div key="main-div" className={Classes.FILL} style={{ width: "100%", height: "100%", overflow: "auto" }}>
                <Tabs key="tabs" animate={true} renderActiveTabPanelOnly={true} vertical={false}>
                    <Tab id="common" key="common-tab" title="Common" panel={common} />
                    <Tab id="count" key="count-tab" title="Count" panel={count} />
                    <Tab id="durations" key="durations-tab" title="Durations" panel={durations} />
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

        this._engineInstrumentation?.dispose();
        this._sceneInstrumentation?.dispose();
    }

    /**
     * Registers the on after render observable to update stats.
     */
    private _register(): void {
        this._sceneInstrumentation = new SceneInstrumentation(this.editor.scene!);
        this._sceneInstrumentation.captureActiveMeshesEvaluationTime = true;
        this._sceneInstrumentation.captureRenderTargetsRenderTime = true;
        this._sceneInstrumentation.captureFrameTime = true;
        this._sceneInstrumentation.captureRenderTime = true;
        this._sceneInstrumentation.captureInterFrameTime = true;
        this._sceneInstrumentation.captureParticlesRenderTime = true;
        this._sceneInstrumentation.captureSpritesRenderTime = true;
        this._sceneInstrumentation.capturePhysicsTime = true;
        this._sceneInstrumentation.captureAnimationsTime = true;

        this._engineInstrumentation = new EngineInstrumentation(this.editor.engine!);
        this._engineInstrumentation.captureGPUFrameTime = true;

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
                activeBones: s.getActiveBones(),
                activeParticles: s.getActiveParticles(),

                activeMeshes: s.getActiveMeshes().length,
                drawCalls: this._sceneInstrumentation!.drawCallsCounter.current,

                totalVertices: s.getTotalVertices(),

                totalMeshes: s.meshes.length,
                totalMaterials: s.materials.length,
                totalTextures: s.textures.length,
                totalLights: s.lights.length,

                gpuFrameTime: this._engineInstrumentation!.gpuFrameTimeCounter.lastSecAverage * 0.000001,
                gpuFrameTimeAvarage: this._engineInstrumentation!.gpuFrameTimeCounter.average * 0.000001,

                absoluteFPS: 1000 / this._sceneInstrumentation!.frameTimeCounter.lastSecAverage,
                render: this._sceneInstrumentation?.renderTimeCounter.lastSecAverage,
                frameTotal: this._sceneInstrumentation?.frameTimeCounter.lastSecAverage,
                interFrame: this._sceneInstrumentation?.interFrameTimeCounter.lastSecAverage,

                meshSelection: this._sceneInstrumentation?.activeMeshesEvaluationTimeCounter.lastSecAverage,
                renderTargets: this._sceneInstrumentation?.renderTargetsRenderTimeCounter.lastSecAverage,
                animations: this._sceneInstrumentation?.animationsTimeCounter.lastSecAverage,
                particles: this._sceneInstrumentation?.physicsTimeCounter.lastSecAverage,
                physics: this._sceneInstrumentation?.physicsTimeCounter.lastSecAverage,
            });
        });
    }
}
