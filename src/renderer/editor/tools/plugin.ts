import * as React from "react";

import { Editor } from "../editor";

export interface IEditorPluginProps {
    /**
     * Defines the reference of the editor be used in the plugin.
     */
    editor: Editor;
    /**
     * Defines the id of the plugin.
     */
    id: string;
}

export abstract class AbstractEditorPlugin<T> extends React.Component<IEditorPluginProps, T> {
    /**
     * The editor reference.
     */
    protected editor: Editor;

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IEditorPluginProps) {
        super(props);
        this.editor = props.editor;
        this.editor.plugins[props.id] = this;
    }

    /**
     * Renders the component.
     */
    public abstract render(): React.ReactNode;

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        setTimeout(() => this.onReady(), 0);
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        this.onClose();
    }

    /**
     * Called on the plugin is ready.
     */
    public abstract onReady(): void;
    /**
     * Called on the plugin is closed.
     */
    public abstract onClose(): void;
}
