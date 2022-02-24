import { Nullable } from "../../../shared/types";

import * as React from "react";

import { MenuItem, MenuDivider } from "@blueprintjs/core";
import { Omnibar as BPOmnibar } from "@blueprintjs/select";

export interface IOmnibarItem {
    /**
     * Defines the id of the item.
     */
    id: string;
    /**
     * Defines the name of the item.
     */
    name: string;
}

export interface IOmnibarProps {
    /**
     * Callback called on an item has been selected or the omni has been closed.
     */
    onChange: (v: Nullable<IOmnibarItem>) => void;
}

export interface IOmnibarState {
    /**
     * Defines wether or not the omnibar is opeend.
     */
    isOpen: boolean;
    /**
     * Defines the list of items.
     */
    items: IOmnibarItem[];
}

const EditorOmnibar = BPOmnibar.ofType<IOmnibarItem>();

export class Omnibar extends React.Component<IOmnibarProps, IOmnibarState> {
    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IOmnibarProps) {
        super(props);
        this.state = {
            isOpen: false,
            items: [],
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <EditorOmnibar
                resetOnQuery
                resetOnSelect
                className="searchBar"
                isOpen={this.state.isOpen}
                items={this.state.items}
                itemsEqual={(a, b) => a.name.toLowerCase() === b.name.toLowerCase()}
                noResults={<MenuItem disabled text="No results." />}
                itemPredicate={(query, i) => i.name.toLowerCase().indexOf(query.toLowerCase()) !== -1}
                itemRenderer={(i, p) => {
                    if (!p.modifiers.matchesPredicate) { return null; }

                    if (i.id === "__editor__separator__") {
                        return <MenuDivider title={i.name} />
                    }

                    return (
                        <MenuItem
                            key={i.id}
                            label={i.id}
                            text={i.name}
                            active={p.modifiers.active}
                            disabled={p.modifiers.disabled}
                            onClick={() => this._handleClose(i)}
                        />
                    );
                }}
                onClose={() => this._handleClose(null)}
                onItemSelect={(v) => this._handleClose(v)}
                inputProps={{
                    inputRef: (ref) => ref?.classList.add("whitePlaceHolder"),
                    style: {
                        color: "white",
                        backgroundColor: "#444444",
                    },
                }}
            />
        )
    }

    /**
     * Shows the omnibar.
     * @param items defines the new items of  of the omnibar.
     */
    public show(items: IOmnibarItem[]): void {
        this.setState({ isOpen: true, items });
    }

    /**
     * Called on the omnibar is 
     */
    private _handleClose(value: Nullable<IOmnibarItem>): void {
        this.setState({ isOpen: false });
        this.props.onChange(value);
    }
}
