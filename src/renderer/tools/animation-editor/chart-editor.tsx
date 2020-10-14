import { Nullable, Undefinable } from "../../../shared/types";

import * as React from "react";
import { Classes, ContextMenu, Intent, Menu, MenuDivider, MenuItem, Pre, Tag } from "@blueprintjs/core";

import Chart, { ChartDataSets } from "chart.js";
import "chartjs-plugin-dragdata";
import "chartjs-plugin-zoom";
import "chartjs-plugin-annotation";
import "chartjs-plugin-dragzone";

import { Animation, IAnimatable, IAnimationKey, KeyboardEventTypes, KeyboardInfo, Observer, Vector2 } from "babylonjs";

import Editor from "../../editor";

import { Icon } from "../../editor/gui/icon";

import { undoRedo } from "../../editor/tools/undo-redo";

import "./tools/augmentations";
import { SyncType } from "./tools/types";
import { SyncTool } from "./tools/sync-tools";
import { TimeTracker } from "./tools/time-tracker";
import { IVector2Like } from "./tools/augmentations";
import { PointSelection } from "./tools/points-select";
import { AnimationTools } from "./tools/animation-to-dataset";
import { AnimationKeyObject } from "./tools/animation-key-object";

export interface IChartEditorProps {
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
    /**
     * Defines the synchronization type for animation when playing/moving time tracker.
     */
    synchronizationType: SyncType;
    /**
     * Defines the callback called on the current frame value changed.
     */
    onFrameChange: (value: number) => void;
}

export interface IChartEditorState {
    /**
     * Defines wether or not the mouse is over the canvas or not.
     */
    isMouseHover: boolean;
    /**
     * Defines the mouse position on the chart (X and Y axis).
     */
    mousePositionOnChart: IVector2Like;
    /**
     * Defines the synchronization type for animation when playing/moving time tracker.
     */
    synchronizationType: SyncType;
    /**
     * Defines the reference to the selected animatable.
     */
    selectedAnimatable: Nullable<IAnimatable>;
    /**
     * Defines the reference to the selected animation.
     */
    selectedAnimation: Nullable<Animation>;
}

export class ChartEditor extends React.Component<IChartEditorProps, IChartEditorState> {
    /**
     * Defines the reference to the chart.
     */
    public chart: Nullable<Chart> = null;
    /**
     * Defines the reference to the time tracker.
     */
    public timeTracker: Nullable<TimeTracker> = null;

    private _editor: Editor;

    private _datasets: ChartDataSets[] = [];

    private _panDisabled: boolean = false;

    private _selection: Nullable<PointSelection> = null;
    private _selectedFrames: number[] = [];

    private _mousePositonOnChart: Vector2 = new Vector2(0, 0);
    private _undoRedoKeyData: Nullable<IVector2Like> = null;

    private _keyboardObserver: Nullable<Observer<KeyboardInfo>>;

    private _canvas: Nullable<HTMLCanvasElement> = null;
    private _refHandler = {
        getCanvas: (ref: HTMLCanvasElement) => this._canvas = ref,
    };

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IChartEditorProps) {
        super(props);

        this._editor = props.editor;
        this.state = {
            isMouseHover: false,
            mousePositionOnChart: { x: 0, y: 0 },
            synchronizationType: props.synchronizationType,
            selectedAnimatable: null,
            selectedAnimation: null,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div style={{ position: "absolute", width: "calc(100% - 10px)", height: "calc(100% - 50px)" }}>
                <canvas
                    ref={this._refHandler.getCanvas}
                    onMouseEnter={() => this.setState({ isMouseHover: true })}
                    onMouseLeave={() => this.setState({ isMouseHover: false })}
                    onMouseMove={(ev) => this._handleMouseMove(ev)}
                    onMouseDown={(ev) => this._handleMouseDown(ev)}
                    onMouseUp={(ev) => this._handleMouseUp(ev)}
                    onDoubleClick={(ev) => this._handleDoubleClick(ev)}
                ></canvas>
                <Tag intent={Intent.PRIMARY} style={{ position: "absolute", right: "0px", top: "0px", visibility: (this.state.isMouseHover ? "visible" : "hidden") }}>Frame: {this.state.mousePositionOnChart.x}</Tag>
                <Tag intent={Intent.PRIMARY} style={{ position: "absolute", right: "0px", top: "25px", visibility: (this.state.isMouseHover ? "visible" : "hidden") }}>Value: {this.state.mousePositionOnChart.y}</Tag>
            </div>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        if (!this._canvas) {
            return;
        }

        // Register events
        this._keyboardObserver = this._editor.onKeyboardEventObservable.add((infos) => this._handleKeyboardEvent(infos));

        // Create chart
        this.chart = new Chart(this._canvas.getContext("2d")!, {
            type: "line",
            data: {
                datasets: [],
            },
            options: {
                dragData: true,
                dragX: true,
                onDragStart: () => this._handleDragPointStart(),
                onDrag: (e, di, i, v) => this._handleDragPoint(e, di, i, v),
                onDragEnd: (e, di, i, v) => this._handleDragPointEnd(e, di, i, v),
                onClick: (e, elements) => this._handleChartClick(e, elements),
                showLines: false,
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0,
                },
                tooltips: {
                    caretPadding: 15,
                    mode: "point",
                },
                annotation: {
                    events: ["mouseenter", "mouseleave"],
                    annotations: [{
                        drawTime: "afterDatasetsDraw",
                        id: "frame-tracker",
                        type: "line",
                        mode: "vertical",
                        scaleID: "x-axis-0",
                        value: 0,
                        borderColor: "#000000",
                    }, {
                        drawTime: "afterDatasetsDraw",
                        id: "value-tracker",
                        type: "line",
                        mode: "horizontal",
                        scaleID: "y-axis-0",
                        value: 0,
                        borderColor: "#000000",
                    }],
                },
                plugins: {
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: () => (this._panDisabled || this._selection?.ctrlPushed || this.timeTracker?.panDisabled) ? "" : "xy",
                            onPan: () => this.chart?.render(0),
                            onPanComplete: () => this.chart?.render(0),
                        },
                        zoom: {
                            enabled: true,
                            mode: () => {
                                if (this._mousePositonOnChart.x <= this.chart!["scales"]["x-axis-0"].left) { return "y"; }
                                if (this._mousePositonOnChart.y >= this.chart!["scales"]["y-axis-0"].bottom) { return "x"; }
                                return "xy";
                            },
                            onZoom: () => this.chart?.render(0),
                            onZoomComplete: () => this.chart?.render(0),
                        },
                    },
                },
                scales: {
                    xAxes: [{
                        type: "linear",
                        position: "bottom",
                        ticks: {
                            min: -2,
                            max: 60,
                            fontSize: 12,
                            fontStyle: "bold",
                            fontColor: "#222222",
                        },
                    }],
                    yAxes: [{
                        ticks: {
                            min: -10,
                            max: 10,
                            fontSize: 12,
                            fontStyle: "bold",
                            fontColor: "#222222",
                        },
                    }],
                }
            },
        });

        // Create time tracker
        this.timeTracker = new TimeTracker(this.chart, {
            onMoved: () => this._handleTimeTrackerChanged(),
        });
        this.chart.config.options!.annotation.annotations.push(this.timeTracker?.getAnnotationConfiguration());

        // Create selection
        this._selection = new PointSelection(this.chart, {
            onSelectedFrames: (frames) => this._selectedFrames = frames,
        });
        this._selection.configure();
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        // Destroy chart
        try {
            this.chart?.destroy();
        } catch (e) {
            this._editor.console.logError("[Animation Editor]: failed to destroy chart.");
        }

        // Remove events
        this._editor.onKeyboardEventObservable.remove(this._keyboardObserver);
    }

    /**
     * Refreshes the chart editor.
     */
    public refresh(): void {
        this.setAnimation(this.state.selectedAnimation);
        this.updateObjectToCurrentFrame();
    }

    /**
     * Sets the new animatable to edit.
     * @param animatable defines the reference to the animatable.
     */
    public setAnimatable(animatable: IAnimatable): void {
        this.setState({ selectedAnimatable: animatable });
    }

    /**
     * Sets the new animation to edit.
     * @param animation defines the reference of the selected animation to edit.
     * @param animate defines wether or not the chart should be animated.
     */
    public setAnimation(animation: Nullable<Animation>, animate: boolean = false): void {
        if (!this.chart) { return; }

        this._selection?.reset();

        const datasets = AnimationTools.ConvertToDatasets(animation);
        if (!datasets) { return; }

        this.chart.data.datasets = datasets;
        this.chart.config.options!.animation!.duration = animate ? 1000 : 0;

        this.chart.update(this.state.selectedAnimation === animation ? 0 : undefined);

        this._datasets = datasets;
        this.setState({ selectedAnimation: animation });
    }

    /**
     * Sets the new synchronization type.
     * @param synchronizationType defines the new synchronization type.
     */
    public setSyncType(synchronizationType: SyncType): void {
        this.setState({ synchronizationType }, () => {
            if (!this.timeTracker) { return; }

            this.resetObjectToFirstFrame();

            this.timeTracker?.setValue(this.timeTracker.getValue());
            this.updateObjectToCurrentFrame();
        });
    }

    /**
     * Plays the animation (moves the time tracker).
     */
    public playAnimation(from: number, to?: number): void {
        if (!this.chart || !this.timeTracker || !this.state.selectedAnimation) { return; }

        this.timeTracker.playAnimation(this.state.selectedAnimation, this._editor.scene!, from, to);
    }

    /**
     * Stops the animation (moves the time tracker).
     */
    public stopAnimation(): void {
        this.timeTracker?.stopAnimation();
    }

    /**
     * Resets the current object to the first frame.
     */
    public resetObjectToFirstFrame(): void {
        if (!this.chart || !this.timeTracker || !this.state.selectedAnimation) { return; }

        const range = AnimationTools.GetFramesRange(this.state.selectedAnimation);
        this.timeTracker.setValue(range.min);

        this.updateObjectToCurrentFrame();
    }

    /**
     * Updates the current object to the current frame on animation.
     */
    public updateObjectToCurrentFrame(): void {
        if (!this.state.selectedAnimatable || !this.state.selectedAnimation || !this.timeTracker) { return; }

        SyncTool.UpdateObjectToFrame(
            this.timeTracker.getValue(),
            SyncType.Scene,
            this.state.selectedAnimatable,
            this.state.selectedAnimation,
            this._editor.scene!,
        );
    }

    /**
     * Sets the new frame value for the time tracker.
     * @param value defines the new value of time (frame).
     */
    public setCurrentFrameValue(value: number): void {
        this.timeTracker?.setValue(value);
    }

    /**
     * Called on the user moves the time tracker.
     */
    private _handleTimeTrackerChanged(): void {
        if (!this.timeTracker) { return; }

        this.updateObjectToCurrentFrame();
        this.props.onFrameChange(this.timeTracker.getValue());

        this.chart?.render(0);
    }

    /**
     * Called on the user fires a keyboard event.
     */
    private _handleKeyboardEvent(infos: KeyboardInfo): void {
        this._selection?.keyboardEvent(infos);

        if (infos.event.keyCode === 32) {
            if (this.chart?.config.options) {
                this.chart.config.options.dragX = infos.type === KeyboardEventTypes.KEYUP;
            }
        }
    }

    /**
     * Called on the mouse moves on the canvas.
     */
    private _handleMouseMove(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        this.setState({ mousePositionOnChart: this.timeTracker?.getPositionOnChart(ev.nativeEvent) ?? this.state.mousePositionOnChart });
        this._mousePositonOnChart.set(ev.nativeEvent.offsetX, ev.nativeEvent.offsetY);
        this.timeTracker?.mouseMove(ev);
    }

    /**
     * Called on the mouse is down on the canvas.
     */
    private _handleMouseDown(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        this.timeTracker?.mouseDown(ev);
        this._selection?.mouseDown(ev);
    }

    /**
     * Called on the mouse is up on the canvas.
     */
    private _handleMouseUp(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        if (ev.button === 2 && !this.timeTracker?.draggingTimeTracker) {
            return this._handleContextMenu(ev);
        }

        this.timeTracker?.mouseUp(ev);
        this._selection?.mouseUp(ev);
    }

    /**
     * Called on the user double clicks on the chart.
     */
    private _handleDoubleClick(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        if (!this.chart || !this.timeTracker || !this.state.selectedAnimation) { return; }

        const elements = this.chart.getElementsAtEvent(ev);
        if (elements && elements.length > 0) {
            const keys = this.state.selectedAnimation.getKeys();
            const key = keys[elements[0]["_index"]];
            if (!key) { return; }

            this.timeTracker?.setValue(key.frame);
        } else {
            const positionOnChart = this.timeTracker.getPositionOnChart(ev.nativeEvent);
            if (positionOnChart) {
                this.timeTracker?.setValue(Math.max(positionOnChart.x, 0));
            }
        }

        this.chart.update(0);
        this.updateObjectToCurrentFrame();
    }

    /**
     * Called on an element of the chart is starting being dragged.
     */
    private _handleDragPointStart(): void {
        this._panDisabled = true;
    }

    /**
     * Called on an element of the chart is being dragged.
     */
    private _handleDragPoint(ev: MouseEvent, datasetIndex: number, index: number, value: IVector2Like): void {
        const mousePositionOnChart = this.timeTracker?.getPositionOnChart(ev) ?? this.state.mousePositionOnChart;

        if (!this._undoRedoKeyData && this.state.selectedAnimation) {
            this._undoRedoKeyData = { x: value.x, y: value.y };
        }

        this._updateKey(datasetIndex, index, value);
        this.setState({ mousePositionOnChart });
    }

    /**
     * Callback called on an element stops being dragged.
     */
    private _handleDragPointEnd(_: MouseEvent, datasetIndex: number, index: number, value: IVector2Like): void {
        if (this._undoRedoKeyData && this.state.selectedAnimation) {
            const undoData = { x: this._undoRedoKeyData.x, y: this._undoRedoKeyData.y };
            const redoData = { x: value.x, y: value.y };

            undoRedo.push({
                common: () => this.chart?.update(0),
                undo: () => this._updateKey(datasetIndex, index, undoData),
                redo: () => this._updateKey(datasetIndex, index, redoData),
            });
        } else {
            this._updateKey(datasetIndex, index, value);
        }

        this._panDisabled = false;
        this._undoRedoKeyData = null;

        this.chart?.update(0);
    }

    /**
     * Updates the key (according to the given informations to retrieve it) with the given value.
     */
    private _updateKey(datasetIndex: number, index: number, value: IVector2Like): void {
        if (!this.state.selectedAnimation || !this._datasets) { return; }

        // Limit frames to 0
        if (value.x < 0) {
            value.x = 0;
        }

        const key = this.state.selectedAnimation.getKeys()[index];
        if (!key) { return; }

        key.frame = value.x;

        (this._datasets[datasetIndex].data![index] as IVector2Like).y = value.y;

        switch (this.state.selectedAnimation.dataType) {
            // Float
            case Animation.ANIMATIONTYPE_FLOAT:
                (this._datasets[0].data![index] as IVector2Like).x = value.x;

                key.value = value.y;
                break;

            // Vectors
            case Animation.ANIMATIONTYPE_VECTOR2:
            case Animation.ANIMATIONTYPE_VECTOR3:
                (this._datasets[0].data![index] as IVector2Like).x = value.x;
                (this._datasets[1].data![index] as IVector2Like).x = value.x;

                if (this.state.selectedAnimation.dataType === Animation.ANIMATIONTYPE_VECTOR3) {
                    (this._datasets[2].data![index] as IVector2Like).x = value.x;
                }

                const vectorProperty = ["x", "y", "z"][datasetIndex];
                if (vectorProperty) {
                    key.value[vectorProperty] = value.y;
                }
                break;

            // Colors
            case Animation.ANIMATIONTYPE_COLOR3:
            case Animation.ANIMATIONTYPE_COLOR4:
                (this._datasets[0].data![index] as IVector2Like).x = value.x;
                (this._datasets[1].data![index] as IVector2Like).x = value.x;
                (this._datasets[2].data![index] as IVector2Like).x = value.x;

                if (this.state.selectedAnimation.dataType === Animation.ANIMATIONTYPE_COLOR4) {
                    (this._datasets[3].data![index] as IVector2Like).x = value.x;
                }

                const colorProperty = ["r", "g", "b", "a"][datasetIndex];
                if (colorProperty) {
                    key.value[colorProperty] = value.y;
                }
                break;

            // Quaternion
            case Animation.ANIMATIONTYPE_QUATERNION:
                (this._datasets[0].data![index] as IVector2Like).x = value.x;
                (this._datasets[1].data![index] as IVector2Like).x = value.x;
                (this._datasets[2].data![index] as IVector2Like).x = value.x;
                (this._datasets[3].data![index] as IVector2Like).x = value.x;

                const quaternionProperty = ["x", "y", "z", "w"][datasetIndex];
                if (quaternionProperty) {
                    key.value[quaternionProperty] = value.y;
                }
                break;
        }

        this.updateObjectToCurrentFrame();
    }

    /**
     * Called on the user clicks on a point.
     */
    private _handleChartClick(_: Undefinable<MouseEvent>, elements: Undefinable<{}[]>): void {
        if (!this.chart || !this.state.selectedAnimation) { return; }

        if (!elements?.length) {
            return this._selection?.chartClick();
        }

        const element = elements[0]!;
        const key = this.state.selectedAnimation.getKeys()[element["_index"]];

        if (key) {
            this._editor.inspector.setSelectedObject(new AnimationKeyObject(this.state.selectedAnimation, key, element["_index"], () => {
                if (this.state.selectedAnimation) {
                    this.setAnimation(this.state.selectedAnimation);
                    this.updateObjectToCurrentFrame();
                }
            }));
        }
    }

    /**
     * Called on the user right-clicks on the canvas.
     */
    private _handleContextMenu(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        if (!this.chart || !this.timeTracker || !this.state.selectedAnimation) { return; }

        const chartPosition = this.timeTracker.getPositionOnChart(ev.nativeEvent);

        const elements = this.chart.getElementsAtEvent(ev);
        let removeElement: React.ReactNode;
        if (elements.length && this.state.selectedAnimation.getKeys().length > 2) {
            removeElement = (
                <>
                    <MenuDivider />
                    <MenuItem text={this._selectedFrames.length ? "Remove Selected Keys" : "Remove Key"} icon={<Icon src="times.svg" />} onClick={() => this._removeKeys(elements)} />
                </>
            );
        }

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <Pre>
                    Coordinates: <br />
                    x: <Tag intent={Intent.PRIMARY}>{chartPosition.x}</Tag><br />
                    y: <Tag intent={Intent.PRIMARY}>{chartPosition.y}</Tag>
                </Pre>
                <MenuDivider />
                <MenuItem text="Reset Zoom" onClick={() => this._resetZoom()} />
                {removeElement}
            </Menu>,
            { left: ev.nativeEvent.clientX, top: ev.nativeEvent.clientY },
        );
    }

    /**
     * Called on the user wants to remove keys.
     */
    private _removeKeys(elements: any[]): void {
        const animation = this.state.selectedAnimation!;
        const keys = animation.getKeys();

        if (this._selectedFrames.length) {
            const selectedFrames = this._selectedFrames.slice();
            const removedKeys: IAnimationKey[] = [];

            selectedFrames.forEach((f) => {
                keys.forEach((k) => {
                    if (k.frame === f) { removedKeys.push(k); }
                });
            });

            undoRedo.push({
                common: () => this.setAnimation(this.state.selectedAnimation),
                undo: () => {
                    removedKeys.forEach((k) => keys.push(k));
                    keys.sort((a, b) => a.frame - b.frame);
                    this._selectedFrames = selectedFrames.slice();
                },
                redo: () => {
                    removedKeys.forEach((k) => {
                        const index = keys.indexOf(k);
                        if (index !== -1) { keys.splice(index, 1); }
                    });
                },
            });

            this._selectedFrames = [];
        } else {
            const element = elements[0];
            const key = keys[element["_index"]];

            undoRedo.push({
                common: () => this.setAnimation(this.state.selectedAnimation),
                undo: () => {
                    keys.push(key);
                    keys.sort((a, b) => a.frame - b.frame);
                },
                redo: () => {
                    keys.splice(keys.indexOf(key), 1);
                },
            });
        }

        this.setAnimation(this.state.selectedAnimation);
    }

    /**
     * Resets the zoom to default.
     */
    private _resetZoom(): void {
        if (!this.state.selectedAnimation || !this.chart) { return; }

        const xAxis = this.chart?.config?.options?.scales?.xAxes![0]?.ticks;
        if (!xAxis) { return; }

        const yAxis = this.chart?.config?.options?.scales?.yAxes![0]?.ticks;
        if (!yAxis) { return; }

        const framesRange = AnimationTools.GetFramesRange(this.state.selectedAnimation);
        xAxis.min = 0;
        xAxis.max = framesRange.max * 2;

        const valuesRange = AnimationTools.GetValuesRange(this.state.selectedAnimation);
        yAxis.min = valuesRange.min * 2;
        yAxis.max = valuesRange.max * 2;

        this.chart.update(0);
    }
}
