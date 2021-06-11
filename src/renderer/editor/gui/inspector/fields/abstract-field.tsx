import * as React from "react";

export class AbstractFieldComponent<P = { }, S = { }> extends React.Component<P, S> {
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
