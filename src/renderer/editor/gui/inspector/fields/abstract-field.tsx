import * as React from "react";

/**
 * Props shared by all input Fields
 */
export interface IAbstractFieldProps {
    /**
     * Defines the label of the field.
     */
    label: string;
    /**
     * Defines ToolTip given for the field
     */
    toolTip?: string;
}
export class AbstractFieldComponent<P, S = { }> extends React.Component<P & IAbstractFieldProps, S> {
    private _isMounted: boolean;

    /**
     * Gets wether or not the inspector component is mounted.
     */
    protected get isMounted(): boolean {
        return this._isMounted;
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        this._isMounted = true;
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        this._isMounted = false;
    }
}
