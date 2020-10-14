import { Nullable } from "../../../../shared/types";

import { Chart, ChartPoint } from "chart.js";
import { KeyboardInfo } from "babylonjs";

export class PointSelection {
    /**
     * Defines the reference to the chart.
     */
    public readonly chart: Chart;
    /**
     * Defines the callback called on the frames have been selected.
     */
    public readonly onSelectedFrames: (frames: number[]) => void;

    private _ctrlPushed: boolean = false;
    private _selectedFrames: number[] = [];

    private _selectionPlugin: Nullable<any> = null;

    /**
     * Constructor.
     * @param chart defines the reference to the chart.
     * @param callbacks defines the available callbacks listened.
     */
    public constructor(chart: Chart, callbacks: {
        onSelectedFrames: (frames: number[]) => void;
    }) {
        this.chart = chart;
        this.onSelectedFrames = callbacks.onSelectedFrames;
    }

    /**
     * Gets wether or not the Control key is pushed.
     */
    public get ctrlPushed(): boolean {
        return this._ctrlPushed;
    }

    /**
     * Resets the selection.
     */
    public reset(): void {
        this._selectedFrames = [];
        this.onSelectedFrames([]);
    }

    /**
     * Returns the configuration of the selection plugin.
     */
    public configure(): void {
        this.chart["$dragzone"]._options.direction = "horizontal";
        this.chart["$dragzone"]._options.color = "rgba(70, 146, 202, 0.0)";
        this.chart["$dragzone"]._options.onDragSelection = (datasets) => this._handleDragSelection(datasets);
    }

    /**
     * Called on the keyboard fires an event.
     * @param infos defines the informations of the keyboard event.
     */
    public keyboardEvent(infos: KeyboardInfo): void {
        this._ctrlPushed = infos.event.ctrlKey;
        this.chart["$dragzone"]._options.direction = this._ctrlPushed ? "all" : "";
    }

    /**
     * Called on the mouse is down on the canvas.
     * @param ev defines the reference to the mouse event.
     */
    public mouseDown(_: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        this.chart["$dragzone"]._options.color = this._ctrlPushed ? "rgba(70, 146, 202, 0.3)" : "rgba(70, 146, 202, 0.0)";
    }

    /**
     * Called on the mouse is up on the canvas.
     * @param ev defines the reference to the mouse event.
     */
    public mouseUp(_: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        setTimeout(() => {
            this.chart["$dragzone"]._options.direction = "";
            this.chart["$dragzone"]._options.color = "rgba(70, 146, 202, 0.0)";
        }, 0);
    }

    /**
     * Called on the chart has been clicked.
     */
    public chartClick(): void {
        if (this._selectedFrames.length) {
            this._selectedFrames = [];
            
            if (this._selectionPlugin) {
                Chart.pluginService.unregister(this._selectionPlugin);
                this._selectionPlugin = null;
            }

            this.chart.update(0);
        }
    }

    /**
     * Called on the user selected multiple points.
     */
    private _handleDragSelection(datasets: ChartPoint[][] = []): void {
        if (!this._ctrlPushed) { return; }

        // Get frames
        const frames: number[] = [];
        datasets.forEach((dataset) => {
            if (!dataset) {
                return;
            }

            dataset.forEach((point) => {
                if (frames.indexOf(point.x as number) !== -1) {
                    return;
                }

                frames.push(point.x as number);
            });
        });

        this._selectedFrames = frames.sort((a, b) => a - b);
        this.onSelectedFrames(this._selectedFrames.slice());

        // Register plugin
        if (this._selectionPlugin) {
            Chart.pluginService.unregister(this._selectionPlugin);
        }

        Chart.pluginService.register(this._selectionPlugin = {
            beforeDraw: (chart) => this._handleDrawSelectedPoints(chart),
        });

        this.chart.update(0);
        this.chart.render(0);
    }

    /**
     * Called on the graph is being drawn to render selected points.
     */
    private _handleDrawSelectedPoints(chart: Chart): void {
        chart.config.data?.datasets?.forEach((d) => {
            const meta = d["_meta"][1];
            if (!meta) { return; }

            meta.data.forEach((p) => {
                const model = p._model;
                if (!model) { return; }

                const point = d.data![p._index] as ChartPoint;
                if (this._selectedFrames.indexOf(point.x as number) === -1) {
                    model.borderWidth = 1;
                } else {
                    model.borderWidth = 2;
                    model.borderColor = "#ffff00";
                }
            });
        });
    }
}