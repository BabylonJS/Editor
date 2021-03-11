import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { Suggest } from "@blueprintjs/select";
import { MaybeElement, MenuItem, Position, Tooltip } from "@blueprintjs/core";

export interface IInspectorListItem<T> {
    /**
     * Defines the label of the item.
     */
    label: string;
    /**
     * Defines the data attached to the item.
     */
    data: T;

    /**
     * Defines the optional description of the item (drawn on the right).
     */
    description?: string;
    /**
     * Defines the optional icon.
     */
    icon?: MaybeElement;
}

export interface IInspectorListProps<T> {
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
     * Defines the list of items drawn in the suggest.
     */
    items: IInspectorListItem<T>[] | (() => IInspectorListItem<T>[] | Promise<IInspectorListItem<T>[]>);

    /**
     * Defines the optional 
     */
    dataPropertyPath?: string;

    /**
     * Defines the optional callback called on the value changes.
     * @param value defines the new value of the object's property.
     */
    onChange?: (value: T | string) => void;
    /**
     * Defines the optional callack called on the value finished changes.
     * @param value defines the new value of the object's property.
     */
    onFinishChange?: (value: T | string) => void;
}

export interface IInspectorListState<T> {
    /**
     * Defines the list of all items available in the popover.
     */
    items: IInspectorListItem<T>[];
    /**
     * Defines the reference to the selected item.
     */
    selectedItem: Nullable<IInspectorListItem<T>>;
}

export class InspectorList<T> extends React.Component<IInspectorListProps<T>, IInspectorListState<T>> {
    /**
     * Defines the type of suggest used by the inspector list component.
     */
    public static readonly ListSuggest = Suggest.ofType<IInspectorListItem<any>>();

    /**
     * Constructor.
     * @param props defines the component's props.
     */
    public constructor(props: IInspectorListProps<T>) {
        super(props);

        this.state = {
            items: [],
            selectedItem: null,
        };
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <div style={{ width: "100%", height: "25px" }}>
                <div style={{ width: "30%", height: "25px", float: "left", borderLeft: "3px solid #2FA1D6", padding: "0 4px 0 5px", overflow: "hidden" }}>
                    <Tooltip content={this.props.label}>
                        <span style={{ lineHeight: "30px", textAlign: "center", whiteSpace: "nowrap" }}>{this.props.label}</span>
                    </Tooltip>
                </div>
                <div style={{ width: "65%", height: "25px", float: "left", marginTop: "2px" }}>
                    <div style={{ position: "absolute", width: "30px", height: "25px", right: "calc(5% + 15px)" }}>
                        {this.state.selectedItem?.icon}
                    </div>
                    <InspectorList.ListSuggest
                        fill={true}
                        items={this.state.items}
                        selectedItem={this.state.selectedItem ?? { label: "Undefined", data: undefined }}
                        inputValueRenderer={(i) => i.label}
                        noResults={<MenuItem disabled={true} text="No results." />}
                        itemPredicate={(query, i) => i.label.toLowerCase().indexOf(query.toLowerCase()) !== -1}
                        itemsEqual={(a, b) => a.label.toLowerCase() === b.label.toLowerCase()}
                        onItemSelect={(i) => this._handleValueChange(i)}
                        inputProps={{
                            small: true,
                            large: false,
                        }}
                        itemRenderer={(i, props) => {
                            if (!props.modifiers.matchesPredicate) {
                                return null;
                            }

                            const key = `${i.label}_${props.index}`;

                            return (
                                <MenuItem
                                    key={key}
                                    icon={i.icon}
                                    text={<span style={{ lineHeight: "25px" }}>{i.label}</span>}
                                    labelElement={<span style={{ lineHeight: "25px" }}>{i.description}</span>}
                                    onClick={props.handleClick}
                                    active={props.modifiers.active}
                                    disabled={props.modifiers.disabled}
                                />
                            );
                        }}
                        popoverProps={{
                            position: Position.RIGHT,
                            onOpening: async () => this.setState({ items: await this._getItems() }),
                        }}
                    ></InspectorList.ListSuggest>
                </div>
            </div>
        );
    }

    /**
     * Called on the component did mount.
     */
    public async componentDidMount(): Promise<void> {
        this.setState({
            items: await this._getItems(),
            selectedItem: await this._getCurrentItem(),
        });
    }

    /**
     * Returns the current list of items.
     */
    private async _getItems(): Promise<IInspectorListItem<T>[]> {
        if (typeof(this.props.items) === "function") {
            return this.props.items();
        }

        return this.props.items;
    }

    /**
     * Called on the suggest value changed.
     */
    private _handleValueChange(item: IInspectorListItem<T>): void {
        this.setState({ selectedItem: item });

        this.props.object[this.props.property] = item.data;

        this.props.onChange?.(this.props.object[this.props.property]);
        this.props.onFinishChange?.(this.props.object[this.props.property]);
    }

    /**
     * Returns the item currently set on the object.
     */
    private async _getCurrentItem(): Promise<Nullable<IInspectorListItem<T>>> {
        const value = this.props.object[this.props.property];
        const items = await this._getItems();

        if (this.props.dataPropertyPath) {
            return items.find((i) => i.data[this.props.dataPropertyPath!] === value[this.props.dataPropertyPath!]) ?? null;
        }

        return items.find((i) => i.data === value) ?? null;
    }
}
