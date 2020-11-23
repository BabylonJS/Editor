import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { Chart, ChartPoint, ChartTooltipItem } from "chart.js";
import "chartjs-plugin-dragdata";
import "chartjs-plugin-zoom";
import "chartjs-plugin-annotation";
import "chartjs-plugin-dragzone";

import { Animation, IAnimatable } from "babylonjs";

import Editor from "../../../editor";

import { SyncType } from "../tools/types";
import { SyncTool } from "../tools/sync-tools";
import { TimeTracker } from "../tools/time-tracker";
import { IVector2Like } from "../tools/augmentations";
import { PointSelection } from "../tools/points-select";

export interface ITimelineEditorProps {
    /**
     * Defines the reference to the editor.
     */
    editor: Editor;
    /**
     * Defines the synchronization type for animation when playing/moving time tracker.
     */
    synchronizationType: SyncType;
    /**
     * Defines the reference to the selected animatable.
     */
    selectedAnimatable: Nullable<IAnimatable>;
    /**
     * Defines the callback called on a key has been udpated.
     */
    onUpdatedKey: () => void;
    /**
     * Defines the callback called on the current frame value changed.
     */
    onFrameChange: (value: number) => void;
}

export interface ITimelineEditorState {
    
}

export class TimelineEditor extends React.Component<ITimelineEditorProps, ITimelineEditorState> {
    /**
     * Defines the reference to the chart.
     */
    public chart: Nullable<Chart> = null;
    /**
     * Defines the reference to the time tracker.
     */
    public timeTracker: Nullable<TimeTracker> = null;
    /**
     * Defines the reference to the point selection.
     */
    public selection: Nullable<PointSelection> = null;

    private _canvas: Nullable<HTMLCanvasElement> = null;
    private _refHandler = {
        getCanvas: (ref: HTMLCanvasElement) => this._canvas = ref,
    };

    private _editor: Editor;

    private _panDisabled: boolean = false;
    private _yValue: number = 0;
    private _lastLine: number = -1;

    /**
     * Construcor.
     * @param props defines the compoenent's props.
     */
    public constructor(props: ITimelineEditorProps) {
        super(props);

        this._editor = props.editor;
        this.state = {
            selectedAnimatable: null,
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
                    onMouseDown={(ev) => this._handleMouseDown(ev)}
                    onMouseMove={(ev) => this._handleMouseMove(ev)}
                    onMouseUp={(ev) => this._handleMouseUp(ev)}
                    onDoubleClick={(ev) => this._handleDoubleClick(ev)}
                ></canvas>
            </div>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        if (!this._canvas) { return; }

        this.chart = new Chart(this._canvas.getContext("2d")!, {
            type: "line",
            data: {
                datasets: [],
            },
            options: {
                dragData: true,
                dragX: true,
                onDragStart: (_, e) => this._handleDragPointStart(e),
                onDrag: (e, di, i, v) => this._handleDragPoint(e, di, i, v),
                onDragEnd: (e, di, i, v) => this._handleDragPointEnd(e, di, i, v),
                showLines: false,
                responsive: true,
                legend: {
                    display: false,
                },
                maintainAspectRatio: false,
                animation: {
                    duration: 0,
                },
                tooltips: {
                    caretPadding: 15,
                    mode: "point",
                    intersect: true,
                    callbacks: {
                        label: (item) => this._handleTooltipLabel(item),
                    },
                },
                annotation: {
                    events: ["mouseenter", "mouseleave"],
                    annotations: [],
                },
                plugins: {
                    zoom: {
                        pan: {
                            enabled: true,
                            rangeMin: { x: -1, y: -1, },
                            mode: () => (this._panDisabled || this.timeTracker?.panDisabled) ? "" : "xy",
                        },
                        zoom: {
                            enabled: true,
                            rangeMin: { x: -1,  y: -1 },
                            mode: () => "x",
                        },
                    },
                },
                scales: {
                    xAxes: [{
                        type: "linear",
                        position: "top",
                        ticks: {
                            min: -1,
                            max: 60,
                            fontSize: 12,
                            fontStyle: "bold",
                            fontColor: "#222222",
                            stepSize: 1,
                        },
                    }],
                    yAxes: [{
                        type: "linear",
                        position: "left",
                        ticks: {
                            min: -1,
                            max: 20,
                            reverse: true,
                            stepSize: 1,
                            fontSize: 14,
                            fontStyle: "bold",
                            fontColor: "#222222",
                            beginAtZero: true,
                            showLabelBackdrop: true,
                            labelOffset: 15,
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
        this.selection = new PointSelection(this.chart, {
            onSelectedFrames: () => { },
        });
        this.selection.configure();
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
    }

    /**
     * Sets the new animatable to edit.
     * @param animatable defines the reference to the animatable.
     */
    public setAnimatable(animatable: IAnimatable): void {
        if (!this.chart) { return; }

        this.chart.data.datasets = [];
        this.chart.config.options!.annotation.annotations = [this.chart.config.options!.annotation.annotations[0]];
        this.chart.config.options!.scales!.yAxes![0].ticks!.callback = () => "";

        if (!animatable.animations) {
            this.chart.update(0);
            return;
        }

        animatable.animations.forEach((a, index) => {
            const data: ChartPoint[] = [];
            const keys = a.getKeys();

            keys.forEach((k) => {
                data.push({ x: k.frame, y: 0.5 + index, r: 10 } as ChartPoint);
            });

            this.chart!.data.datasets!.push({
                data,
                label: a.name,
                borderWidth: 1,
                backgroundColor: "rgb(189, 80, 105, 1)",
                xAxisID: "x-axis-0",
                pointRadius: 10,
                pointHitRadius: 15,
            });
        });

        this.chart.config.options!.scales!.yAxes![0].ticks!.callback = (index) => {
            return animatable.animations![Math.floor(index)]?.name ?? " ";
        };

        this.chart.update();
    }

    /**
     * Sets the new frame value for the time tracker.
     * @param value defines the new value of time (frame).
     */
    public setCurrentFrameValue(value: number): void {
        this.timeTracker?.setValue(value);
    }

    /**
     * Updates the current object to the current frame on animation.
     */
    public updateObjectToCurrentFrame(): void {
        if (!this.props.selectedAnimatable?.animations?.length || !this.timeTracker) { return; }

        SyncTool.UpdateObjectToFrame(
            this.timeTracker.getValue(),
            SyncType.Scene,
            this.props.selectedAnimatable,
            this.props.selectedAnimatable.animations[0],
            this._editor.scene!,
        );
    }

    /**
     * Called on the panel has been resized.
     * @param height the new height of the plugin's panel.
     */
    public resize(height: number): void {
        if (!this.chart || height <= 0) { return; }

        const lineHeight = 40;
        const lineCount = (height / lineHeight) >> 0;

        this.chart.config.options!.scales!.yAxes![0].ticks!.max = lineCount;
        this.chart.update(0);
    }

    /**
     * Called on the user moves the time tracker.
     */
    private _handleTimeTrackerChanged(): void {
        if (!this.timeTracker) { return; }

        this.updateObjectToCurrentFrame();
        this.props.onFrameChange(this.timeTracker.getValue());
    }

    /**
     * Called on an element of the chart is starting being dragged.
     */
    private _handleDragPointStart(element: any): void {
        if (!this.chart?.data?.datasets) { return; }

        this._panDisabled = true;
        this._yValue = this.chart.data.datasets[element["_datasetIndex"]]!.data![element["_index"]]["y"];
    }

    /**
     * Called on an element of the chart is being dragged.
     */
    private _handleDragPoint(_: MouseEvent, datasetIndex: number, index: number, value: IVector2Like): void {
        if (!this.chart?.data?.datasets) { return; }

        this.chart.data.datasets[datasetIndex]!.data![index]["y"] = this._yValue;

        if (index === 0) {
            this.chart.data.datasets[datasetIndex]!.data![index]["x"] = 0;
            return;
        }

        if (this.props.selectedAnimatable?.animations) {
            const animation = this.props.selectedAnimatable.animations[datasetIndex];
            if (animation) {
                this._updateKey(animation, index, value.x);
            }
        }

        this.updateObjectToCurrentFrame()
        this.props.onUpdatedKey();
    }

    /**
     * Callback called on an element stops being dragged.
     */
    private _handleDragPointEnd(_: MouseEvent, datasetIndex: number, index: number, value: IVector2Like): void {
        this._panDisabled = false;

        if (index === 0) { return; }

        // Sort animation
        if (this.props.selectedAnimatable?.animations) {
            const animation = this.props.selectedAnimatable.animations[datasetIndex];
            if (animation) {
                this._updateKey(animation, index, value.x);

                const keys = animation.getKeys();
                keys.sort((a, b) => a.frame - b.frame);
            }
        }

        this.props.onUpdatedKey();
    }

    /**
     * Updates the currently drgged key.
     */
    private _updateKey(animation: Animation, keyIndex: number, value: number): void {
        const keys = animation.getKeys();
        const key = keys[keyIndex];

        if (key) {
            key.frame = value;
        }
    }

    /**
     * Called on the mouse is down on the canvas.
     */
    private _handleMouseDown(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        this.timeTracker?.mouseDown(ev);
    }

    /**
     * Called on the mouse moves on the canvas.
     */
    private _handleMouseMove(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        if (!this.chart || !this.timeTracker || !this.props.selectedAnimatable?.animations?.length) { return; }

        this.timeTracker.mouseMove(ev);

        const y = Math.floor(this.chart["scales"]["y-axis-0"].getValueForPixel(ev.nativeEvent.offsetY));
        if (y === this._lastLine || y < 0 || y >= this.props.selectedAnimatable.animations.length) { return; }

        this._lastLine = y;

        this.chart.config.options!.annotation.annotations = [
            this.chart.config.options!.annotation.annotations[0],
            {
                drawTime: "beforeDatasetsDraw",
                id: "highlight" + y,
                type: "box",
                xScaleID: "x-axis-0",
                yScaleID: "y-axis-0",
                yMin: y,
                yMax: y + 1,
                backgroundColor: "#666666",
                borderColor: "grey",
                borderWidth: 1,
            },
        ];

        this.chart.update(0);
    }

    /**
     * Called on the mouse is up on the canvas.
     */
    private _handleMouseUp(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        this.timeTracker?.mouseUp(ev);
    }

    /**
     * Called on the user double clicks on the chart.
     */
    private _handleDoubleClick(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        if (!this.chart || !this.timeTracker || !this.props.selectedAnimatable?.animations?.length) { return; }

        const elements = this.chart.getElementsAtEvent(ev);
        if (elements && elements.length > 0) {
            const element = elements[this._yValue >> 0];
            if (!element) { return; }

            const animation = this.props.selectedAnimatable.animations[element["_datasetIndex"]];
            if (!animation) { return; }

            const key = animation.getKeys()[element["_index"]];
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
     * Called on the label is being drawn in the chart.
     */
    private _handleTooltipLabel(item: ChartTooltipItem): string {
        if (!this.props.selectedAnimatable?.animations?.length) { return ""; }

        const animation = this.props.selectedAnimatable.animations[item.datasetIndex!];
        if (!animation) { return ""; }

        const key = animation.getKeys()[item.index!];
        if (!key) { return ""; }
        
        return `Value: ${key.value}`;
    }
}
