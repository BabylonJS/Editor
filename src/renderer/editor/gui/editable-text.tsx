import * as React from "react";
import { EditableText as BPEditableText, IEditableTextProps } from "@blueprintjs/core";

export class IEditableTextState {
    value: string;
}

export class EditableText extends React.Component<IEditableTextProps, IEditableTextState> {
    private _editableTextRef: BPEditableText;
    private _refHandler = {
        getEditableText: (ref: BPEditableText) => this._editableTextRef = ref,
    };

    /**
     * Constructor.
     * @param props the component's props.
     */
    public constructor(props: IEditableTextProps) {
        super(props);
        this.state = { value: props.value ?? "" };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <BPEditableText
                {...this.props}
                ref={this._refHandler.getEditableText}
                value={this.state.value}
                onChange={(value) => this.setState({ value })}
            ></BPEditableText>
        )
    }

    /**
     * Focuses the editable text element.
     */
    public focus(): void {
        this._editableTextRef?.setState({ isEditing: true });
    }
}
