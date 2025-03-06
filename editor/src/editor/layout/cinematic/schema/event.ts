import { ReactNode } from "react";

export interface ICinematicKeyEventData {
    type: string;
    serialize(): any;
    getInspector(): ReactNode;

    [index: string]: any;
}
