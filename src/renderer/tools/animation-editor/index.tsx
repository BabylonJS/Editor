import { Nullable } from "../../../shared/types";

import * as React from "react";
import { Classes, ButtonGroup, Button, NonIdealState, Tabs, TabId, Tab } from "@blueprintjs/core";

import GoldenLayout from "golden-layout";

import { Animation, IAnimatable, Node, Observer, Scene, SubMesh } from "babylonjs";

import { AbstractEditorPlugin, IEditorPluginProps } from "../../editor/tools/plugin";

import { Icon } from "../../editor/gui/icon";
import { Select } from "../../editor/gui/select";

import { Tools } from "../../editor/tools/tools";

import { ChartEditor, IChartEditorProps } from "./chart-editor";
import { TimelineEditor } from "./timeline/timeline";
import { AnimationsPanel } from "./animations-panel";

import { SelectedTab, SyncType } from "./tools/types";
import { AnimationObject } from "./tools/animation-object";
import { ISyncAnimatable, SyncTool } from "./tools/sync-tools";
import { AnimationTools } from "./tools/animation-to-dataset";

import "./inspectors/key-inspector";
import "./inspectors/animation-inspector";

export const title = "Animation Editor";

export interface IAnimationEditorPluginState {
    /**
     * Defines the reference to the selected animatable.
     */
    selectedAnimatable: Nullable<IAnimatable & { name?: string; }>;
    /**
     * Defines the reference to the selected animation.
     */
    selectedAnimation: Nullable<Animation>;
    /**
     * Defines the reference to the animatable.
     */
    playingAnimatables: ISyncAnimatable[];
    /**
     * Defines the synchronization type for animation when playing/moving time tracker.
     */
    synchronizationType: SyncType;
    /**
     * Defines the Id of the selected tab.
     */
    selectedTab: TabId;
}

export default class AnimationEditorPlugin extends AbstractEditorPlugin<IAnimationEditorPluginState> {
    private _timelineEditor: Nullable<TimelineEditor> = null;

    private _graphDiv: Nullable<HTMLDivElement> = null;
    private _graphAnimationsPanel: Nullable<AnimationsPanel> = null;
    private _chartEditor: Nullable<ChartEditor> = null;

    private _refHandler = {
        getTimelineEditor: (ref: TimelineEditor) => this._timelineEditor = ref,

        getGraphDiv: (ref: HTMLDivElement) => this._graphDiv = ref,
        getGraphAnimationsPanel: (ref: AnimationsPanel) => this._graphAnimationsPanel = ref,
        getChartEdior: (ref: ChartEditor) => this._chartEditor = ref,
    };

    private _graphLayout: Nullable<GoldenLayout> = null;

    private _selectedNodeObserver: Nullable<Observer<Node>> = null;
    private _selectedSceneObserver: Nullable<Observer<Scene>> = null;
    private _selectedSubMeshObserver: Nullable<Observer<SubMesh>> = null;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IEditorPluginProps) {
        super(props);

        this.state = {
            playingAnimatables: [],
            selectedAnimation: null,
            selectedAnimatable: null,
            selectedTab: SelectedTab.Graph,
            synchronizationType: SyncType.Scene,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        let noAnimatable: React.ReactNode;
        if (!this.state.selectedAnimatable) {
            noAnimatable = (
                <NonIdealState
                    icon="citation"
                    title="No Animatable Selected."
                    description={`Please first select a node in the scene to add/edit its animations.`}
                />
            );
        }

        return (
            <div style={{ width: "100%", height: "100%" }}>
                {noAnimatable}
                <div className={Classes.FILL} key="documentation-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px", visibility: (this.state.selectedAnimatable ? "visible" : "hidden") }}>
                    <ButtonGroup className={Classes.DARK}>
                        <Button small={true} disabled={this.state.selectedTab === SelectedTab.Timeline || this.state.selectedAnimation === null} text="Add Single Key" icon="key" onClick={() => this._handleAddKey(SyncType.Animation)}  />
                        <Button small={true} disabled={this.state.selectedAnimation === null} text="Add Key" icon="key" onClick={() => this._handleAddKey()}  />
                    </ButtonGroup>
                    <ButtonGroup style={{ float: "right" }}>
                        <Select
                            items={[SyncType.Animation, SyncType.Object, SyncType.Scene]}
                            text={`Sync type: ${this.state.synchronizationType}`}
                            onChange={(v) => this._handleSyncTypeChanged(SyncType[v])}
                        />
                    </ButtonGroup>
                </div>
                <div style={{ width: "100%", height: "calc(100% - 30px)", visibility: (this.state.selectedAnimatable ? "visible" : "hidden") }}>
                    <div style={{ position: "relative", width: "100%", height: "100%" }}>
                        <Tabs
                            selectedTabId={this.state.selectedTab}
                            renderActiveTabPanelOnly={false}
                            onChange={(selectedTab) => this._handleTabChanged(selectedTab)}
                        >
                            <Tab
                                id={SelectedTab.Timeline}
                                title="Timeline"
                                panel={
                                    <div style={{ position: "absolute", width: "100%", height: "100%" }}>
                                        <TimelineEditor
                                            ref={this._refHandler.getTimelineEditor}
                                            editor={this.editor}
                                            synchronizationType={this.state.synchronizationType}
                                            selectedAnimatable={this.state.selectedAnimatable}
                                            onUpdatedKey={() => this._chartEditor?.refresh()}
                                            onFrameChange={(v) => this._chartEditor?.setCurrentFrameValue(v)}
                                        />
                                    </div>
                                }
                            />
                            <Tab
                                id={SelectedTab.Graph}
                                title="Graph"
                                panel={
                                    <div
                                        ref={this._refHandler.getGraphDiv}
                                        style={{ position: "absolute", width: "100%", height: "100%" }}
                                    ></div>
                                }
                            />
                        </Tabs>
                        <ButtonGroup style={{ position: "relative", left: "50%", transform: "translate(-50%)", top: "-40px" }}>
                            <Button disabled={!this.state.selectedAnimation || this.state.playingAnimatables.length > 0} icon={<Icon src="play.svg"/>} text="Play" onClick={() => this._handlePlayAnimation()} />
                            <Button disabled={this.state.playingAnimatables.length === 0} icon={<Icon src="square-full.svg" />} text="Stop" onClick={() => this._handleStopAnimation()} />
                        </ButtonGroup>
                    </div>
                </div>
            </div>
        );
    }

    /**
     * Called on the plugin is ready.
     */
    public onReady(): void {
        // Build layout
        if (!this._graphDiv) { return; }

        this._graphLayout = new GoldenLayout( {
            settings: {
                showPopoutIcon: false,
                showCloseIcon: false,
                showMaximiseIcon: true,
                reorderEnabled: false,
            },
            dimensions: {
                minItemWidth: 240,
                minItemHeight: 50
            },
            labels: {
                close: "Close",
                maximise: "Maximize",
                minimise: "Minimize"
            },
            content: [
                { type: "row", content: [
                    { type: "react-component", id: "animations-list", component: "animations-list", componentName: "Animations", title: "Animations", isClosable: false, width: 33, props: {
                        ref: this._refHandler.getGraphAnimationsPanel,
                        selectedAnimatable: this.state.selectedAnimatable,
                        onSelectedAnimation: (a) => this._handleSelectedAnimation(a, true),
                    } },
                    { type: "react-component", id: "graph", component: "graph", componentName: "Graph", title: "Graph", isClosable: false, props: {
                        ref: this._refHandler.getChartEdior,
                        editor: this.editor,
                        synchronizationType: this.state.synchronizationType,
                        onFrameChange: (v) => this._timelineEditor?.setCurrentFrameValue(v),
                    } as IChartEditorProps },
                ] },
            ],
        }, $(this._graphDiv));
        
        this._graphLayout.registerComponent("animations-list", AnimationsPanel);
        this._graphLayout.registerComponent("graph", ChartEditor);

        this._graphLayout.init();

        // Register events
        this._selectedNodeObserver = this.editor.selectedNodeObservable.add((n) => this._handleAnimatableSelected(n));
        this._selectedSceneObserver = this.editor.selectedSceneObservable.add((s) => this._handleAnimatableSelected(s));
        this._selectedSubMeshObserver = this.editor.selectedSubMeshObservable.add((sm) => this._handleAnimatableSelected(sm.getMesh()));
    }

    /**
     * Called on the plugin is closed.
     */
    public onClose(): void {
        // Reset all
        this._chartEditor?.resetObjectToFirstFrame();

        // Remove event listeners
        this.editor.selectedNodeObservable.remove(this._selectedNodeObserver);
        this.editor.selectedSceneObservable.remove(this._selectedSceneObserver);
        this.editor.selectedSubMeshObservable.remove(this._selectedSubMeshObserver);
    }

    /**
     * Called on the panel has been resized.
     */
    public resize(): void {
        setTimeout(() => {
            this._graphLayout?.updateSize();
        }, 0);
    }

    /**
     * Called on the user changed the current tab.
     */
    private _handleTabChanged(selectedTab: TabId): void {
        this.setState({ selectedTab });
        setTimeout(() => this.resize(), 0);

        this._timelineEditor?.chart?.update(0);
        this._chartEditor?.chart?.update(0);
    }

    /**
     * Called on the user changes the synchronzation type.
     */
    private _handleSyncTypeChanged(synchronizationType: SyncType): void {
        this._chartEditor?.setSyncType(synchronizationType);
        this.setState({ synchronizationType });
    }

    /**
     * Called on the user selected a node.
     */
    private _handleAnimatableSelected(animatable: IAnimatable): void {
        if (this.state.selectedAnimatable === animatable || !animatable.animations) {
            return;
        }

        this.setState({ selectedAnimatable: animatable });

        this._timelineEditor?.setAnimatable(animatable);
        this._graphAnimationsPanel?.setAnimatable(animatable);
        this._chartEditor?.setAnimatable(animatable);

        this._handleSelectedAnimation(animatable.animations[0] ?? null, false);
    }

    /**
     * Called on the user selects an animation.
     */
    private _handleSelectedAnimation(animation: Nullable<Animation>, notifySelected: boolean): void {
        if (this.state.selectedAnimatable) {
            this._timelineEditor?.setAnimatable(this.state.selectedAnimatable);
        }

        this._chartEditor?.setAnimation(animation, true);

        this.setState({ selectedAnimation: animation }, () => {
            if (notifySelected) {
                this._handleEditAnimation();
            }
        });
    }

    /**
     * Called on the user wants to play the animation.
     */
    private _handlePlayAnimation(): void {
        if (!this.state.selectedAnimatable || !this.state.selectedAnimation || !this._chartEditor?.timeTracker) { return; }

        const range = AnimationTools.GetFramesRange(this.state.selectedAnimation);

        let fromFrame = this._chartEditor.timeTracker.getValue();
        if (fromFrame === range.max) {
            fromFrame = 0;
        }

        const animatables = SyncTool.PlayAnimation(
            fromFrame,
            this.state.synchronizationType,
            this.state.selectedAnimatable,
            this.state.selectedAnimation,
            this.editor.scene!,
            () => {
                this.setState({ playingAnimatables: [] });
            },
        );

        this._chartEditor.playAnimation(fromFrame);
        this.setState({ playingAnimatables: animatables });
    }

    /**
     * Called on the user wants to stop the animation.
     */
    private _handleStopAnimation(): void {
        if (!this.state.playingAnimatables || !this.state.selectedAnimatable) { return; }

        this.state.playingAnimatables.forEach((a) => {
            a.animatable.stop();
            this.editor.scene!.stopAnimation(a.object);
        });

        if (this._chartEditor) {
            this._chartEditor.stopAnimation();
        }

        this.setState({ playingAnimatables: [] });
    }

    /**
     * Called on the user wants to edit the animation.
     */
    private _handleEditAnimation(): void {
        if (!this.state.selectedAnimation) { return; }

        this.editor.inspector.setSelectedObject(new AnimationObject(this.state.selectedAnimation, () => {
            // Nothing to do at the moment
        }));
    }

    /**
     * Called on the user wants to add a new key.
     */
    private _handleAddKey(syncType?: SyncType): void {
        if (!this._chartEditor?.timeTracker || !this.state.selectedAnimatable?.animations || !this.state.selectedAnimation) { return; }

        const frame = this._chartEditor.timeTracker.getValue();

        let animations: Animation[] = [];
        switch (syncType ?? this.state.synchronizationType) {
            case SyncType.Animation:
                animations = [this.state.selectedAnimation];
                break;
            
            case SyncType.Object:
            case SyncType.Scene:
                animations = this.state.selectedAnimatable.animations;
                break;
        }

        for (const animation of animations) {
            const property = Tools.GetProperty<any>(this.state.selectedAnimatable, animation.targetProperty);
            if (property === null) { return; }
            
            const keys = animation.getKeys();
            const existingKey = keys.find((k) => k.frame === frame);

            let value: unknown = null;
            switch (animation.dataType) {
                case Animation.ANIMATIONTYPE_FLOAT:
                    value = property;
                    break;

                case Animation.ANIMATIONTYPE_VECTOR2:
                case Animation.ANIMATIONTYPE_VECTOR3:
                case Animation.ANIMATIONTYPE_COLOR3:
                case Animation.ANIMATIONTYPE_COLOR4:
                    value = property.clone();
                    break;
            }

            if (value === null) { return; }

            if (existingKey) {
                existingKey.value = value;
            } else {
                keys.push({ frame, value });
                keys.sort((a, b) => a.frame - b.frame);
            }
        }

        this._handleSelectedAnimation(this.state.selectedAnimation, false);
    }
}
