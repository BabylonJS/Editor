import { Animatable, Animation, Scene } from "babylonjs";
import { Nullable } from "../../../../shared/types";

import { AnimationTools } from "./animation-to-dataset";

import { IVector2Like } from "./augmentations";

export class TimeTracker {
    /**
     * Defines the reference to the chart.
     */
    public readonly chart: Chart;
    /**
     * Defines the callback called on the time tracker is moved.
     */
    public readonly onMoved: (value: number) => void;

    private _panDisabled: boolean = false;
    private _isOverTimeTracker: boolean = false;
    private _draggingTimeTracker: boolean = false;

    private _playAnimatable: Nullable<Animatable> = null;
    private _playAnimationInverval: Nullable<NodeJS.Timeout> = null;

    /**
     * Constructor.
     * @param chart defines the reference to the chart.
     * @param callbacks defines the available callbacks listened.
     */
    public constructor(chart: Chart, callbacks: {
        onMoved: (value: number) => void;
    }) {
        this.chart = chart;
        this.onMoved = callbacks.onMoved;
    }

    /**
     * Gets wether or not pan should be disabled in the chart.
     */
    public get panDisabled(): boolean {
        return this._panDisabled;
    }

    /**
     * Gets wether or not the time tracker is being dragged.
     */
    public get draggingTimeTracker(): boolean {
        return this._draggingTimeTracker;
    }

    /**
     * Returns the configuration of the time annotation.
     */
    public getAnnotationConfiguration(): any {
        return ({
            drawTime: "afterDatasetsDraw",
            id: "time-tracker",
            type: "line",
            mode: "vertical",
            scaleID: "x-axis-0",
            value: 0,
            borderColor: "#111111",
            boderWidth: 5,
            label: {
                enabled: true,
                content: "Time",
                position: "top",
                backgroundColor: "#333333"
            },
            onMouseenter: () => {
                this._isOverTimeTracker = true;
                this._panDisabled = true;

                this.getTimeTrackerRef().borderColor = "#000000";
                this.getTimeTrackerRef().label.backgroundColor = "#000000";
                this.chart!.update();
            },
            onMouseleave: () => {
                this._isOverTimeTracker = false;
                this._panDisabled = false;

                this.getTimeTrackerRef().borderColor = "#111111";
                this.getTimeTrackerRef().label.backgroundColor = "#333333";
                this.chart!.update();
            },
        });
    }

    /**
     * Sets the new value of the time.
     * @param value defines the new value of the time.
     */
    public setValue(value: number): void {
        this.stopAnimation();
        this.getTimeTrackerRef().value = value;
    }

    /**
     * Returns the current time value of the tracker.
     */
    public getValue(): number {
        return this.getTimeTrackerRef().value;
    }

    /**
     * Returns the time tracker.
     */
    public getTimeTrackerRef(): any {
        return this.chart["annotation"].elements["time-tracker"].options;
    }

    /**
     * Plays the animation (moves the time tracker value).
     */
    public playAnimation(baseAnimation: Animation, scene: Scene, from: number, to?: number): void {
        const annotation = this.getTimeTrackerRef();

        const range = AnimationTools.GetFramesRange(baseAnimation);
        const existingKeys = baseAnimation.getKeys();

        const animation = new Animation(
            "TimeTrackerAnimation",
            "value",
            baseAnimation.framePerSecond,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
            baseAnimation.enableBlending,
        );
        animation.blendingSpeed = baseAnimation.blendingSpeed;
        animation.setKeys(existingKeys.map((k) => ({
            frame: k.frame,
            value: k.frame,
        })));

        this._playAnimationInverval = setInterval(() => {
            this.chart?.update(0);
        }, 16);

        this._playAnimatable = scene.beginDirectAnimation(annotation, [animation], from, to ?? range.max, false, 1.0, () => {
            this._playAnimatable = null;
            this.stopAnimation();
        });
    }

    /**
     * Stops the animation (moves the time tracker value).
     */
    public stopAnimation(): void {
        if (this._playAnimationInverval !== null) {
            clearInterval(this._playAnimationInverval);
        }

        if (this._playAnimatable) {
            this._playAnimatable.stop();
        }

        this._playAnimationInverval = null;
        this._playAnimatable = null;
    }

    /**
     * Called on the mouse is down on the canvas.
     * @param ev defines the reference to the mouse event.
     */
    public mouseDown(_: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        this._draggingTimeTracker = this._isOverTimeTracker;

        if (this._draggingTimeTracker) {
            this._panDisabled = true;
        }
    }

    /**
     * Notifies that the mouse moves on the canvas.
     * @param ev defines the reference to the mouse event.
     */
    public mouseMove(ev: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        if (this._draggingTimeTracker) {
            const positionOnChart = this.getPositionOnChart(ev.nativeEvent);
            const value = Math.max(0, positionOnChart.x);

            this.getTimeTrackerRef().value = value;
            this.chart.update(0);

            this.stopAnimation();

            this.onMoved(value);
        }
    }

    /**
     * Called on the mouse is up on the canvas.
     * @param ev defines the reference to the mouse event.
     */
    public mouseUp(_: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
        if (this._draggingTimeTracker) {
            this._draggingTimeTracker = false;
        }

        if (!this._isOverTimeTracker) {
            this._panDisabled = false;
        }
    }

    /**
     * Returns the position on the chart according to the given mouse event.
     */
    public getPositionOnChart(ev: MouseEvent): IVector2Like {
        const x = this.chart["scales"]["x-axis-0"].getValueForPixel(ev.offsetX);
        const y = this.chart["scales"]["y-axis-0"].getValueForPixel(ev.offsetY);

        return { x, y };
    }
}
