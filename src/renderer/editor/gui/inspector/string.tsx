import * as React from "react";
import { InputGroup } from "@blueprintjs/core";
import { Nullable } from "../../../../shared/types";

export interface IInspectorStringProps {
    /**
     * Defines the reference to the object to modify.
     */
    object: any;
    /**
     * Defines the property to edit in the object.
     */
    property: string;
    /**
     * Defines the label of the field.
     */
    label: string;

    /**
     * Defines the optional callback called on the value changes.
     * @param value defines the new value of the object's property.
     */
    onChange?: (value: string) => void;
    /**
     * Defines the optional callack called on the value finished changes.
     * @param value defines the new value of the object's property.
     */
    onFinishChange?: (value: string) => void;
}

export interface IInspectorStringState {
    /**
     * Defines the current value of the input.
     */
    value: string;
}

export class InspectorString extends React.Component<IInspectorStringProps, IInspectorStringState> {
    private _input: Nullable<HTMLInputElement> = null;

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorStringProps) {
        super(props);

        const value = props.object[props.property];
        if (typeof (value) !== "string") {
            throw new Error("Only strings are supported for InspectorString components.");
        }

        this.state = { value };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div style={{ width: "100%", height: "25px" }}>
                <div style={{ width: "30%", float: "left", borderLeft: "3px solid #1ed36f", padding: "0 4px 0 5px" }}>
                    <span style={{ lineHeight: "30px", textAlign: "center" }}>{this.props.label}</span>
                </div>
                <div style={{ width: "70%", float: "left", marginTop: "3px" }}>
                    <InputGroup
                        small={true}
                        fill={true}
                        value={this.state.value}
                        onChange={(e) => this._handleValueChanged(e.target.value)}
                        onBlur={() => this._handleValueFinishChanged()}
                        onKeyDown={(e) => e.key === "Enter" && this._handleValueFinishChanged()}
                        inputRef={(ref) => this._input = ref}
                    />
                </div>
            </div>
        );
    }

    /**
     * Called on the value changed in the input.
     */
    private _handleValueChanged(value: string): void {
        this.setState({ value });

        this.props.onChange?.(value);
    }

    /**
     * Called on the value did finish change.
     */
    private _handleValueFinishChanged(): void {
        this._input?.blur();
        this.props.onFinishChange?.(this.state.value);
    }
}
