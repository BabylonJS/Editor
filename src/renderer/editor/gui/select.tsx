import * as React from "react";
import { Button, MenuItem } from "@blueprintjs/core";
import { Select as BPSelect } from "@blueprintjs/select";

const StringSelect = BPSelect.ofType<string>();

export interface ISelectProps {
    /**
     * Defines the list of items to be drawn in select.
     */
    items: string[];
    /**
     * Defines the current text being selected.
     */
    text: string;
    /**
     * Defines the callback called on the select dhanged.
     */
    onChange: (value: string) => void;
}

export class Select extends React.Component<ISelectProps> {
    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <StringSelect
                items={this.props.items}
                itemRenderer={(i, props) => {
                    if (!props.modifiers.matchesPredicate) { return null; }
                    return (
                        <MenuItem
                            text={i}
                            key={`${i}_${props.index}`}
                            onClick={props.handleClick}
                            active={props.modifiers.active}
                            disabled={props.modifiers.disabled}
                        />
                    );
                }}
                onItemSelect={(i) => {
                    this.props.onChange(i);
                }}
            >
                <Button text={this.props.text} small={true} rightIcon="double-caret-vertical" />
            </StringSelect>
        );
    }
}
