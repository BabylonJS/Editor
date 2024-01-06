import { Component, ReactNode } from "react";

import { MenuItem } from "@blueprintjs/core";
import { Omnibar } from "@blueprintjs/select";

import { Editor } from "../../editor/main";

import { getLightCommands } from "./light";
import { getProjectCommands } from "./project";

export interface ICommandPaletteProps {
    editor: Editor;
}

export interface ICommandPaletteState {
    open: boolean;
    query: string;
}

export interface ICommandPaletteType {
    text: string;
    label: string;
    action: () => unknown;
}

export class CommandPalette extends Component<ICommandPaletteProps, ICommandPaletteState> {
    public constructor(props: ICommandPaletteProps) {
        super(props);

        this.state = {
            query: "",
            open: false,
        };
    }

    public render(): ReactNode {
        return (
            <Omnibar
                resetOnSelect
                resetOnQuery
                isOpen={this.state.open}
                onClose={() => this.setOpen(false)}
                overlayProps={{
                    autoFocus: true,
                    hasBackdrop: true,
                }}
                items={[
                    ...getProjectCommands(this.props.editor),
                    ...getLightCommands(this.props.editor),
                ]}
                itemRenderer={(item, props) => {
                    if (!props.modifiers.matchesPredicate) {
                        return null;
                    }

                    return <MenuItem
                        ref={props.ref}
                        key={props.index}
                        text={item.text}
                        label={item.label}
                        roleStructure="listoption"
                        active={props.modifiers.active}
                        disabled={props.modifiers.disabled}
                        className="transition-all duration-300"
                        onClick={(ev) => props.handleClick?.(ev)}
                    />;
                }}
                onItemSelect={(item) => {
                    item.action();
                    this.setOpen(false);
                }}
                noResults={<MenuItem disabled={true} text="No results." />}
                className="top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-96"
                itemsEqual={(a, b) => a.text.toLowerCase() === b.text.toLowerCase()}
                itemPredicate={(query, item) => {
                    const normalizedTitle = item.text.toLowerCase();
                    const normalizedQuery = query.toLowerCase();

                    return normalizedTitle.indexOf(normalizedQuery) >= 0;
                }}
                query={this.state.query}
                onQueryChange={(query) => this.setState({ query })}
                inputProps={{
                    placeholder: "Search for a command...",
                    style: {
                        outlineOffset: "2px",
                        outline: "2px solid transparent",

                        borderTopLeftRadius: this.state.query ? "0.5rem" : "0rem",
                        borderTopRightRadius: this.state.query ? "0.5rem" : "0rem",

                        color: "rgba(255, 255, 255, 0.75)",
                        backgroundColor: "rgba(0, 0, 0, 0.5)",

                        transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                    },
                }}
            />
        );
    }

    public setOpen(open: boolean): void {
        this.setState({ open });
    }
}
