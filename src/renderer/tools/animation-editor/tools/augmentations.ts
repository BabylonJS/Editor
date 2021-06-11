// @ts-ignore
import { Chart } from "chart.js";

export interface IVector2Like {
    /**
     * Defines the X value of the vector.
     */
    x: number;
    /**
     * Defines the Y value of the vector.
     */
    y: number;
}

declare module "chart.js" {
    export interface ChartOptions {
        /**
         * Defines that the chart is draggable.
         */
        dragData?: boolean;
        /**
         * Defines that the X axis is draggable.
         */
        dragX?: boolean;

        /**
         * Defines the callback called on an element of the chart is starting being dragged.
         */
        onDragStart?:(e: MouseEvent, element: any) => void;
        /**
         * Defines the callback called on an element of the chart is being dragged.
         */
        onDrag?:(e: MouseEvent, datasetIndex: number, index: number, value: IVector2Like) => void;
        /**
         * Defines the callback called on an element stops being dragged.
         */
        onDragEnd?: (e: MouseEvent, datasetIndex: number, index: number, value: IVector2Like) => void;

        /**
         * Defines the options of the annotation plugin.
         */
        annotation?: any;
    }

    export interface TickOptions {
        /**
         * Defines the step size for the axis.
         */
        stepSize?: number;
    }
}
