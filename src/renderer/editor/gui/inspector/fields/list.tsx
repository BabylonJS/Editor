import { Nullable } from "../../../../../shared/types";

import * as React from "react";

import { Suggest } from "@blueprintjs/select";
import { MaybeElement, MenuItem, Position, Tooltip } from "@blueprintjs/core";

import { InspectorUtils } from "../utils";
import { InspectorNotifier } from "../notifier";

import { AbstractFieldComponent } from "./abstract-field";

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
    label: string | JSX.Element;
    /**
     * Defines the list of items drawn in the suggest.
     */
    items: IInspectorListItem<T>[] | (() => IInspectorListItem<T>[] | Promise<IInspectorListItem<T>[]>);

    /**
     * Defines wether or not automatic undo/redo should be skipped.
     */
    noUndoRedo?: boolean;

    /**
     * Defines the optional list of all available drag'n'droppable types.
     */
    dndHandledTypes?: string[];

    /**
     * Defines the optional color to apply on the border left.
     */
    borderLeftColor?: string;

    /**
     * Defines the optional callback called on the value changes.
     * @param value defines the new value of the object's property.
     */
    onChange?: (value: T) => void;
    /**
     * Defines the optional callack called on the value finished changes.
     * @param value defines the new value of the object's property.
     * @param oldValue defines the old value of the property before it has been changed.
     */
    onFinishChange?: (value: T, oldValue: T) => void;
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

export class InspectorList<T> extends AbstractFieldComponent<IInspectorListProps<T>, IInspectorListState<T>> {
    /**
     * Defines the type of suggest used by the inspector list component.
     */
    public static readonly ListSuggest = Suggest.ofType<IInspectorListItem<any>>();

    private _initialValue: T;
    private _inspectorName: Nullable<string> = null;

    private _suggestDiv: Nullable<HTMLDivElement> = null;

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

        this._initialValue = this.props.object[this.props.property];
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const borderLeftColor = this.props.borderLeftColor ?? "#2FA1D6"
        return (
            <div style={{ width: "100%", height: "25px" }}>
                <div style={{ width: "30%", height: "25px", float: "left", borderLeft: `3px solid ${borderLeftColor}`, padding: "0 4px 0 5px", overflow: "hidden" }}>
                    <Tooltip content={this.props.label}>
                        <span style={{ lineHeight: "28px", textAlign: "center", whiteSpace: "nowrap" }}>{this.props.label}</span>
                    </Tooltip>
                </div>
                <div
                    ref={(r) => this._suggestDiv = r}
                    onDrop={(ev) => this._handleDrop(ev)}
                    onDragOver={(ev) => this._handleDragOver(ev)}
                    onDragLeave={(ev) => this._handleDragLeave(ev)}
                    style={{ width: "70%", height: "25px", float: "left", marginTop: "2px" }}
                >
                    <div style={{ zIndex: 1, position: "absolute", width: "30px", height: "25px", right: "5%" }}>
                        {this.state.selectedItem?.icon}
                    </div>
                    {this._getSuggestComponent()}
                </div>
            </div>
        );
    }

    /**
     * Returns the suggest component.
     */
    private _getSuggestComponent(): React.ReactNode {
        return (
            <InspectorList.ListSuggest
                fill={true}
                items={this.state.items}
                selectedItem={this.state.selectedItem ?? { label: "Undefined", data: undefined }}
                activeItem={this.state.selectedItem}
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
                    onOpening: () => this._refreshItems(),
                }}
            ></InspectorList.ListSuggest>
        );
    }

    /**
     * Called on the component did mount.
     */
    public async componentDidMount(): Promise<void> {
        super.componentDidMount?.();

        this.setState({
            items: await this._getItems(),
            selectedItem: await this._getCurrentItem(),
        });

        this._inspectorName = InspectorUtils.CurrentInspectorName;

        InspectorNotifier.Register(this, this.props.object, async () => {
            this.setState({ selectedItem: await this._getCurrentItem() });
        });
    }

    /**
     * Called on the component will unmount.
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount?.();

        InspectorNotifier.Unregister(this);
    }

    /**
     * Refreshes the list of available items.
     */
    private async _refreshItems(): Promise<void> {
        const items = await this._getItems();
        const selectedItem = await this._getCurrentItem();

        return new Promise<void>((resolve) => {
            this.setState({ items, selectedItem }, () => resolve());
        });
    }

    /**
     * Returns the current list of items.
     */
    private async _getItems(): Promise<IInspectorListItem<T>[]> {
        if (typeof (this.props.items) === "function") {
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
        this.props.onFinishChange?.(this.props.object[this.props.property], this._initialValue);

        // Undo/redo
        InspectorNotifier.NotifyChange(this.props.object, {
            caller: this,
        });

        InspectorUtils.NotifyInspectorChanged(this._inspectorName!, {
            newValue: item.data,
            object: this.props.object,
            oldValue: this._initialValue,
            property: this.props.property,
            noUndoRedo: this.props.noUndoRedo ?? false,
        });

        this._initialValue = item.data;
    }

    /**
     * Returns the item currently set on the object.
     */
    private async _getCurrentItem(items?: IInspectorListItem<T>[]): Promise<Nullable<IInspectorListItem<T>>> {
        const value = this.props.object[this.props.property];

        if (!items) {
            items = await this._getItems();
        }

        return items.find((i) => i.data === value) ?? null;
    }

    /**
     * Called on the user drops an object in the list.
     */
    private async _handleDrop(ev: React.DragEvent<HTMLDivElement>): Promise<void> {
        if (!this.props.dndHandledTypes) {
            return;
        }

        for (const dndType of this.props.dndHandledTypes) {
            try {
                const dataContent = ev.dataTransfer.getData(dndType);
                const data = JSON.parse(dataContent);

                if (data) {
                    const handled = await InspectorNotifier.NotifyOnDrop(ev, this.props.object, this.props.property);
                    if (handled) {
                        await this._refreshItems();

                        if (this.state.selectedItem) {
                            this._handleValueChange(this.state.selectedItem);
                        }
                    }
                    break;
                }
            } catch (e) {
                // Catch silently.
            }
        }

        if (this._suggestDiv) {
            this._suggestDiv.style.backgroundColor = "";
        }
    }

    /**
     * Called on the user starts dragging an element on the list.
     */
    private _handleDragOver(_: React.DragEvent<HTMLDivElement>): void {
        if (this._suggestDiv) {
            this._suggestDiv.style.backgroundColor = "black";
        }
    }

    /**
     * Called on the user ends dragging an object on the list.
     */
    private _handleDragLeave(_: React.DragEvent<HTMLDivElement>): void {
        if (this._suggestDiv) {
            this._suggestDiv.style.backgroundColor = "";
        }
    }
}
