import { Nullable } from "../../../shared/types";

import * as React from "react";
import * as globalMonaco from "monaco-editor";

declare global {
    /**
     * Declare the "monaco" property on global.
     */
    var monaco: typeof globalMonaco;
}

export interface ICodeProps {
    /**
     * Defines the code to show in the code editor.
     */
    code: string;
    /**
     * Defines the language of the code.
     */
    language: "typescript" | string;
    /**
     * Defines wether or not the code is readonly mode.
     */
    readonly?: boolean;
    /**
     * Defines the optional style of the code editor.
     */
    style?: React.CSSProperties;
}

export class Code extends React.Component<ICodeProps> {
    /**
     * Defines the reference to the code editor.
     */
    public editor: Nullable<globalMonaco.editor.ICodeEditor> = null;

    private _div: Nullable<HTMLDivElement> = null;

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div ref={(ref) => this._div = ref} style={this.props.style ?? {}}>

            </div>
        );
    }

    /**
     * Called on the component did mount.
     */
    public componentDidMount(): void {
        if (!this._div) { return; }

        this.editor = monaco.editor.create(this._div, {
            theme: "vs-dark",
            automaticLayout: true,
            value: this.props.code,
            selectionHighlight: true,
            language: this.props.language,
            readOnly: this.props.readonly,
        });
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        this.editor?.dispose();
    }
}
