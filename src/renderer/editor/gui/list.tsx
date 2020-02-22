import { Undefinable } from "../../../shared/types";

import * as React from "react";
import { Button, MenuItem, Position } from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";

export interface IListProps {
    /**
     * Defines the list of items to available in the list.
     */
    items: string[];
    /**
     * Defines the place holder to draw in case of no selected items.
     */
    placeHolder: string;
    /**
     * Defines the default selected element.
     */
    selected?: Undefinable<string>;
    /**
     * Called on the list selection changes.
     */
    onChange: (value: string) => void;
}

export interface IListState {
    /**
     * Defines the selected element in the list.
     */
    selected: string;
}

const ListSelect = Select.ofType<string>();

export class List extends React.Component<IListProps, IListState> {
    public constructor(props: IListProps) {
        super(props);
        this.state = {
            selected: props.selected ?? props.items[0],
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <ListSelect
                items={this.props.items}
                itemRenderer={(i, props) => {
                    if (!props.modifiers.matchesPredicate) { return null; }
                    return <MenuItem active={props.modifiers.active} disabled={props.modifiers.disabled} label={i} key={i} text={i} onClick={props.handleClick} />
                }}
                itemPredicate={(query, i) => i.toLowerCase().indexOf(query.toLowerCase()) !== -1}
                itemsEqual={(a, b) => a.toLowerCase() === b.toLowerCase()}
                noResults={<MenuItem disabled={true} text="No Result." />}
                resetOnClose={true}
                resetOnQuery={true}
                resetOnSelect={true}
                onItemSelect={(i) => {
                    this.setState({ selected: i });
                    this.props.onChange(i);
                }}
                popoverProps={{
                    fill: true,
                    enforceFocus: true,
                    autoFocus: true,
                    usePortal: true,
                    position: Position.BOTTOM,
                }}
            >
                <Button fill={true} rightIcon="caret-down" placeholder={this.props.placeHolder} text={this.state.selected} style={{ marginTop: "5px" }} />
            </ListSelect>
        );
    }
}
